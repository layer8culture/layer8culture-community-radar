// Optional Prisma seed. Only runs if DATABASE_URL is configured.
// Run with: `npm run db:seed`
import { PrismaClient } from "@prisma/client";
import {
  buildSeedHashtags,
  buildSeedInfluencers,
  buildSeedPosts,
  buildSeedRelationships,
} from "../src/lib/mockData";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("DATABASE_URL not set — nothing to seed. App will use the in-memory mock store at runtime.");
    return;
  }
  const prisma = new PrismaClient();
  try {
    for (const i of buildSeedInfluencers()) {
      await prisma.influencer.upsert({
        where: { handle_platform: { handle: i.handle, platform: i.platform } },
        update: { niche: i.niche, followerCount: i.followerCount, postingFrequency: i.postingFrequency, engagementTrend: i.engagementTrend, relevanceScore: i.relevanceScore },
        create: { handle: i.handle, platform: i.platform, niche: i.niche, followerCount: i.followerCount, postingFrequency: i.postingFrequency, engagementTrend: i.engagementTrend, relevanceScore: i.relevanceScore },
      });
    }
    for (const t of buildSeedHashtags()) {
      await prisma.hashtag.upsert({
        where: { name_platform: { name: t.name, platform: t.platform } },
        update: { relevanceScore: t.relevanceScore },
        create: { name: t.name, platform: t.platform, relevanceScore: t.relevanceScore },
      });
    }
    // Posts have no natural unique key, so wipe and reseed to keep idempotent.
    await prisma.post.deleteMany({});
    for (const p of buildSeedPosts()) {
      await prisma.post.create({
        data: {
          content: p.content,
          creatorHandle: p.creatorHandle,
          platform: p.platform,
          engagementVelocity: p.engagementVelocity,
          relevanceScore: p.relevanceScore,
          opportunityScore: p.opportunityScore,
          suggestedAction: p.suggestedAction,
        },
      });
    }
    for (const r of buildSeedRelationships()) {
      await prisma.relationship.upsert({
        where: { creatorHandle_platform: { creatorHandle: r.creatorHandle, platform: r.platform } },
        update: { liked: r.liked, commented: r.commented, followed: r.followed, replied: r.replied, invited: r.invited, collaboratorScore: r.collaboratorScore, notes: r.notes },
        create: { creatorHandle: r.creatorHandle, platform: r.platform, liked: r.liked, commented: r.commented, followed: r.followed, replied: r.replied, invited: r.invited, collaboratorScore: r.collaboratorScore, notes: r.notes },
      });
    }
    console.log("✅ Seeded Supabase database.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
