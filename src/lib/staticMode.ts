"use client";

import {
  buildSeedHashtags,
  buildSeedInfluencers,
  buildSeedPosts,
  buildSeedRelationships,
} from "./mockData";
import type {
  CommentSuggestion,
  CommentSource,
} from "./openai";
import type {
  EngagementTrend,
  Hashtag,
  Influencer,
  Platform,
  Post,
  Relationship,
  SuggestedAction,
} from "./types";

export const isStaticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

const STORAGE_KEY = "community-radar-static-state-v1";

interface StaticState {
  influencers: Influencer[];
  hashtags: Hashtag[];
  posts: Post[];
  relationships: Relationship[];
}

type InfluencerInput = {
  handle: string;
  platform: Platform;
  niche: string;
  followerCount: number;
  postingFrequency: number;
  engagementTrend: EngagementTrend;
  relevanceScore: number;
};

function createSeedState(): StaticState {
  return {
    influencers: buildSeedInfluencers(),
    hashtags: buildSeedHashtags(),
    posts: buildSeedPosts(),
    relationships: buildSeedRelationships(),
  };
}

function readState(): StaticState {
  if (typeof window === "undefined") return createSeedState();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = createSeedState();
    writeState(seeded);
    return seeded;
  }

  try {
    return JSON.parse(raw) as StaticState;
  } catch (error) {
    console.warn("Resetting invalid Community Radar static state:", error);
    const seeded = createSeedState();
    writeState(seeded);
    return seeded;
  }
}

function writeState(state: StaticState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function byScoreDesc<T extends { relevanceScore: number }>(a: T, b: T): number {
  return b.relevanceScore - a.relevanceScore;
}

export async function listStaticInfluencers(): Promise<Influencer[]> {
  return [...readState().influencers].sort(byScoreDesc);
}

export async function getStaticInfluencer(id: string): Promise<Influencer | null> {
  return readState().influencers.find((i) => i.id === id) ?? null;
}

export async function createStaticInfluencer(input: InfluencerInput): Promise<Influencer> {
  const state = readState();
  const now = nowIso();
  const influencer: Influencer = {
    ...input,
    id: newId("inf"),
    socialLinks: [],
    createdAt: now,
    updatedAt: now,
  };
  state.influencers.push(influencer);
  writeState(state);
  return influencer;
}

export async function updateStaticInfluencer(
  id: string,
  patch: InfluencerInput,
): Promise<Influencer | null> {
  const state = readState();
  const index = state.influencers.findIndex((i) => i.id === id);
  if (index === -1) return null;

  const previous = state.influencers[index];
  const influencer: Influencer = {
    ...previous,
    ...patch,
    id,
    socialLinks: previous.socialLinks,
    createdAt: previous.createdAt,
    updatedAt: nowIso(),
  };
  state.influencers[index] = influencer;
  writeState(state);
  return influencer;
}

export async function deleteStaticInfluencer(id: string): Promise<boolean> {
  const state = readState();
  const before = state.influencers.length;
  state.influencers = state.influencers.filter((i) => i.id !== id);
  writeState(state);
  return state.influencers.length < before;
}

export async function listStaticPosts(): Promise<Post[]> {
  return [...readState().posts].sort((a, b) => b.opportunityScore - a.opportunityScore);
}

export async function listStaticHashtags(): Promise<Hashtag[]> {
  return [...readState().hashtags].sort(byScoreDesc);
}

export async function createStaticHashtag(input: {
  name: string;
  platform: Platform;
}): Promise<Hashtag> {
  const state = readState();
  const now = nowIso();
  const hashtag: Hashtag = {
    id: newId("tag"),
    name: input.name.replace(/^#/, ""),
    platform: input.platform,
    relevanceScore: 60,
    lastCheckedAt: now,
    createdAt: now,
  };
  state.hashtags.push(hashtag);
  writeState(state);
  return hashtag;
}

export async function deleteStaticHashtag(id: string): Promise<boolean> {
  const state = readState();
  const before = state.hashtags.length;
  state.hashtags = state.hashtags.filter((h) => h.id !== id);
  writeState(state);
  return state.hashtags.length < before;
}

export async function listStaticRelationships(): Promise<Relationship[]> {
  return [...readState().relationships].sort((a, b) => b.collaboratorScore - a.collaboratorScore);
}

export async function upsertStaticRelationship(input: {
  creatorHandle: string;
  platform: Platform;
  liked?: boolean;
  commented?: boolean;
  followed?: boolean;
  replied?: boolean;
  invited?: boolean;
  notes?: string;
}): Promise<Relationship> {
  const state = readState();
  const existing = state.relationships.find(
    (r) => r.creatorHandle === input.creatorHandle && r.platform === input.platform,
  );

  if (existing) {
    existing.liked = existing.liked || input.liked === true;
    existing.commented = existing.commented || input.commented === true;
    existing.followed = existing.followed || input.followed === true;
    existing.replied = existing.replied || input.replied === true;
    existing.invited = existing.invited || input.invited === true;
    if (input.notes) {
      existing.notes = existing.notes ? `${existing.notes}\n${input.notes}` : input.notes;
    }
    existing.updatedAt = nowIso();
    writeState(state);
    return existing;
  }

  const now = nowIso();
  const relationship: Relationship = {
    id: newId("rel"),
    creatorHandle: input.creatorHandle,
    platform: input.platform,
    liked: input.liked ?? false,
    commented: input.commented ?? false,
    followed: input.followed ?? false,
    replied: input.replied ?? false,
    invited: input.invited ?? false,
    collaboratorScore: 50,
    notes: input.notes ?? "",
    influencerId: null,
    createdAt: now,
    updatedAt: now,
  };
  state.relationships.push(relationship);
  writeState(state);
  return relationship;
}

export async function updateStaticRelationship(
  id: string,
  patch: Partial<Relationship>,
): Promise<Relationship | null> {
  const state = readState();
  const index = state.relationships.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const previous = state.relationships[index];
  const relationship: Relationship = {
    ...previous,
    ...patch,
    id,
    createdAt: previous.createdAt,
    updatedAt: nowIso(),
  };
  state.relationships[index] = relationship;
  writeState(state);
  return relationship;
}

export async function staticDailySummary(): Promise<{
  topPostsToCommentOn: Post[];
  influencersToFollow: Influencer[];
  conversationsToJoin: Post[];
  creatorToInvite: Influencer | null;
}> {
  const posts = await listStaticPosts();
  const influencers = await listStaticInfluencers();
  const relationships = await listStaticRelationships();
  const followedHandles = new Set(
    relationships.filter((r) => r.followed).map((r) => `${r.platform}:${r.creatorHandle}`),
  );

  const seenIds = new Set<string>();
  const topPostsToCommentOn: Post[] = [];
  for (const post of posts.filter((p) => p.suggestedAction === "comment" || p.opportunityScore >= 70)) {
    if (topPostsToCommentOn.length >= 5) break;
    seenIds.add(post.id);
    topPostsToCommentOn.push(post);
  }

  const conversationsToJoin = posts
    .filter((p) => p.engagementVelocity >= 70 && p.suggestedAction !== "comment" && !seenIds.has(p.id))
    .slice(0, 2);

  return {
    topPostsToCommentOn,
    influencersToFollow: influencers
      .filter((i) => !followedHandles.has(`${i.platform}:${i.handle}`))
      .slice(0, 3),
    conversationsToJoin,
    creatorToInvite:
      influencers.find((i) => i.engagementTrend === "rising" && i.relevanceScore >= 80) ??
      influencers[0] ??
      null,
  };
}

export async function generateStaticComments(input: {
  postContent: string;
  creatorName: string;
  platform: Platform;
}): Promise<{ source: CommentSource; comments: CommentSuggestion[] }> {
  const snippet = input.postContent.replace(/\s+/g, " ").trim().slice(0, 70);
  const suffix = snippet.length === 70 ? "..." : "";
  const handle = input.creatorName.replace(/^@/, "");

  return {
    source: "fallback",
    comments: [
      {
        tone: "insightful",
        text: `The angle on "${snippet}${suffix}" is the part most people miss - what has been the unexpected second-order effect for you, ${handle}?`,
      },
      {
        tone: "encouraging",
        text: `Watching this in real time is the reason I am on ${input.platform}. Keep posting the messy middle, because that is where the value is.`,
      },
      {
        tone: "builder-to-builder",
        text: "Shipped something similar recently and hit the same wall. Did you go all-in on the simpler approach or layer it on top of what you already had?",
      },
      {
        tone: "community-oriented",
        text: "Sharing this with the Layer8Culture builders - the conversation in the replies is going to be useful for anyone in the trenches on this.",
      },
    ],
  };
}
