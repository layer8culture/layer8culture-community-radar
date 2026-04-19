// Helpers for harvesting cross-platform social links from creator profile text
// (YouTube channel descriptions / branding URLs, Reddit user bios, etc.).
//
// Goal: given any free-form text, return a deduped, normalized list of
// SocialLink objects keyed by a known `platform` slug. Unknown but plausible
// URLs fall through as `platform: "website"` so we still surface them.

import type { SocialLink } from "./types";

interface Detector {
  platform: string;
  // Returns matched URL (possibly normalized) or null if no match.
  match: (url: URL) => string | null;
}

// Order matters: more specific first. Each detector decides whether a given
// URL belongs to it and, if so, returns the normalized form.
const DETECTORS: Detector[] = [
  {
    platform: "twitter",
    match: (u) =>
      /(^|\.)(twitter\.com|x\.com)$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://x.com${stripTrailingSlash(u.pathname.split("?")[0])}`
        : null,
  },
  {
    platform: "instagram",
    match: (u) =>
      /(^|\.)instagram\.com$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://instagram.com${stripTrailingSlash(u.pathname.split("?")[0])}`
        : null,
  },
  {
    platform: "tiktok",
    match: (u) =>
      /(^|\.)tiktok\.com$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://www.tiktok.com${stripTrailingSlash(u.pathname.split("?")[0])}`
        : null,
  },
  {
    platform: "youtube",
    match: (u) =>
      /(^|\.)(youtube\.com|youtu\.be)$/i.test(u.hostname)
        ? `https://www.youtube.com${stripTrailingSlash(u.pathname || "/")}`
        : null,
  },
  {
    platform: "twitch",
    match: (u) =>
      /(^|\.)twitch\.tv$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://www.twitch.tv${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "github",
    match: (u) =>
      /(^|\.)github\.com$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://github.com${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "linkedin",
    match: (u) =>
      /(^|\.)linkedin\.com$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://www.linkedin.com${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "threads",
    match: (u) =>
      /(^|\.)threads\.(net|com)$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://threads.net${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "bluesky",
    match: (u) =>
      /(^|\.)(bsky\.app|bsky\.social)$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://bsky.app${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "mastodon",
    match: (u) =>
      // Generic Mastodon: /@handle or /users/handle on any host.
      /^\/@[^/]+\/?$/.test(u.pathname) || /^\/users\/[^/]+\/?$/.test(u.pathname)
        ? `${u.origin}${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "reddit",
    match: (u) =>
      /(^|\.)reddit\.com$/i.test(u.hostname) && /^\/(u|user)\/[^/]+/.test(u.pathname)
        ? `https://www.reddit.com${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "substack",
    match: (u) =>
      /(^|\.)substack\.com$/i.test(u.hostname)
        ? `${u.origin}${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "patreon",
    match: (u) =>
      /(^|\.)patreon\.com$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://www.patreon.com${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "discord",
    match: (u) =>
      /(^|\.)(discord\.gg|discord\.com)$/i.test(u.hostname)
        ? `${u.origin}${stripTrailingSlash(u.pathname)}`
        : null,
  },
  {
    platform: "linktree",
    match: (u) =>
      /(^|\.)linktr\.ee$/i.test(u.hostname) && u.pathname.length > 1
        ? `https://linktr.ee${stripTrailingSlash(u.pathname)}`
        : null,
  },
];

function stripTrailingSlash(s: string): string {
  return s.length > 1 && s.endsWith("/") ? s.slice(0, -1) : s;
}

// Hosts that are noise (analytics redirects, share links, image hosts, etc.)
// We never surface these as social links.
const BLOCKED_HOSTS = new Set([
  "t.co",
  "bit.ly",
  "buff.ly",
  "lnkd.in",
  "goo.gl",
  "tinyurl.com",
  "ow.ly",
]);

// Pull every http(s) URL out of free text, including ones bare without protocol.
function extractUrls(text: string): string[] {
  if (!text) return [];
  const out = new Set<string>();
  // With protocol.
  const reProto = /https?:\/\/[^\s<>"')\]]+/gi;
  for (const m of text.match(reProto) ?? []) out.add(m.replace(/[.,;:!?)\]'"]+$/, ""));
  // Bare like "github.com/foo" or "@user on twitter.com/foo". Conservative —
  // require a known TLD-ish suffix we care about to avoid false positives.
  const reBare =
    /\b((?:[a-z0-9-]+\.)+(?:com|net|org|tv|io|app|dev|gg|me|co|social|net))(\/[^\s<>"')\]]+)?/gi;
  for (const m of text.matchAll(reBare)) {
    const host = m[1];
    if (!host || /\.(jpg|jpeg|png|gif|webp|svg|mp4|mov)$/i.test(m[0])) continue;
    out.add(`https://${m[0]}`.replace(/[.,;:!?)\]'"]+$/, ""));
  }
  return Array.from(out);
}

function classify(rawUrl: string): SocialLink | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) return null;
  for (const d of DETECTORS) {
    const normalized = d.match(u);
    if (normalized) return { platform: d.platform, url: normalized };
  }
  // Fallback: keep as a generic personal "website" if it looks like a homepage.
  if (u.pathname === "/" || u.pathname === "") {
    return { platform: "website", url: `${u.origin}/` };
  }
  return { platform: "website", url: `${u.origin}${stripTrailingSlash(u.pathname)}` };
}

// Public: extract + classify in one call.
export function detectSocialLinksFromText(text: string | null | undefined): SocialLink[] {
  if (!text) return [];
  const out = new Map<string, SocialLink>();
  for (const url of extractUrls(text)) {
    const link = classify(url);
    if (!link) continue;
    const key = `${link.platform}|${link.url}`;
    if (!out.has(key)) out.set(key, link);
  }
  return Array.from(out.values());
}

// Public: classify a list of pre-extracted URLs (e.g. YouTube branding URLs).
export function classifyUrls(urls: Array<string | null | undefined>): SocialLink[] {
  const out = new Map<string, SocialLink>();
  for (const u of urls) {
    if (!u) continue;
    const link = classify(u);
    if (!link) continue;
    const key = `${link.platform}|${link.url}`;
    if (!out.has(key)) out.set(key, link);
  }
  return Array.from(out.values());
}

// Display-friendly icon labels for known platforms.
export const PLATFORM_LABELS: Record<string, string> = {
  twitter: "X",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  twitch: "Twitch",
  github: "GitHub",
  linkedin: "LinkedIn",
  threads: "Threads",
  bluesky: "Bluesky",
  mastodon: "Mastodon",
  reddit: "Reddit",
  substack: "Substack",
  patreon: "Patreon",
  discord: "Discord",
  linktree: "Linktree",
  website: "Website",
};
