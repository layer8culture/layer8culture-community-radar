import { NextResponse } from "next/server";
import { createInfluencer, listInfluencers } from "@/lib/store";
import { Platforms, EngagementTrends } from "@/lib/types";

export const dynamic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "auto" : "force-dynamic";

export async function GET() {
  const data = await listInfluencers();
  return NextResponse.json({ influencers: data });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.handle || !body?.platform || !Platforms.includes(body.platform)) {
      return NextResponse.json({ error: "handle and valid platform required" }, { status: 400 });
    }
    const trend = EngagementTrends.includes(body.engagementTrend) ? body.engagementTrend : "stable";
    const created = await createInfluencer({
      handle: String(body.handle).replace(/^@/, ""),
      platform: body.platform,
      niche: String(body.niche ?? ""),
      followerCount: Number(body.followerCount ?? 0),
      postingFrequency: Number(body.postingFrequency ?? 0),
      engagementTrend: trend,
      relevanceScore: clamp(Number(body.relevanceScore ?? 50)),
      socialLinks: [],
    });
    return NextResponse.json({ influencer: created }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}

function clamp(n: number) {
  if (Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}
