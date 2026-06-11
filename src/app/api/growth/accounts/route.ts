import { NextResponse } from "next/server";
import { createAccount, listAccounts } from "@/lib/store";
import { ContentPlatforms } from "@/lib/types";
import type { ContentPlatform } from "@/lib/types";

export const dynamic = "force-dynamic";

function clampInt(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function GET() {
  return NextResponse.json({ accounts: await listAccounts() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!(ContentPlatforms as readonly string[]).includes(body?.platform)) {
      return NextResponse.json({ error: "platform must be instagram or tiktok" }, { status: 400 });
    }
    if (typeof body?.handle !== "string" || body.handle.trim().length === 0) {
      return NextResponse.json({ error: "handle required" }, { status: 400 });
    }
    const account = await createAccount({
      platform: body.platform as ContentPlatform,
      handle: String(body.handle).slice(0, 100),
      displayName: typeof body.displayName === "string" ? body.displayName.slice(0, 200) : "",
      followers: clampInt(body.followers, 0, 1_000_000_000) ?? 0,
    });
    return NextResponse.json({ account }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
