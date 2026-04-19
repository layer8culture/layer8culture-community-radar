import { NextResponse } from "next/server";
import { deleteInfluencer, getInfluencer, updateInfluencer } from "@/lib/store";
import { sanitizeInfluencerPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const inf = await getInfluencer(params.id);
  if (!inf) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ influencer: inf });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { patch, rejected } = sanitizeInfluencerPatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no valid fields", rejected }, { status: 400 });
    }
    const updated = await updateInfluencer(params.id, patch);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ influencer: updated, rejected });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteInfluencer(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
