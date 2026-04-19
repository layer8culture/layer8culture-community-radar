// Shared domain types. Mirror Prisma enums so the app compiles and runs even
// when the Prisma client is not generated yet (no DATABASE_URL configured).

export const Platforms = ["twitter", "instagram", "youtube", "tiktok", "reddit"] as const;
export type Platform = (typeof Platforms)[number];

export const EngagementTrends = ["rising", "stable", "declining"] as const;
export type EngagementTrend = (typeof EngagementTrends)[number];

export const SuggestedActions = [
  "like",
  "comment",
  "repost",
  "follow",
  "dm",
  "invite",
] as const;
export type SuggestedAction = (typeof SuggestedActions)[number];

export interface SocialLink {
  platform: string; // "youtube" | "twitter" | "instagram" | ... | "website"
  url: string;
  label?: string; // optional display label (e.g. handle)
}

export interface Influencer {
  id: string;
  handle: string;
  platform: Platform;
  niche: string;
  followerCount: number;
  postingFrequency: number;
  engagementTrend: EngagementTrend;
  relevanceScore: number;
  socialLinks: SocialLink[];
  createdAt: string;
  updatedAt: string;
}

export interface Hashtag {
  id: string;
  name: string;
  platform: Platform;
  relevanceScore: number;
  lastCheckedAt: string;
  createdAt: string;
}

export interface Post {
  id: string;
  content: string;
  creatorHandle: string;
  platform: Platform;
  engagementVelocity: number;
  relevanceScore: number;
  opportunityScore: number;
  suggestedAction: SuggestedAction;
  createdAt: string;
  url?: string;
  sourceHashtag?: string;
}

export interface Relationship {
  id: string;
  creatorHandle: string;
  platform: Platform;
  liked: boolean;
  commented: boolean;
  followed: boolean;
  replied: boolean;
  invited: boolean;
  collaboratorScore: number;
  notes: string;
  influencerId: string | null;
  createdAt: string;
  updatedAt: string;
}
