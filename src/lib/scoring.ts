// Opportunity score = relevance(40%) + engagement velocity(30%) + freshness(30%).
// Freshness is decayed from createdAt; if not provided we mock it.

import type { Post, SuggestedAction } from "./types";

export function freshnessFromDate(createdAt: string | Date): number {
  const ts = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  const ageHours = Math.max(0, (Date.now() - ts) / 36e5);
  // Decays: 100 at t=0, ~50 at 24h, ~10 by 96h.
  const score = 100 * Math.exp(-ageHours / 30);
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function computeOpportunityScore(args: {
  relevanceScore: number;
  engagementVelocity: number;
  freshness?: number;
}): number {
  const freshness = args.freshness ?? Math.floor(Math.random() * 100);
  const score =
    args.relevanceScore * 0.4 + args.engagementVelocity * 0.3 + freshness * 0.3;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function deriveSuggestedAction(p: Pick<Post, "opportunityScore" | "engagementVelocity">): SuggestedAction {
  if (p.opportunityScore >= 85) return "comment";
  if (p.opportunityScore >= 70) return "repost";
  if (p.engagementVelocity >= 70) return "follow";
  if (p.opportunityScore >= 55) return "like";
  return "like";
}
