import { NextResponse } from "next/server";
import { deleteRelationship, updateRelationship } from "@/lib/store";
import { sanitizeRelationshipPatch } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { patch, rejected } = sanitizeRelationshipPatch(body);
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no valid fields", rejected }, { status: 400 });
    }
    const updated = await updateRelationship(params.id, patch);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ relationship: updated, rejected });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteRelationship(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
