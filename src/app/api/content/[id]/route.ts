import { NextResponse } from "next/server";
import { deleteContentIdea, updateContentIdea } from "@/lib/store";
import { ContentStatuses } from "@/lib/types";
import type { ContentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    if (typeof body?.status === "string" && (ContentStatuses as readonly string[]).includes(body.status)) {
      patch.status = body.status as ContentStatus;
    }
    if (typeof body?.notes === "string") patch.notes = body.notes.slice(0, 3000);
    if (typeof body?.caption === "string") patch.caption = body.caption.slice(0, 3000);
    if (typeof body?.hook === "string") patch.hook = body.hook.slice(0, 500);
    if (body?.scheduledFor === null || typeof body?.scheduledFor === "string") {
      patch.scheduledFor = body.scheduledFor;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "no valid fields" }, { status: 400 });
    }
    const updated = await updateContentIdea(params.id, patch);
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ idea: updated });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteContentIdea(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
