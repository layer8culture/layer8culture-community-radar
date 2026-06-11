import { NextResponse } from "next/server";
import { listInfluencers, listPosts } from "@/lib/store";
import type { SocialLink } from "@/lib/types";
import { profileUrlFor } from "@/lib/socialLinks";

export const dynamic = "force-dynamic";

export async function GET() {
  const [posts, influencers] = await Promise.all([listPosts(), listInfluencers()]);

  // Map (platform, handle) -> social links for the creator behind each post.
  // Lowercase handle so casing drift between Post.creatorHandle and
  // Influencer.handle doesn't drop the join.
  const linksByCreator = new Map<string, SocialLink[]>();
  for (const inf of influencers) {
    if (!inf.socialLinks || inf.socialLinks.length === 0) continue;
    linksByCreator.set(`${inf.platform}|${inf.handle.toLowerCase()}`, inf.socialLinks);
  }

  const enriched = posts.map((p) => {
    const harvested = linksByCreator.get(`${p.platform}|${p.creatorHandle.toLowerCase()}`) ?? [];

    // Always try to surface a profile link for the post's own platform (e.g.
    // an Instagram-platform post by @the.donville gets an instagram.com/...
    // chip), mirroring how harvested website / X links already appear.
    const derived = profileUrlFor(p.platform, p.creatorHandle);
    const hasOwnPlatformLink = harvested.some((l) => l.platform === p.platform);
    const links: SocialLink[] =
      derived && !hasOwnPlatformLink
        ? [{ platform: p.platform, url: derived }, ...harvested]
        : harvested;

    return links.length > 0 ? { ...p, creatorSocialLinks: links } : p;
  });

  return NextResponse.json({ posts: enriched });
}
