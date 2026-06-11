import { NextResponse } from "next/server";
import { createSnapshot, listSnapshots } from "@/lib/store";

export const dynamic = "force-dynamic";

function clampInt(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("accountId") ?? undefined;
  return NextResponse.json({ snapshots: await listSnapshots(accountId) });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (typeof body?.accountId !== "string" || body.accountId.length === 0) {
      return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }
    const followers = clampInt(body.followers, 0, 1_000_000_000);
    if (followers === undefined) {
      return NextResponse.json({ error: "followers required" }, { status: 400 });
    }
    const snapshot = await createSnapshot({
      accountId: body.accountId,
      date: typeof body.date === "string" ? body.date : undefined,
      followers,
      reach: clampInt(body.reach, 0, 10_000_000_000) ?? 0,
      profileViews: clampInt(body.profileViews, 0, 10_000_000_000) ?? 0,
    });
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
