import { NextResponse } from "next/server";
import { buildSeedHashtags } from "@/lib/mockData";
import { deleteHashtag } from "@/lib/store";

export const dynamic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "auto" : "force-dynamic";

export function generateStaticParams() {
  return buildSeedHashtags().map((hashtag) => ({ id: hashtag.id }));
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const ok = await deleteHashtag(params.id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
