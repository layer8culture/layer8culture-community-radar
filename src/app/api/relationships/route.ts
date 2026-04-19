import { NextResponse } from "next/server";
import { listRelationships, upsertRelationship } from "@/lib/store";
import { Platforms } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ relationships: await listRelationships() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.creatorHandle || !Platforms.includes(body.platform)) {
      return NextResponse.json({ error: "creatorHandle and valid platform required" }, { status: 400 });
    }
    const rel = await upsertRelationship({
      creatorHandle: String(body.creatorHandle).replace(/^@/, ""),
      platform: body.platform,
      liked: !!body.liked,
      commented: !!body.commented,
      followed: !!body.followed,
      replied: !!body.replied,
      invited: !!body.invited,
      collaboratorScore: typeof body.collaboratorScore === "number" ? body.collaboratorScore : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      influencerId: body.influencerId ?? null,
    });
    return NextResponse.json({ relationship: rel }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "bad request" }, { status: 400 });
  }
}
