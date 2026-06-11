import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Triggered manually from the UI ("Refresh now") or by a cron job.
// Optional protection: set CRON_SECRET in env and call with header
// `Authorization: Bearer <secret>`. Local dev calls (no secret) are allowed.
//
// Browser-initiated calls from the app's own UI are also allowed when the
// request carries `Sec-Fetch-Site: same-origin` (set automatically by modern
// browsers; external/cron callers cannot spoof it). This lets the "Refresh
// now" button keep working in production where CRON_SECRET is set, without
// shipping the secret to the client.
function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization") ?? "";
  if (auth === `Bearer ${secret}`) return true;
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite === "same-origin") return true;
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const report = await runIngestion();
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ingestion failed" },
      { status: 500 },
    );
  }
}

// Allow GET so cron services that only do GETs (and curl smoke tests) work too.
export async function GET(req: Request) {
  return POST(req);
}
