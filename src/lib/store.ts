// Data store abstraction.
//
// Two backends, selected at runtime:
//   - Prisma / Supabase Postgres when `DATABASE_URL` is set.
//   - In-memory mock store otherwise (zero-setup demo mode).
//
// Function signatures and return shapes are identical across both backends so
// pages and API routes don't care which one is active. `usingMock` is exported
// for the diagnostic banner in the UI.

import type {
  EngagementTrend,
  Hashtag,
  Influencer,
  Platform,
  Post,
  Relationship,
  SocialLink,
  SuggestedAction,
} from "./types";
import {
  buildSeedHashtags,
  buildSeedInfluencers,
  buildSeedPosts,
  buildSeedRelationships,
} from "./mockData";

// ---------------------------------------------------------------------------
// Backend selection
// ---------------------------------------------------------------------------

export const usingMock = !process.env.DATABASE_URL;

// Lazy Prisma singleton. Survives Next.js hot reloads in dev via globalThis.
type PrismaLike = import("@prisma/client").PrismaClient;
const gp = globalThis as unknown as { __crPrisma?: PrismaLike };

function prisma(): PrismaLike {
  if (!gp.__crPrisma) {
    // Require lazily so missing client (pre-`db:generate`) only fails when used.
    const { PrismaClient } = require("@prisma/client") as typeof import("@prisma/client");
    gp.__crPrisma = new PrismaClient();
  }
  return gp.__crPrisma;
}

// ---------------------------------------------------------------------------
// Mock backend state
// ---------------------------------------------------------------------------

type MockState = {
  influencers: Influencer[];
  hashtags: Hashtag[];
  posts: Post[];
  relationships: Relationship[];
};

const g = globalThis as unknown as { __crMock?: MockState };

function getMock(): MockState {
  if (!g.__crMock) {
    g.__crMock = {
      influencers: buildSeedInfluencers(),
      hashtags: buildSeedHashtags(),
      posts: buildSeedPosts(),
      relationships: buildSeedRelationships(),
    };
  }
  return g.__crMock;
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Prisma → domain-type serializers (Date → ISO string, null → undefined)
// ---------------------------------------------------------------------------

type PrismaInfluencer = {
  id: string;
  handle: string;
  platform: string;
  niche: string;
  followerCount: number;
  postingFrequency: number;
  engagementTrend: string;
  relevanceScore: number;
  socialLinks: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaHashtag = {
  id: string;
  name: string;
  platform: string;
  relevanceScore: number;
  lastCheckedAt: Date;
  createdAt: Date;
};

type PrismaPost = {
  id: string;
  content: string;
  creatorHandle: string;
  platform: string;
  engagementVelocity: number;
  relevanceScore: number;
  opportunityScore: number;
  suggestedAction: string;
  url: string | null;
  sourceHashtag: string | null;
  createdAt: Date;
};

type PrismaRelationship = {
  id: string;
  creatorHandle: string;
  platform: string;
  liked: boolean;
  commented: boolean;
  followed: boolean;
  replied: boolean;
  invited: boolean;
  collaboratorScore: number;
  notes: string;
  influencerId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const fromInfluencer = (i: PrismaInfluencer): Influencer => ({
  id: i.id,
  handle: i.handle,
  platform: i.platform as Platform,
  niche: i.niche,
  followerCount: i.followerCount,
  postingFrequency: i.postingFrequency,
  engagementTrend: i.engagementTrend as EngagementTrend,
  relevanceScore: i.relevanceScore,
  socialLinks: normalizeSocialLinks(i.socialLinks),
  createdAt: i.createdAt.toISOString(),
  updatedAt: i.updatedAt.toISOString(),
});

function normalizeSocialLinks(raw: unknown): SocialLink[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLink[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as { platform?: unknown; url?: unknown; label?: unknown };
    if (typeof r.platform !== "string" || typeof r.url !== "string") continue;
    const key = `${r.platform}|${r.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const link: SocialLink = { platform: r.platform, url: r.url };
    if (typeof r.label === "string" && r.label) link.label = r.label;
    out.push(link);
  }
  return out;
}

function mergeSocialLinks(existing: SocialLink[], incoming: SocialLink[]): SocialLink[] {
  const map = new Map<string, SocialLink>();
  for (const l of [...existing, ...incoming]) {
    const key = `${l.platform}|${l.url}`;
    if (!map.has(key)) map.set(key, l);
  }
  return Array.from(map.values());
}

const fromHashtag = (t: PrismaHashtag): Hashtag => ({
  id: t.id,
  name: t.name,
  platform: t.platform as Platform,
  relevanceScore: t.relevanceScore,
  lastCheckedAt: t.lastCheckedAt.toISOString(),
  createdAt: t.createdAt.toISOString(),
});

const fromPost = (p: PrismaPost): Post => ({
  id: p.id,
  content: p.content,
  creatorHandle: p.creatorHandle,
  platform: p.platform as Platform,
  engagementVelocity: p.engagementVelocity,
  relevanceScore: p.relevanceScore,
  opportunityScore: p.opportunityScore,
  suggestedAction: p.suggestedAction as SuggestedAction,
  url: p.url ?? undefined,
  sourceHashtag: p.sourceHashtag ?? undefined,
  createdAt: p.createdAt.toISOString(),
});

const fromRelationship = (r: PrismaRelationship): Relationship => ({
  id: r.id,
  creatorHandle: r.creatorHandle,
  platform: r.platform as Platform,
  liked: r.liked,
  commented: r.commented,
  followed: r.followed,
  replied: r.replied,
  invited: r.invited,
  collaboratorScore: r.collaboratorScore,
  notes: r.notes,
  influencerId: r.influencerId ?? null,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

// ---------------------------------------------------------------------------
// Influencers
// ---------------------------------------------------------------------------

export async function listInfluencers(): Promise<Influencer[]> {
  if (!usingMock) {
    const rows = await prisma().influencer.findMany({ orderBy: { relevanceScore: "desc" } });
    return rows.map(fromInfluencer);
  }
  return [...getMock().influencers].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function getInfluencer(id: string): Promise<Influencer | null> {
  if (!usingMock) {
    const row = await prisma().influencer.findUnique({ where: { id } });
    return row ? fromInfluencer(row) : null;
  }
  return getMock().influencers.find((i) => i.id === id) ?? null;
}

export async function createInfluencer(
  input: Omit<Influencer, "id" | "createdAt" | "updatedAt">,
): Promise<Influencer> {
  if (!usingMock) {
    const row = await prisma().influencer.create({
      data: {
        handle: input.handle,
        platform: input.platform,
        niche: input.niche,
        followerCount: input.followerCount,
        postingFrequency: input.postingFrequency,
        engagementTrend: input.engagementTrend,
        relevanceScore: input.relevanceScore,
        socialLinks: normalizeSocialLinks(input.socialLinks) as unknown as object,
      },
    });
    return fromInfluencer(row);
  }
  const now = nowIso();
  const inf: Influencer = {
    ...input,
    socialLinks: normalizeSocialLinks(input.socialLinks),
    id: newId("inf"),
    createdAt: now,
    updatedAt: now,
  };
  getMock().influencers.push(inf);
  return inf;
}

export async function updateInfluencer(
  id: string,
  patch: Partial<Influencer>,
): Promise<Influencer | null> {
  if (!usingMock) {
    try {
      const row = await prisma().influencer.update({
        where: { id },
        data: {
          ...(patch.handle !== undefined && { handle: patch.handle }),
          ...(patch.platform !== undefined && { platform: patch.platform }),
          ...(patch.niche !== undefined && { niche: patch.niche }),
          ...(patch.followerCount !== undefined && { followerCount: patch.followerCount }),
          ...(patch.postingFrequency !== undefined && { postingFrequency: patch.postingFrequency }),
          ...(patch.engagementTrend !== undefined && { engagementTrend: patch.engagementTrend }),
          ...(patch.relevanceScore !== undefined && { relevanceScore: patch.relevanceScore }),
          ...(patch.socialLinks !== undefined && {
            socialLinks: normalizeSocialLinks(patch.socialLinks) as unknown as object,
          }),
        },
      });
      return fromInfluencer(row);
    } catch {
      return null;
    }
  }
  const list = getMock().influencers;
  const idx = list.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  const prev = list[idx];
  list[idx] = {
    ...prev,
    ...patch,
    socialLinks:
      patch.socialLinks !== undefined ? normalizeSocialLinks(patch.socialLinks) : prev.socialLinks,
    id,
    createdAt: prev.createdAt,
    updatedAt: nowIso(),
  };
  return list[idx];
}

export async function deleteInfluencer(id: string): Promise<boolean> {
  if (!usingMock) {
    try {
      await prisma().influencer.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  const list = getMock().influencers;
  const before = list.length;
  getMock().influencers = list.filter((i) => i.id !== id);
  return getMock().influencers.length < before;
}

// ---------------------------------------------------------------------------
// Hashtags
// ---------------------------------------------------------------------------

export async function listHashtags(): Promise<Hashtag[]> {
  if (!usingMock) {
    const rows = await prisma().hashtag.findMany({ orderBy: { relevanceScore: "desc" } });
    return rows.map(fromHashtag);
  }
  return [...getMock().hashtags].sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export async function createHashtag(input: {
  name: string;
  platform: Platform;
  relevanceScore?: number;
}): Promise<Hashtag> {
  const cleanName = input.name.replace(/^#/, "");
  if (!usingMock) {
    const row = await prisma().hashtag.upsert({
      where: { name_platform: { name: cleanName, platform: input.platform } },
      update: { relevanceScore: input.relevanceScore ?? 60 },
      create: {
        name: cleanName,
        platform: input.platform,
        relevanceScore: input.relevanceScore ?? 60,
      },
    });
    return fromHashtag(row);
  }
  const tag: Hashtag = {
    id: newId("tag"),
    name: cleanName,
    platform: input.platform,
    relevanceScore: input.relevanceScore ?? 60,
    lastCheckedAt: nowIso(),
    createdAt: nowIso(),
  };
  getMock().hashtags.push(tag);
  return tag;
}

export async function deleteHashtag(id: string): Promise<boolean> {
  if (!usingMock) {
    try {
      await prisma().hashtag.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  const list = getMock().hashtags;
  const before = list.length;
  getMock().hashtags = list.filter((t) => t.id !== id);
  return getMock().hashtags.length < before;
}

export async function touchHashtag(id: string): Promise<void> {
  if (!usingMock) {
    try {
      await prisma().hashtag.update({ where: { id }, data: { lastCheckedAt: new Date() } });
    } catch {
      /* ignore */
    }
    return;
  }
  const t = getMock().hashtags.find((h) => h.id === id);
  if (t) t.lastCheckedAt = nowIso();
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function listPosts(): Promise<Post[]> {
  if (!usingMock) {
    const rows = await prisma().post.findMany({ orderBy: { opportunityScore: "desc" } });
    return rows.map(fromPost);
  }
  return [...getMock().posts].sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export async function getPost(id: string): Promise<Post | null> {
  if (!usingMock) {
    const row = await prisma().post.findUnique({ where: { id } });
    return row ? fromPost(row) : null;
  }
  return getMock().posts.find((p) => p.id === id) ?? null;
}

// Replace all posts whose platform is in `platforms` with `incoming`. Posts
// for any other platform are left alone. Used by the ingestion job so a
// YouTube+Reddit refresh doesn't wipe seeded twitter/instagram demo posts.
export async function replacePostsForPlatforms(
  platforms: Platform[],
  incoming: Post[],
): Promise<void> {
  if (!usingMock) {
    await prisma().$transaction([
      prisma().post.deleteMany({ where: { platform: { in: platforms as string[] as any } } }),
      ...incoming.map((p) =>
        prisma().post.create({
          data: {
            id: p.id,
            content: p.content,
            creatorHandle: p.creatorHandle,
            platform: p.platform,
            engagementVelocity: p.engagementVelocity,
            relevanceScore: p.relevanceScore,
            opportunityScore: p.opportunityScore,
            suggestedAction: p.suggestedAction,
            url: p.url ?? null,
            sourceHashtag: p.sourceHashtag ?? null,
            createdAt: new Date(p.createdAt),
          },
        }),
      ),
    ]);
    return;
  }
  const set = new Set(platforms);
  const m = getMock();
  m.posts = [...m.posts.filter((p) => !set.has(p.platform)), ...incoming];
}

export async function upsertInfluencerByHandle(
  handle: string,
  platform: Platform,
  patch: Partial<Omit<Influencer, "id" | "handle" | "platform" | "createdAt" | "updatedAt">>,
): Promise<Influencer> {
  const incomingLinks = normalizeSocialLinks(patch.socialLinks);
  if (!usingMock) {
    const existing = await prisma().influencer.findUnique({
      where: { handle_platform: { handle, platform } },
    });
    if (existing) {
      const mergedLinks = mergeSocialLinks(
        normalizeSocialLinks(existing.socialLinks),
        incomingLinks,
      );
      const row = await prisma().influencer.update({
        where: { handle_platform: { handle, platform } },
        data: {
          relevanceScore:
            patch.relevanceScore !== undefined
              ? Math.max(existing.relevanceScore, patch.relevanceScore)
              : existing.relevanceScore,
          niche: patch.niche && !existing.niche ? patch.niche : existing.niche,
          ...(patch.followerCount !== undefined && patch.followerCount > existing.followerCount && {
            followerCount: patch.followerCount,
          }),
          socialLinks: mergedLinks as unknown as object,
        },
      });
      return fromInfluencer(row);
    }
    const row = await prisma().influencer.create({
      data: {
        handle,
        platform,
        niche: patch.niche ?? "discovered",
        followerCount: patch.followerCount ?? 0,
        postingFrequency: patch.postingFrequency ?? 0,
        engagementTrend: patch.engagementTrend ?? "stable",
        relevanceScore: patch.relevanceScore ?? 50,
        socialLinks: incomingLinks as unknown as object,
      },
    });
    return fromInfluencer(row);
  }
  const list = getMock().influencers;
  const existing = list.find((i) => i.handle === handle && i.platform === platform);
  if (existing) {
    if (patch.relevanceScore !== undefined) {
      existing.relevanceScore = Math.max(existing.relevanceScore, patch.relevanceScore);
    }
    if (patch.niche && !existing.niche) existing.niche = patch.niche;
    if (patch.followerCount !== undefined && patch.followerCount > existing.followerCount) {
      existing.followerCount = patch.followerCount;
    }
    existing.socialLinks = mergeSocialLinks(existing.socialLinks ?? [], incomingLinks);
    existing.updatedAt = nowIso();
    return existing;
  }
  const now = nowIso();
  const inf: Influencer = {
    id: newId("inf"),
    handle,
    platform,
    niche: patch.niche ?? "discovered",
    followerCount: patch.followerCount ?? 0,
    postingFrequency: patch.postingFrequency ?? 0,
    engagementTrend: patch.engagementTrend ?? "stable",
    relevanceScore: patch.relevanceScore ?? 50,
    socialLinks: incomingLinks,
    createdAt: now,
    updatedAt: now,
  };
  list.push(inf);
  return inf;
}

// ---------------------------------------------------------------------------
// Relationships
// ---------------------------------------------------------------------------

export async function listRelationships(): Promise<Relationship[]> {
  if (!usingMock) {
    const rows = await prisma().relationship.findMany({
      orderBy: { collaboratorScore: "desc" },
    });
    return rows.map(fromRelationship);
  }
  return [...getMock().relationships].sort((a, b) => b.collaboratorScore - a.collaboratorScore);
}

export async function upsertRelationship(input: {
  creatorHandle: string;
  platform: Platform;
  liked?: boolean;
  commented?: boolean;
  followed?: boolean;
  replied?: boolean;
  invited?: boolean;
  collaboratorScore?: number;
  notes?: string;
  influencerId?: string | null;
}): Promise<Relationship> {
  if (!usingMock) {
    const data = {
      liked: input.liked ?? false,
      commented: input.commented ?? false,
      followed: input.followed ?? false,
      replied: input.replied ?? false,
      invited: input.invited ?? false,
      collaboratorScore: input.collaboratorScore ?? 50,
      notes: input.notes ?? "",
      influencerId: input.influencerId ?? null,
    };
    const row = await prisma().relationship.upsert({
      where: {
        creatorHandle_platform: {
          creatorHandle: input.creatorHandle,
          platform: input.platform,
        },
      },
      update: {
        // Boolean flags are cumulative: once true, never reset to false on upsert.
        ...(input.liked === true && { liked: true }),
        ...(input.commented === true && { commented: true }),
        ...(input.followed === true && { followed: true }),
        ...(input.replied === true && { replied: true }),
        ...(input.invited === true && { invited: true }),
        ...(input.collaboratorScore !== undefined && {
          collaboratorScore: input.collaboratorScore,
        }),
        ...(input.influencerId !== undefined && { influencerId: input.influencerId }),
      },
      create: {
        creatorHandle: input.creatorHandle,
        platform: input.platform,
        ...data,
      },
    });

    // Append new notes to existing (fetch-then-update) if provided AND record already existed.
    if (input.notes !== undefined && input.notes !== "") {
      const existing = await prisma().relationship.findUnique({
        where: { id: row.id },
      });
      // Only append if the row was updated (not just created) — i.e. notes differ from what we set.
      if (existing && existing.notes !== (input.notes ?? "")) {
        const merged = existing.notes.includes(input.notes)
          ? existing.notes  // already contains this note (idempotent)
          : existing.notes
          ? `${existing.notes}\n${input.notes}`
          : input.notes;
        const updated = await prisma().relationship.update({
          where: { id: row.id },
          data: { notes: merged },
        });
        return fromRelationship(updated);
      }
    }

    return fromRelationship(row);
  }
  const list = getMock().relationships;
  const existing = list.find(
    (r) => r.creatorHandle === input.creatorHandle && r.platform === input.platform,
  );
  if (existing) {
    // Merge: booleans are OR'd, notes are appended.
    if (input.liked === true) existing.liked = true;
    if (input.commented === true) existing.commented = true;
    if (input.followed === true) existing.followed = true;
    if (input.replied === true) existing.replied = true;
    if (input.invited === true) existing.invited = true;
    if (input.collaboratorScore !== undefined) existing.collaboratorScore = input.collaboratorScore;
    if (input.notes !== undefined && input.notes !== "") {
      existing.notes = existing.notes ? `${existing.notes}\n${input.notes}` : input.notes;
    }
    if (input.influencerId !== undefined) existing.influencerId = input.influencerId;
    existing.updatedAt = nowIso();
    return existing;
  }
  const rel: Relationship = {
    id: newId("rel"),
    creatorHandle: input.creatorHandle,
    platform: input.platform,
    liked: input.liked ?? false,
    commented: input.commented ?? false,
    followed: input.followed ?? false,
    replied: input.replied ?? false,
    invited: input.invited ?? false,
    collaboratorScore: input.collaboratorScore ?? 50,
    notes: input.notes ?? "",
    influencerId: input.influencerId ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  list.push(rel);
  return rel;
}

export async function updateRelationship(
  id: string,
  patch: Partial<Relationship>,
): Promise<Relationship | null> {
  if (!usingMock) {
    try {
      const row = await prisma().relationship.update({
        where: { id },
        data: {
          ...(patch.liked !== undefined && { liked: patch.liked }),
          ...(patch.commented !== undefined && { commented: patch.commented }),
          ...(patch.followed !== undefined && { followed: patch.followed }),
          ...(patch.replied !== undefined && { replied: patch.replied }),
          ...(patch.invited !== undefined && { invited: patch.invited }),
          ...(patch.collaboratorScore !== undefined && {
            collaboratorScore: patch.collaboratorScore,
          }),
          ...(patch.notes !== undefined && { notes: patch.notes }),
          ...(patch.influencerId !== undefined && { influencerId: patch.influencerId }),
        },
      });
      return fromRelationship(row);
    } catch {
      return null;
    }
  }
  const list = getMock().relationships;
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const prev = list[idx];
  list[idx] = { ...prev, ...patch, id, createdAt: prev.createdAt, updatedAt: nowIso() };
  return list[idx];
}

export async function deleteRelationship(id: string): Promise<boolean> {
  if (!usingMock) {
    try {
      await prisma().relationship.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }
  const list = getMock().relationships;
  const before = list.length;
  getMock().relationships = list.filter((r) => r.id !== id);
  return getMock().relationships.length < before;
}

// ---------------------------------------------------------------------------
// Daily action summary (backend-agnostic — composes the public list APIs)
// ---------------------------------------------------------------------------
//
// Buckets are guaranteed disjoint: a post in `topPostsToCommentOn` will not
// also appear in `conversationsToJoin`. `topPostsToCommentOn` is always
// backfilled to 5 (when at least 5 posts exist) by topping up with the
// next-best opportunity-scored posts.

export async function dailySummary(): Promise<{
  topPostsToCommentOn: Post[];
  influencersToFollow: Influencer[];
  conversationsToJoin: Post[];
  creatorToInvite: Influencer | null;
}> {
  const posts = await listPosts();
  const influencers = await listInfluencers();
  const relationships = await listRelationships();
  const followedHandles = new Set(
    relationships.filter((r) => r.followed).map((r) => `${r.platform}:${r.creatorHandle}`),
  );

  const preferredForComment = posts.filter(
    (p) => p.suggestedAction === "comment" || p.opportunityScore >= 70,
  );
  const seenIds = new Set<string>();
  const topPostsToCommentOn: Post[] = [];
  for (const p of preferredForComment) {
    if (topPostsToCommentOn.length >= 5) break;
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    topPostsToCommentOn.push(p);
  }
  for (const p of posts) {
    if (topPostsToCommentOn.length >= 5) break;
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    topPostsToCommentOn.push(p);
  }

  const influencersToFollow = influencers
    .filter((i) => !followedHandles.has(`${i.platform}:${i.handle}`))
    .slice(0, 3);

  const conversationsToJoin = posts
    .filter(
      (p) =>
        p.engagementVelocity >= 70 &&
        p.suggestedAction !== "comment" &&
        !seenIds.has(p.id),
    )
    .slice(0, 2);

  const creatorToInvite =
    influencers.find((i) => i.engagementTrend === "rising" && i.relevanceScore >= 80) ??
    influencers[0] ??
    null;

  return { topPostsToCommentOn, influencersToFollow, conversationsToJoin, creatorToInvite };
}
