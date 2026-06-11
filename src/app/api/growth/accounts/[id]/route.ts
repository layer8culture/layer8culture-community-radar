import { NextResponse } from "next/server";
import { deleteAccount, updateAccount } from "@/lib/store";

export const dynamic = "force-dynamic";

function clampInt(v: unknown, min: number, max: number): number | undefined {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const patch: { displayName?: string; followers?: number } = {};
    if (typeof body?.displayName === "string") patch.displayName = body.displayName.slice(0, 200);
    const f = clampInt(body?.followers, 0, 1_000_000_000);
    if (f !== undefined) patch.followers = f;
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });
    }
    const updated = await updateAccount(params.id, patch);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ account: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteAccount(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
