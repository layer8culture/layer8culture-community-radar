import { NextResponse } from "next/server";
import { createHashtag, listHashtags } from "@/lib/store";
import { Platforms } from "@/lib/types";

export const dynamic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "auto" : "force-dynamic";

export async function GET() {
  return NextResponse.json({ hashtags: await listHashtags() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const platform = Platforms.includes(body.platform) ? body.platform : "twitter";
    const tag = await createHashtag({
      name: String(body.name),
      platform,
      relevanceScore: typeof body.relevanceScore === "number" ? body.relevanceScore : undefined,
    });
    return NextResponse.json({ hashtag: tag }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
