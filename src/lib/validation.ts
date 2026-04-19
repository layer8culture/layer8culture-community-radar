// Strict whitelist sanitizers for PATCH endpoints. We deliberately avoid a
// schema library to keep the MVP zero-extra-deps; if this surface grows,
// switch to zod.

import { EngagementTrends, Platforms } from "./types";
import type { EngagementTrend, Platform } from "./types";

function clampNumber(v: unknown, min: number, max: number, fallback?: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function sanitizeInfluencerPatch(input: unknown): {
  patch: Record<string, unknown>;
  rejected: string[];
} {
  const rejected: string[] = [];
  const patch: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return { patch, rejected: ["body must be an object"] };
  const body = input as Record<string, unknown>;
  const ALLOWED = new Set([
    "handle", "platform", "niche", "followerCount",
    "postingFrequency", "engagementTrend", "relevanceScore", "socialLinks",
  ]);

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) { rejected.push(key); continue; }
    const v = body[key];
    switch (key) {
      case "handle":
      case "niche":
        if (typeof v === "string" && v.trim().length > 0 && v.length <= 200) {
          patch[key] = key === "handle" ? v.replace(/^@/, "").trim() : v.trim();
        } else rejected.push(key);
        break;
      case "platform":
        if (typeof v === "string" && (Platforms as readonly string[]).includes(v)) patch[key] = v as Platform;
        else rejected.push(key);
        break;
      case "engagementTrend":
        if (typeof v === "string" && (EngagementTrends as readonly string[]).includes(v)) patch[key] = v as EngagementTrend;
        else rejected.push(key);
        break;
      case "followerCount": {
        const n = clampNumber(v, 0, 1_000_000_000);
        if (n === undefined) rejected.push(key); else patch[key] = n;
        break;
      }
      case "postingFrequency": {
        const n = clampNumber(v, 0, 10_000);
        if (n === undefined) rejected.push(key); else patch[key] = n;
        break;
      }
      case "relevanceScore": {
        const n = clampNumber(v, 0, 100);
        if (n === undefined) rejected.push(key); else patch[key] = n;
        break;
      }
      case "socialLinks": {
        if (!Array.isArray(v)) { rejected.push(key); break; }
        const cleaned: { platform: string; url: string; label?: string }[] = [];
        for (const raw of v) {
          if (!raw || typeof raw !== "object") continue;
          const r = raw as { platform?: unknown; url?: unknown; label?: unknown };
          if (typeof r.platform !== "string" || typeof r.url !== "string") continue;
          if (r.platform.length > 64 || r.url.length > 2048) continue;
          // Only http(s).
          try {
            const u = new URL(r.url);
            if (u.protocol !== "http:" && u.protocol !== "https:") continue;
          } catch {
            continue;
          }
          const link: { platform: string; url: string; label?: string } = {
            platform: r.platform,
            url: r.url,
          };
          if (typeof r.label === "string" && r.label.length <= 200) link.label = r.label;
          cleaned.push(link);
        }
        patch[key] = cleaned;
        break;
      }
    }
  }
  return { patch, rejected };
}

export function sanitizeRelationshipPatch(input: unknown): {
  patch: Record<string, unknown>;
  rejected: string[];
} {
  const rejected: string[] = [];
  const patch: Record<string, unknown> = {};
  if (!input || typeof input !== "object") return { patch, rejected: ["body must be an object"] };
  const body = input as Record<string, unknown>;
  const BOOLS = ["liked", "commented", "followed", "replied", "invited"] as const;
  const ALLOWED = new Set<string>([
    ...BOOLS, "creatorHandle", "platform", "collaboratorScore", "notes", "influencerId",
  ]);

  for (const key of Object.keys(body)) {
    if (!ALLOWED.has(key)) { rejected.push(key); continue; }
    const v = body[key];
    if ((BOOLS as readonly string[]).includes(key)) {
      if (typeof v === "boolean") patch[key] = v; else rejected.push(key);
    } else if (key === "creatorHandle") {
      if (typeof v === "string" && v.trim().length > 0 && v.length <= 200)
        patch[key] = v.replace(/^@/, "").trim();
      else rejected.push(key);
    } else if (key === "platform") {
      if (typeof v === "string" && (Platforms as readonly string[]).includes(v)) patch[key] = v;
      else rejected.push(key);
    } else if (key === "collaboratorScore") {
      const n = clampNumber(v, 0, 100);
      if (n === undefined) rejected.push(key); else patch[key] = n;
    } else if (key === "notes") {
      if (typeof v === "string" && v.length <= 5000) patch[key] = v;
      else rejected.push(key);
    } else if (key === "influencerId") {
      if (v === null || (typeof v === "string" && v.length <= 100)) patch[key] = v;
      else rejected.push(key);
    }
  }
  return { patch, rejected };
}
