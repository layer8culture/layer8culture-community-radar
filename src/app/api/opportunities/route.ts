import { NextResponse } from "next/server";
import { listPosts } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ posts: await listPosts() });
}
