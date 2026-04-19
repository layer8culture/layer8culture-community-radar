import type {
  Hashtag,
  Influencer,
  Platform,
  Post,
  Relationship,
} from "./types";
import { computeOpportunityScore, deriveSuggestedAction, freshnessFromDate } from "./scoring";

const SEED_HASHTAGS = [
  "buildinpublic",
  "vibecoding",
  "indiehackers",
  "webdev",
  "aiagents",
  "creatoreconomy",
  "livestreaming",
  "codingcommunity",
];

const SEED_INFLUENCERS: Array<Omit<Influencer, "id" | "socialLinks" | "createdAt" | "updatedAt">> = [
  { handle: "swyx", platform: "twitter", niche: "AI / DX", followerCount: 120000, postingFrequency: 25, engagementTrend: "rising", relevanceScore: 92 },
  { handle: "levelsio", platform: "twitter", niche: "indie hacking", followerCount: 510000, postingFrequency: 40, engagementTrend: "stable", relevanceScore: 88 },
  { handle: "theo", platform: "twitter", niche: "webdev / video", followerCount: 320000, postingFrequency: 35, engagementTrend: "rising", relevanceScore: 90 },
  { handle: "dan_abramov", platform: "twitter", niche: "react / OSS", followerCount: 450000, postingFrequency: 12, engagementTrend: "stable", relevanceScore: 80 },
  { handle: "fireship_dev", platform: "youtube", niche: "dev tutorials", followerCount: 3500000, postingFrequency: 3, engagementTrend: "rising", relevanceScore: 85 },
  { handle: "sahil", platform: "twitter", niche: "creator economy", followerCount: 180000, postingFrequency: 18, engagementTrend: "rising", relevanceScore: 87 },
  { handle: "rauchg", platform: "twitter", niche: "vercel / next", followerCount: 220000, postingFrequency: 14, engagementTrend: "stable", relevanceScore: 86 },
  { handle: "buildspace", platform: "youtube", niche: "creator coding", followerCount: 240000, postingFrequency: 4, engagementTrend: "rising", relevanceScore: 82 },
  { handle: "the.donville", platform: "instagram", niche: "creator coding", followerCount: 14000, postingFrequency: 8, engagementTrend: "rising", relevanceScore: 78 },
  { handle: "codingcafe", platform: "tiktok", niche: "live coding", followerCount: 89000, postingFrequency: 21, engagementTrend: "rising", relevanceScore: 75 },
];

const SEED_POSTS_RAW: Array<{ content: string; creatorHandle: string; platform: Platform; engagementVelocity: number; relevanceScore: number; ageHours: number }> = [
  { content: "Just shipped my AI agent that auto-replies to my DMs. Game changer for the creator workflow.", creatorHandle: "swyx", platform: "twitter", engagementVelocity: 92, relevanceScore: 95, ageHours: 2 },
  { content: "Live coding right now — building a Twitch chat moderator with GPT-4o. Come hang.", creatorHandle: "theo", platform: "twitter", engagementVelocity: 88, relevanceScore: 90, ageHours: 1 },
  { content: "Hot take: building in public is the highest leverage marketing channel for indie devs in 2026.", creatorHandle: "levelsio", platform: "twitter", engagementVelocity: 75, relevanceScore: 92, ageHours: 6 },
  { content: "We just hit 100 stars on the OSS livestream toolkit. Wild seeing the community pile in.", creatorHandle: "buildspace", platform: "youtube", engagementVelocity: 70, relevanceScore: 85, ageHours: 18 },
  { content: "Anyone else feel like the creator economy is splitting into two: technical builders vs. talkers?", creatorHandle: "sahil", platform: "twitter", engagementVelocity: 80, relevanceScore: 87, ageHours: 4 },
  { content: "New video: Edge functions in 100 seconds. AI workloads are about to get weird.", creatorHandle: "fireship_dev", platform: "youtube", engagementVelocity: 95, relevanceScore: 80, ageHours: 12 },
  { content: "Trying out vibe coding for the first time — pair programming with Claude feels like a co-founder.", creatorHandle: "rauchg", platform: "twitter", engagementVelocity: 60, relevanceScore: 88, ageHours: 8 },
  { content: "Day 30 of #buildinpublic — first paying customer for my AI scheduling tool. Tears.", creatorHandle: "the.donville", platform: "instagram", engagementVelocity: 55, relevanceScore: 78, ageHours: 5 },
  { content: "POV: you spend 3 hours debugging a CSS issue and the fix is `display: flex`. We have all been here.", creatorHandle: "codingcafe", platform: "tiktok", engagementVelocity: 65, relevanceScore: 60, ageHours: 22 },
  { content: "React 19 is finally landing in stable. The compiler changes everything for perf.", creatorHandle: "dan_abramov", platform: "twitter", engagementVelocity: 72, relevanceScore: 70, ageHours: 30 },
  { content: "What's your favorite open-source AI agent framework right now? I keep flipping between three.", creatorHandle: "swyx", platform: "twitter", engagementVelocity: 50, relevanceScore: 89, ageHours: 14 },
  { content: "Just streamed a 4-hour pair-coding session with a viewer. The community-as-collaborator era is real.", creatorHandle: "the.donville", platform: "instagram", engagementVelocity: 68, relevanceScore: 91, ageHours: 3 },
];

export function buildSeedInfluencers(): Influencer[] {
  const now = new Date().toISOString();
  return SEED_INFLUENCERS.map((i, idx) => ({
    ...i,
    id: `seed-inf-${idx + 1}`,
    socialLinks: [],
    createdAt: now,
    updatedAt: now,
  }));
}

export function buildSeedHashtags(): Hashtag[] {
  const now = new Date().toISOString();
  const hashtags: Hashtag[] = [];
  let idx = 0;
  for (const name of SEED_HASHTAGS) {
    hashtags.push({
      id: `seed-tag-${idx++}`,
      name,
      platform: "twitter",
      relevanceScore: 60 + Math.floor(Math.random() * 35),
      lastCheckedAt: now,
      createdAt: now,
    });
  }
  return hashtags;
}

export function buildSeedPosts(): Post[] {
  const now = Date.now();
  return SEED_POSTS_RAW.map((p, idx) => {
    const createdAt = new Date(now - p.ageHours * 36e5).toISOString();
    const opportunityScore = computeOpportunityScore({
      relevanceScore: p.relevanceScore,
      engagementVelocity: p.engagementVelocity,
      freshness: freshnessFromDate(createdAt),
    });
    const post: Post = {
      id: `seed-post-${idx + 1}`,
      content: p.content,
      creatorHandle: p.creatorHandle,
      platform: p.platform,
      engagementVelocity: p.engagementVelocity,
      relevanceScore: p.relevanceScore,
      opportunityScore,
      suggestedAction: "like",
      createdAt,
    };
    post.suggestedAction = deriveSuggestedAction(post);
    return post;
  });
}

export function buildSeedRelationships(): Relationship[] {
  const now = new Date().toISOString();
  return SEED_INFLUENCERS.slice(0, 5).map((i, idx) => ({
    id: `seed-rel-${idx + 1}`,
    creatorHandle: i.handle,
    platform: i.platform,
    liked: idx < 3,
    commented: idx < 2,
    followed: idx < 4,
    replied: idx < 1,
    invited: false,
    collaboratorScore: 60 + idx * 5,
    notes: idx === 0 ? "DM'd about a potential collab on a livestream series." : "",
    influencerId: null,
    createdAt: now,
    updatedAt: now,
  }));
}
