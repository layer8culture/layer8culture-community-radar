import { NextResponse } from "next/server";
import { createMyPost, listMyPosts } from "@/lib/store";
import { ContentFormats, ContentPlatforms } from "@/lib/types";
import type { ContentFormat, ContentPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";

function clampInt(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  return NextResponse.json({ posts: await listMyPosts(accountId) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.accountId !== "string" || body.accountId.length === 0) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }
    if (!(ContentPlatforms as readonly string[]).includes(body?.platform)) {
      return NextResponse.json({ error: "platform must be instagram or tiktok" }, { status: 400 });
    }
    if (typeof body?.title !== "string" || body.title.trim().length === 0) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }
    const format: ContentFormat = (ContentFormats as readonly string[]).includes(body.format)
      ? (body.format as ContentFormat)
      : "reel";
    const post = await createMyPost({
      accountId: body.accountId,
      platform: body.platform as ContentPlatform,
      title: String(body.title).slice(0, 300),
      format,
      postedAt: typeof body.postedAt === "string" ? body.postedAt : undefined,
      reach: clampInt(body.reach, 0, 10_000_000_000) ?? 0,
      likes: clampInt(body.likes, 0, 10_000_000_000) ?? 0,
      comments: clampInt(body.comments, 0, 10_000_000_000) ?? 0,
      shares: clampInt(body.shares, 0, 10_000_000_000) ?? 0,
      saves: clampInt(body.saves, 0, 10_000_000_000) ?? 0,
      follows: clampInt(body.follows, 0, 10_000_000_000) ?? 0,
    });
    return NextResponse.json({ post }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
