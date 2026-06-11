import { NextResponse } from "next/server";
import { createTrend, listTrends } from "@/lib/store";
import { ContentPlatforms, TrendMomentums, TrendTypes } from "@/lib/types";
import type { ContentPlatform, TrendMomentum, TrendType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ trends: await listTrends() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(ContentPlatforms as readonly string[]).includes(body?.platform)) {
      return NextResponse.json({ error: "platform must be instagram or tiktok" }, { status: 400 });
    }
    if (!(TrendTypes as readonly string[]).includes(body?.type)) {
      return NextResponse.json({ error: "valid type required (sound|format|hashtag|topic)" }, { status: 400 });
    }
    if (typeof body?.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const momentum: TrendMomentum = (TrendMomentums as readonly string[]).includes(body.momentum)
      ? (body.momentum as TrendMomentum)
      : "rising";
    const trend = await createTrend({
      platform: body.platform as ContentPlatform,
      type: body.type as TrendType,
      title: String(body.title).slice(0, 200),
      description: typeof body.description === "string" ? body.description.slice(0, 1000) : "",
      momentum,
      exampleUrl: typeof body.exampleUrl === "string" && body.exampleUrl.trim() ? body.exampleUrl.trim().slice(0, 2048) : null,
    });
    return NextResponse.json({ trend }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
