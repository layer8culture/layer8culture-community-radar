import { NextResponse } from "next/server";
import { createContentIdea, listContentIdeas } from "@/lib/store";
import { ContentFormats, ContentPlatforms, ContentStatuses } from "@/lib/types";
import type { ContentFormat, ContentPlatform, ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function strArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => (x as string).trim().slice(0, 300))
    .slice(0, max);
}

export async function GET() {
  return NextResponse.json({ ideas: await listContentIdeas() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.topic !== "string" || body.topic.trim().length === 0) {
      return NextResponse.json({ error: "topic required" }, { status: 400 });
    }
    if (!(ContentPlatforms as readonly string[]).includes(body.platform)) {
      return NextResponse.json({ error: "platform must be instagram or tiktok" }, { status: 400 });
    }
    const format: ContentFormat = (ContentFormats as readonly string[]).includes(body.format)
      ? (body.format as ContentFormat)
      : "reel";
    const status: ContentStatus = (ContentStatuses as readonly string[]).includes(body.status)
      ? (body.status as ContentStatus)
      : "idea";
    const idea = await createContentIdea({
      topic: String(body.topic).slice(0, 300),
      platform: body.platform as ContentPlatform,
      format,
      hook: typeof body.hook === "string" ? body.hook.slice(0, 500) : "",
      hooks: strArray(body.hooks, 6),
      scriptBeats: strArray(body.scriptBeats, 10),
      caption: typeof body.caption === "string" ? body.caption.slice(0, 3000) : "",
      firstComment: typeof body.firstComment === "string" ? body.firstComment.slice(0, 1000) : "",
      hashtags: strArray(body.hashtags, 15).map((h) => h.replace(/^#/, "")),
      audioIdea: typeof body.audioIdea === "string" ? body.audioIdea.slice(0, 500) : "",
      cta: typeof body.cta === "string" ? body.cta.slice(0, 300) : "",
      status,
      scheduledFor: typeof body.scheduledFor === "string" ? body.scheduledFor : null,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 3000) : "",
    });
    return NextResponse.json({ idea }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
