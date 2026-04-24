import { NextResponse } from "next/server";
import { listPosts } from "@/lib/store";

export const dynamic = process.env.NEXT_PUBLIC_STATIC_EXPORT === "true" ? "auto" : "force-dynamic";

export async function GET() {
  return NextResponse.json({ posts: await listPosts() });
}
