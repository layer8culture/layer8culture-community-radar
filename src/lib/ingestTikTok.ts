// TikTok ingestion via Playwright + headless Chromium.
//
// Why a real browser: TikTok's hashtag/user feeds are populated by XHRs
// (`api/challenge/item_list`, `api/post/item_list`, `api/recommend/item_list`)
// that are signed by browser-side JS (`X-Bogus`, `_signature`, `msToken`).
// Reverse-engineering that signing is a known cat-and-mouse maintenance
// burden, so instead we render the page in real Chromium and intercept the
// JSON response off the page object. The browser signs everything for us.
//
// This module is deliberately isolated and only imported dynamically by
// `runIngestion()` when a tiktok-platform hashtag is actually processed —
// keeps the ~300MB Playwright dep off the cold-start path of API routes
// that don't need it.

import type { Browser, BrowserContext, Page, Response } from "playwright-core";
import type { RawPost } from "./ingest";
import type { SocialLink } from "./types";
import { detectSocialLinksFromText } from "./socialLinks";

const DEFAULT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

interface TikTokItem {
  id: string;
  desc?: string;
  createTime?: number;
  author?: {
    uniqueId?: string;
    nickname?: string;
    signature?: string;
  };
  authorStats?: {
    followerCount?: number;
  };
  stats?: {
    diggCount?: number;
    commentCount?: number;
    shareCount?: number;
    playCount?: number;
  };
}

interface TikTokItemListResponse {
  itemList?: TikTokItem[];
  items?: TikTokItem[];
}

// Singleton browser, reused across hashtag fetches within one runIngestion()
// call. `closeTikTokBrowser()` tears it down at the end.
let cachedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (cachedBrowser) return cachedBrowser;
  // Lazy require so even importing this module doesn't load Playwright until
  // we actually need to scrape.
  const { chromium } = await import("playwright-core");
  const proxyUrl = process.env.TIKTOK_PROXY_URL?.trim();
  cachedBrowser = await chromium.launch({
    headless: true,
    proxy: proxyUrl ? { server: proxyUrl } : undefined,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });
  return cachedBrowser;
}

export async function closeTikTokBrowser(): Promise<void> {
  if (!cachedBrowser) return;
  try {
    await cachedBrowser.close();
  } catch {
    // ignore — best-effort teardown
  } finally {
    cachedBrowser = null;
  }
}

function buildTargetUrl(query: string): { url: string; kind: "user" | "tag" } {
  const trimmed = query.trim().replace(/^#/, "");
  if (trimmed.startsWith("@")) {
    const user = trimmed.slice(1).replace(/[^a-zA-Z0-9._]/g, "");
    return { url: `https://www.tiktok.com/@${user}`, kind: "user" };
  }
  const tag = trimmed.replace(/[^a-zA-Z0-9_]/g, "");
  return { url: `https://www.tiktok.com/tag/${tag}`, kind: "tag" };
}

function isItemListUrl(url: string): boolean {
  // Covers /api/challenge/item_list (hashtag), /api/post/item_list (user),
  // /api/recommend/item_list (homepage fallback). All return the same shape.
  return /\/api\/(challenge|post|recommend)\/item_list/.test(url);
}

async function detectChallenge(page: Page): Promise<boolean> {
  // TikTok serves an interactive verify page when it suspects a bot. The
  // exact DOM varies; we check a handful of stable selectors.
  return await page.evaluate(() => {
    const sels = [
      "#captcha_container",
      "#captcha-verify-container",
      "[data-e2e='verify-bar']",
      ".captcha_verify_container",
    ];
    return sels.some((s) => document.querySelector(s) !== null);
  });
}

function itemToRawPost(item: TikTokItem): RawPost | null {
  if (!item || !item.id || !item.author?.uniqueId) return null;
  const createTimeMs = (item.createTime ?? 0) * 1000;
  if (!createTimeMs) return null;
  const handle = item.author.uniqueId;
  const likes = item.stats?.diggCount ?? 0;
  const comments = item.stats?.commentCount ?? 0;
  const shares = item.stats?.shareCount ?? 0;
  // Match the weighting other fetchers use: comments and shares signal
  // higher intent than passive likes.
  const engagementCount = likes + comments * 5 + shares * 3;
  const ageHours = Math.max(1, (Date.now() - createTimeMs) / 36e5);

  const profileLink: SocialLink = {
    platform: "tiktok",
    url: `https://www.tiktok.com/@${handle}`,
  };
  const bioLinks = detectSocialLinksFromText(item.author.signature ?? "");
  const seen = new Set<string>();
  const creatorLinks = [profileLink, ...bioLinks].filter((l) => {
    const k = `${l.platform}|${l.url}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    externalId: item.id,
    content: item.desc?.trim() || `@${handle} video`,
    creatorHandle: handle,
    platform: "tiktok",
    url: `https://www.tiktok.com/@${handle}/video/${item.id}`,
    createdAt: new Date(createTimeMs).toISOString(),
    engagementCount,
    ageHours,
    creatorFollowers: item.authorStats?.followerCount,
    creatorLinks,
  };
}

export async function fetchTikTok(query: string, max?: number): Promise<RawPost[]> {
  const maxPosts =
    max ??
    (Number(process.env.TIKTOK_SCRAPER_MAX_POSTS) || 15);
  const timeoutMs = Number(process.env.TIKTOK_SCRAPER_TIMEOUT_MS) || 30000;
  const ua = process.env.TIKTOK_SCRAPER_USER_AGENT?.trim() || DEFAULT_UA;

  const { url } = buildTargetUrl(query);

  const browser = await getBrowser();
  const context: BrowserContext = await browser.newContext({
    userAgent: ua,
    viewport: { width: 1366, height: 900 },
    locale: "en-US",
    timezoneId: "America/Los_Angeles",
  });
  const page = await context.newPage();

  const collected: TikTokItem[] = [];
  let firstPayloadAt: number | null = null;
  // Diagnostic counters, surfaced in the thrown error when collection is empty
  // so operators can tell geofence/challenge from breakage/timeout without
  // having to attach a debugger.
  const xhrSeen: { url: string; status: number; bodyLen: number }[] = [];
  const itemListUrls: string[] = [];

  const onResponse = async (res: Response) => {
    const u = res.url();
    if (/\/api\//.test(u)) {
      xhrSeen.push({ url: u, status: res.status(), bodyLen: 0 });
    }
    try {
      if (!isItemListUrl(u)) return;
      itemListUrls.push(`${res.status()} ${u.split("?")[0]}`);
      const body = await res.text();
      if (xhrSeen.length > 0) xhrSeen[xhrSeen.length - 1].bodyLen = body.length;
      if (!body) return;
      let data: TikTokItemListResponse;
      try {
        data = JSON.parse(body) as TikTokItemListResponse;
      } catch {
        return;
      }
      const items = data.itemList ?? data.items ?? [];
      if (items.length === 0) return;
      collected.push(...items);
      firstPayloadAt ??= Date.now();
    } catch {
      // ignore — bad payload, move on
    }
  };
  page.on("response", onResponse);

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    if (await detectChallenge(page)) {
      throw new Error("tiktok challenge served — try again or rotate IP");
    }

    // Nudge lazy-loaded item_list XHRs: scroll a couple of viewport heights
    // after initial paint so TikTok's feed fetches more items.
    await page.waitForTimeout(1500);
    for (let i = 0; i < 3 && collected.length < maxPosts; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(1200);
    }

    // Final wait window: bail early once we have items and the network has
    // been quiet for 2s; otherwise wait up to the full timeout.
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && collected.length < maxPosts) {
      await page.waitForTimeout(500);
      if (
        firstPayloadAt !== null &&
        Date.now() - firstPayloadAt > 2000 &&
        collected.length > 0
      ) {
        break;
      }
    }

    if (collected.length === 0) {
      // Surface enough state to distinguish geofence (no item_list XHRs at all,
      // or HTTP 403/451) from breakage (XHRs arrived but parsed empty) from
      // page-load failure (no /api/* XHRs at all).
      const finalUrl = page.url();
      const title = await page.title().catch(() => "?");
      const apiCount = xhrSeen.length;
      const itemListSummary = itemListUrls.length > 0
        ? itemListUrls.slice(0, 3).join(" | ")
        : "none";
      throw new Error(
        `tiktok returned no items. finalUrl=${finalUrl} title="${title}" ` +
        `apiXhrs=${apiCount} itemListResponses=[${itemListSummary}]`,
      );
    }
  } finally {
    page.off("response", onResponse);
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }

  // Dedupe by id (TikTok occasionally emits the same item across responses)
  // and cap at maxPosts.
  const byId = new Map<string, TikTokItem>();
  for (const item of collected) {
    if (!item?.id || byId.has(item.id)) continue;
    byId.set(item.id, item);
    if (byId.size >= maxPosts) break;
  }

  const raws: RawPost[] = [];
  for (const item of byId.values()) {
    const r = itemToRawPost(item);
    if (r) raws.push(r);
  }
  return raws;
}
