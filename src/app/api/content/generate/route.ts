import { NextResponse } from "next/server";
import { generateContentPlan } from "@/lib/openai";
import { ContentFormats, ContentPlatforms } from "@/lib/types";
import type { ContentFormat, ContentPlatform } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { topic, platform, format, niche, audioIdea } = body ?? {};
    if (typeof topic !== "string" || topic.trim().length === 0) {
      return NextResponse.json({ error: "topic required" }, { status: 400 });
    }
    if (!(ContentPlatforms as readonly string[]).includes(platform)) {
      return NextResponse.json({ error: "platform must be instagram or tiktok" }, { status: 400 });
    }
    const fmt: ContentFormat = (ContentFormats as readonly string[]).includes(format)
      ? (format as ContentFormat)
      : "reel";
    const result = await generateContentPlan({
      topic: topic.slice(0, 300),
      platform: platform as ContentPlatform,
      format: fmt,
      niche: typeof niche === "string" ? niche.slice(0, 120) : undefined,
      audioIdea: typeof audioIdea === "string" ? audioIdea.slice(0, 200) : undefined,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}
