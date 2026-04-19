// Real-data ingestion for YouTube and Reddit.
//
// Each source returns RawPost[] (provider-agnostic). runIngestion() reads all
// hashtags, fans out to the right provider per platform, scores everything via
// the shared scoring module, and atomically replaces the in-store posts for
// the platforms that were refreshed. Other platforms (twitter/instagram/tiktok)
// are left untouched so manually-added or seeded posts there survive a refresh.

import type { Hashtag, Platform, Post, SocialLink } from "./types";
import { computeOpportunityScore, deriveSuggestedAction, freshnessFromDate } from "./scoring";
import { detectSocialLinksFromText } from "./socialLinks";
import {
  listHashtags,
  replacePostsForPlatforms,
  touchHashtag,
  upsertInfluencerByHandle,
} from "./store";

export interface RawPost {
  externalId: string;
  content: string;
  creatorHandle: string;
  platform: Platform;
  url: string;
  createdAt: string;
  engagementCount: number; // raw weighted engagement (likes + comments*K, etc.)
  ageHours: number;
  // Optional creator metadata used to enrich the Influencer record.
  creatorFollowers?: number;
  creatorLinks?: SocialLink[];
}

const SUPPORTED_PLATFORMS: Platform[] = ["youtube", "reddit"];

// Velocity heuristic: log-scaled engagement-per-hour, capped at 100.
function normalizeVelocity(engagementCount: number, ageHours: number): number {
  const perHour = engagementCount / Math.max(1, ageHours);
  const v = Math.log10(perHour + 1) * 25;
  return Math.round(Math.max(0, Math.min(100, v)));
}

function rawToPost(raw: RawPost, hashtagRelevance: number, hashtagName: string): Post {
  const velocity = normalizeVelocity(raw.engagementCount, raw.ageHours);
  const opportunityScore = computeOpportunityScore({
    relevanceScore: hashtagRelevance,
    engagementVelocity: velocity,
    freshness: freshnessFromDate(raw.createdAt),
  });
  const post: Post = {
    id: `${raw.platform}-${raw.externalId}`,
    content: raw.content,
    creatorHandle: raw.creatorHandle,
    platform: raw.platform,
    engagementVelocity: velocity,
    relevanceScore: hashtagRelevance,
    opportunityScore,
    suggestedAction: "like",
    createdAt: raw.createdAt,
    url: raw.url,
    sourceHashtag: hashtagName,
  };
  post.suggestedAction = deriveSuggestedAction(post);
  return post;
}

// ---------- YouTube ----------

async function fetchYouTube(query: string, max = 10): Promise<RawPost[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY not set");

  // 1) Search for recent videos matching the query.
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("order", "date");
  searchUrl.searchParams.set("maxResults", String(Math.min(50, max)));
  searchUrl.searchParams.set("key", apiKey);

  const sRes = await fetch(searchUrl.toString());
  if (!sRes.ok) throw new Error(`YouTube search ${sRes.status}: ${await sRes.text()}`);
  const sData = (await sRes.json()) as {
    items?: Array<{
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; channelId: string; publishedAt: string };
    }>;
  };
  const items = sData.items ?? [];
  if (items.length === 0) return [];

  // 2) Hydrate stats in a single videos.list call.
  const ids = items.map((i) => i.id.videoId).join(",");
  const statsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  statsUrl.searchParams.set("part", "statistics,snippet");
  statsUrl.searchParams.set("id", ids);
  statsUrl.searchParams.set("key", apiKey);

  const vRes = await fetch(statsUrl.toString());
  if (!vRes.ok) throw new Error(`YouTube videos ${vRes.status}: ${await vRes.text()}`);
  const vData = (await vRes.json()) as {
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        channelTitle: string;
        channelId: string;
        publishedAt: string;
      };
      statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
  };

  // 3) Fetch channel details for every unique channel in one batched call so
  //    we can harvest cross-platform links (description + branding URLs) and
  //    a follower (subscriber) count to enrich the Influencer record.
  const channelIds = Array.from(
    new Set((vData.items ?? []).map((v) => v.snippet.channelId).filter(Boolean)),
  );
  const channelInfo = await fetchYouTubeChannels(channelIds, apiKey);

  return (vData.items ?? []).map((v) => {
    const ageHours = Math.max(1, (Date.now() - new Date(v.snippet.publishedAt).getTime()) / 36e5);
    const likes = Number(v.statistics.likeCount ?? 0);
    const comments = Number(v.statistics.commentCount ?? 0);
    const ch = channelInfo.get(v.snippet.channelId);
    return {
      externalId: v.id,
      content: v.snippet.title,
      creatorHandle: v.snippet.channelTitle,
      platform: "youtube" as const,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      createdAt: v.snippet.publishedAt,
      engagementCount: likes + comments * 5,
      ageHours,
      creatorFollowers: ch?.subscribers,
      creatorLinks: ch?.links,
    };
  });
}

interface YouTubeChannelMeta {
  subscribers: number;
  links: SocialLink[];
}

async function fetchYouTubeChannels(
  channelIds: string[],
  apiKey: string,
): Promise<Map<string, YouTubeChannelMeta>> {
  const out = new Map<string, YouTubeChannelMeta>();
  if (channelIds.length === 0) return out;
  // channels.list accepts up to 50 ids per call; we batch defensively.
  for (let i = 0; i < channelIds.length; i += 50) {
    const batch = channelIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/channels");
    url.searchParams.set("part", "snippet,statistics,brandingSettings");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", apiKey);
    const res = await fetch(url.toString());
    if (!res.ok) continue; // don't fail the whole refresh on enrichment errors
    const data = (await res.json()) as {
      items?: Array<{
        id: string;
        snippet: {
          customUrl?: string;
          description?: string;
        };
        statistics: { subscriberCount?: string };
        brandingSettings?: {
          channel?: { description?: string };
          // Some responses still include legacy `image.bannerExternalUrl`,
          // ignored here. Real cross-platform URLs live in description text.
        };
      }>;
    };
    for (const c of data.items ?? []) {
      const desc = [c.snippet.description, c.brandingSettings?.channel?.description]
        .filter(Boolean)
        .join("\n");
      const links = detectSocialLinksFromText(desc);
      // Always include the YouTube channel page itself as a link.
      const channelUrl = c.snippet.customUrl
        ? `https://www.youtube.com/${c.snippet.customUrl.startsWith("@") ? c.snippet.customUrl : "@" + c.snippet.customUrl}`
        : `https://www.youtube.com/channel/${c.id}`;
      links.unshift({ platform: "youtube", url: channelUrl });
      // Dedupe (the description might also contain the same channel URL).
      const seen = new Set<string>();
      const deduped = links.filter((l) => {
        const k = `${l.platform}|${l.url}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      out.set(c.id, {
        subscribers: Number(c.statistics.subscriberCount ?? 0),
        links: deduped,
      });
    }
  }
  return out;
}

// ---------- Reddit ----------

// Reddit auth: if REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET are set we use the
// OAuth client_credentials flow (works from any IP, including Vercel).
// Otherwise we fall back to anonymous public JSON endpoints, which still work
// from residential IPs but are blocked from most datacenter / cloud IPs.

let cachedRedditToken: { token: string; expiresAt: number } | null = null;

async function getRedditToken(): Promise<string | null> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (cachedRedditToken && cachedRedditToken.expiresAt > Date.now() + 30_000) {
    return cachedRedditToken.token;
  }
  const userAgent =
    process.env.REDDIT_USER_AGENT || "community-radar/0.1 (by /u/your_reddit_username)";
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Reddit auth ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedRedditToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

// Strip XML/HTML entities to plain text. Reddit's Atom feed double-encodes
// content (HTML inside CDATA inside XML), so this just unescapes the outer
// XML layer — enough for titles and authors.
function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

// RSS / Atom fallback for Reddit. Works from any IP (including Vercel) without
// any credentials at all — the trade-off is no upvote/comment counts, so
// engagement velocity gets a flat default and scoring leans on freshness.
//
// Reddit exposes RSS for almost every endpoint by appending `.rss`:
//   https://www.reddit.com/r/{sub}/new.rss
//   https://www.reddit.com/search.rss?q=...&sort=new&t=week
async function fetchRedditViaRss(query: string, max = 15): Promise<RawPost[]> {
  const userAgent =
    process.env.REDDIT_USER_AGENT ||
    "community-radar/0.1 (+https://github.com/layer8culture)";
  let url: string;
  if (query.toLowerCase().startsWith("r/")) {
    const sub = query.slice(2).replace(/[^a-zA-Z0-9_]/g, "");
    if (!sub) return [];
    url = `https://www.reddit.com/r/${sub}/new.rss?limit=${Math.min(100, max)}`;
  } else {
    url = `https://www.reddit.com/search.rss?q=${encodeURIComponent(query)}&sort=new&limit=${Math.min(100, max)}&t=week`;
  }
  const res = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!res.ok) throw new Error(`Reddit RSS ${res.status}`);
  const xml = await res.text();
  const out: RawPost[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml)) && out.length < max) {
    const e = m[1];
    const title = /<title>([\s\S]*?)<\/title>/.exec(e)?.[1]?.trim();
    const author = /<author>[\s\S]*?<name>\/u\/([^<]+)<\/name>/.exec(e)?.[1]?.trim();
    const link = /<link[^>]*href="([^"]+)"/.exec(e)?.[1];
    const updated = /<updated>([^<]+)<\/updated>/.exec(e)?.[1];
    const id = /<id>([^<]+)<\/id>/.exec(e)?.[1];
    if (!title || !link || !updated || !id) continue;
    const externalId = id.split("/").filter(Boolean).pop() || id;
    const createdAtMs = new Date(updated).getTime();
    const ageHours = Math.max(1, (Date.now() - createdAtMs) / 36e5);
    out.push({
      externalId,
      content: decodeXml(title),
      creatorHandle: author ?? "unknown",
      platform: "reddit",
      url: link,
      createdAt: new Date(createdAtMs).toISOString(),
      // RSS gives no engagement counts; use a modest default so freshness
      // still drives the opportunity score.
      engagementCount: 10,
      ageHours,
      creatorLinks: author
        ? [{ platform: "reddit", url: `https://www.reddit.com/user/${author}` }]
        : undefined,
    });
  }
  return out;
}

// If the hashtag name starts with "r/" we treat it as a subreddit. Otherwise
// it is sent to the Reddit search endpoint as a free-text query.
//
// Backend selection (auto):
//   1. OAuth (REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET set) — full data, works
//      from any IP. Use this once your Reddit API application is approved.
//   2. RSS fallback — no credentials required, works from any IP, but no
//      upvote/comment counts.
async function fetchReddit(query: string, max = 15): Promise<RawPost[]> {
  const userAgent =
    process.env.REDDIT_USER_AGENT ||
    "community-radar/0.1 (+https://github.com/layer8culture)";
  const token = await getRedditToken();
  if (!token) {
    return fetchRedditViaRss(query, max);
  }
  const base = "https://oauth.reddit.com";

  let path: string;
  if (query.toLowerCase().startsWith("r/")) {
    const sub = query.slice(2).replace(/[^a-zA-Z0-9_]/g, "");
    if (!sub) return [];
    path = `/r/${sub}/new.json?limit=${Math.min(100, max)}`;
  } else {
    path = `/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${Math.min(100, max)}&t=week`;
  }

  const headers: Record<string, string> = {
    "User-Agent": userAgent,
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(base + path, { headers });
  if (!res.ok) {
    throw new Error(`Reddit ${res.status}`);
  }
  const data = (await res.json()) as {
    data?: {
      children?: Array<{
        data: {
          id: string;
          title: string;
          selftext?: string;
          author: string;
          subreddit: string;
          permalink: string;
          ups?: number;
          num_comments?: number;
          created_utc: number;
        };
      }>;
    };
  };
  const rawPosts: RawPost[] = (data.data?.children ?? []).map((c) => {
    const d = c.data;
    const createdAtMs = d.created_utc * 1000;
    const ageHours = Math.max(1, (Date.now() - createdAtMs) / 36e5);
    const ups = d.ups ?? 0;
    const comments = d.num_comments ?? 0;
    const body = d.selftext ? `${d.title} — ${d.selftext.slice(0, 240)}` : d.title;
    return {
      externalId: d.id,
      content: body,
      creatorHandle: d.author,
      platform: "reddit",
      url: `https://www.reddit.com${d.permalink}`,
      createdAt: new Date(createdAtMs).toISOString(),
      engagementCount: ups + comments * 3,
      ageHours,
    };
  });

  // Enrich with creator profile info (one /user/{u}/about call per unique
  // author, capped to keep the Reddit rate budget in check).
  const uniqueAuthors = Array.from(
    new Set(rawPosts.map((p) => p.creatorHandle).filter((h) => h && h !== "[deleted]")),
  ).slice(0, 25);
  const meta = await fetchRedditUserMeta(uniqueAuthors, token, userAgent);
  for (const p of rawPosts) {
    const m = meta.get(p.creatorHandle);
    if (m) {
      p.creatorFollowers = m.followers;
      p.creatorLinks = m.links;
    } else if (p.creatorHandle && p.creatorHandle !== "[deleted]") {
      p.creatorLinks = [
        { platform: "reddit", url: `https://www.reddit.com/user/${p.creatorHandle}` },
      ];
    }
  }
  return rawPosts;
}

interface RedditUserMeta {
  followers: number;
  links: SocialLink[];
}

async function fetchRedditUserMeta(
  authors: string[],
  token: string,
  userAgent: string,
): Promise<Map<string, RedditUserMeta>> {
  const out = new Map<string, RedditUserMeta>();
  // Run with light concurrency to avoid hammering Reddit's 60 req/min limit.
  const concurrency = 4;
  let i = 0;
  async function worker() {
    while (i < authors.length) {
      const idx = i++;
      const author = authors[idx];
      try {
        const res = await fetch(`https://oauth.reddit.com/user/${author}/about.json`, {
          headers: { "User-Agent": userAgent, Authorization: `Bearer ${token}` },
        });
        if (!res.ok) continue;
        const data = (await res.json()) as {
          data?: {
            subreddit?: { public_description?: string; description?: string };
            link_karma?: number;
            total_karma?: number;
          };
        };
        const desc = [
          data.data?.subreddit?.public_description,
          data.data?.subreddit?.description,
        ]
          .filter(Boolean)
          .join("\n");
        const links = detectSocialLinksFromText(desc);
        links.unshift({
          platform: "reddit",
          url: `https://www.reddit.com/user/${author}`,
        });
        const seen = new Set<string>();
        const deduped = links.filter((l) => {
          const k = `${l.platform}|${l.url}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
        out.set(author, {
          followers: data.data?.total_karma ?? data.data?.link_karma ?? 0,
          links: deduped,
        });
      } catch {
        // Best-effort enrichment; ignore individual user failures.
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}

// ---------- Orchestrator ----------

export interface IngestionReport {
  ok: boolean;
  durationMs: number;
  perHashtag: Array<{
    hashtag: string;
    platform: Platform;
    fetched: number;
    error?: string;
  }>;
  totals: { fetched: number; influencersUpserted: number };
  skipped: { hashtag: string; platform: Platform; reason: string }[];
}

export async function runIngestion(): Promise<IngestionReport> {
  const start = Date.now();
  const tags = await listHashtags();
  const perHashtag: IngestionReport["perHashtag"] = [];
  const skipped: IngestionReport["skipped"] = [];
  const allPosts: Post[] = [];
  // Aggregate creator metadata across all hashtags. Same creator may appear
  // for multiple tags — we merge follower counts (max) and links (union).
  const creatorMeta = new Map<
    string,
    { followers: number; links: SocialLink[]; platform: Platform; handle: string }
  >();

  const youtubeKey = !!process.env.YOUTUBE_API_KEY;

  for (const tag of tags) {
    if (!SUPPORTED_PLATFORMS.includes(tag.platform)) {
      skipped.push({
        hashtag: tag.name,
        platform: tag.platform,
        reason: "platform not yet supported by ingestion",
      });
      continue;
    }
    if (tag.platform === "youtube" && !youtubeKey) {
      skipped.push({ hashtag: tag.name, platform: tag.platform, reason: "YOUTUBE_API_KEY not set" });
      continue;
    }
    try {
      const raws =
        tag.platform === "youtube"
          ? await fetchYouTube(tag.name)
          : await fetchReddit(tag.name);
      for (const r of raws) {
        const key = `${r.platform}:${r.creatorHandle}`;
        const prev = creatorMeta.get(key);
        const mergedLinksMap = new Map<string, SocialLink>();
        for (const l of [...(prev?.links ?? []), ...(r.creatorLinks ?? [])]) {
          mergedLinksMap.set(`${l.platform}|${l.url}`, l);
        }
        creatorMeta.set(key, {
          platform: r.platform,
          handle: r.creatorHandle,
          followers: Math.max(prev?.followers ?? 0, r.creatorFollowers ?? 0),
          links: Array.from(mergedLinksMap.values()),
        });
      }
      const posts = raws.map((r) => rawToPost(r, tag.relevanceScore, tag.name));
      allPosts.push(...posts);
      perHashtag.push({ hashtag: tag.name, platform: tag.platform, fetched: posts.length });
      await touchHashtag(tag.id);
    } catch (e) {
      perHashtag.push({
        hashtag: tag.name,
        platform: tag.platform,
        fetched: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // Dedupe by id (same video could match multiple hashtags); keep the highest score.
  const byId = new Map<string, Post>();
  for (const p of allPosts) {
    const prev = byId.get(p.id);
    if (!prev || p.opportunityScore > prev.opportunityScore) byId.set(p.id, p);
  }
  const finalPosts = Array.from(byId.values());

  // Replace posts only for the platforms we actually touched.
  const touchedPlatforms = Array.from(
    new Set(perHashtag.filter((r) => !r.error).map((r) => r.platform)),
  ) as Platform[];
  if (touchedPlatforms.length > 0) {
    await replacePostsForPlatforms(touchedPlatforms, finalPosts);
  }

  // Auto-discover influencers from the unique creators we just pulled in,
  // enriched with follower count + cross-platform links from creatorMeta.
  const seen = new Set<string>();
  let influencersUpserted = 0;
  for (const p of finalPosts) {
    const key = `${p.platform}:${p.creatorHandle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const meta = creatorMeta.get(key);
    await upsertInfluencerByHandle(p.creatorHandle, p.platform, {
      niche: p.sourceHashtag ?? "discovered",
      relevanceScore: p.relevanceScore,
      followerCount: meta?.followers,
      socialLinks: meta?.links,
    });
    influencersUpserted++;
  }

  return {
    ok: true,
    durationMs: Date.now() - start,
    perHashtag,
    totals: { fetched: finalPosts.length, influencersUpserted },
    skipped,
  };
}
