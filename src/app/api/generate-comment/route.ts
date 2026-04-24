import { NextResponse } from "next/server";
import { generateComments } from "@/lib/openai";
import { Platforms } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "auto" : "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { postContent, creatorName, platform } = body ?? {};
    if (typeof postContent !== "string" || postContent.trim().length === 0) {
      return NextResponse.json({ error: "postContent required" }, { status: 400 });
    }
    if (typeof creatorName !== "string" || creatorName.trim().length === 0) {
      return NextResponse.json({ error: "creatorName required" }, { status: 400 });
    }
    if (!Platforms.includes(platform)) {
      return NextResponse.json({ error: "valid platform required" }, { status: 400 });
    }
    const result = await generateComments({
      postContent: postContent.slice(0, 2000),
      creatorName: creatorName.slice(0, 100),
      platform,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "internal error" },
      { status: 500 },
    );
  }
}
