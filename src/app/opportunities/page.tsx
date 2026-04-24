"use client";

import { useEffect, useMemo, useState } from "react";
import { OpportunityCard } from "@/components/OpportunityCard";
import { PageHeader, EmptyState } from "@/components/ui/Primitives";
import type { Post } from "@/lib/types";
import { Platforms } from "@/lib/types";

interface RefreshReport {
  ok: boolean;
  durationMs: number;
  perHashtag: Array<{ hashtag: string; platform: string; fetched: number; error?: string }>;
  totals: { fetched: number; influencersUpserted: number };
  skipped: Array<{ hashtag: string; platform: string; reason: string }>;
}

export default function OpportunityFeedPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("all");
  const [minScore, setMinScore] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState<RefreshReport | null>(null);

  async function loadPosts() {
    const r = await fetch("/api/opportunities");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    setPosts(d.posts);
  }

  useEffect(() => {
    let cancelled = false;
    loadPosts().catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  async function refresh() {
    setRefreshing(true);
    setError(null);
    setReport(null);
    try {
      const r = await fetch("/api/refresh", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setReport(data);
      await loadPosts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    if (!posts) return null;
    return posts
      .filter((p) => platform === "all" || p.platform === platform)
      .filter((p) => p.opportunityScore >= minScore);
  }, [posts, platform, minScore]);

  return (
    <div>
      <PageHeader
        title="Opportunity Feed"
        subtitle="Posts ranked by opportunity score. Generate authentic comments inline."
        action={
          <button onClick={refresh} disabled={refreshing} className="btn-primary text-xs">
            {refreshing ? "Refreshing…" : "↻ Refresh now"}
          </button>
        }
      />

      {report && (
        <div className="card p-3 mb-4 text-xs space-y-1">
          <div className="text-text-secondary">
            Fetched <span className="text-text-primary font-mono">{report.totals.fetched}</span> posts
            in <span className="font-mono">{report.durationMs}ms</span>, discovered{" "}
            <span className="font-mono">{report.totals.influencersUpserted}</span> creators.
          </div>
          {report.perHashtag.some((h) => h.error) && (
            <ul className="text-red-300 space-y-0.5">
              {report.perHashtag
                .filter((h) => h.error)
                .map((h) => (
                  <li key={`${h.platform}-${h.hashtag}`}>
                    {h.platform}/{h.hashtag}: {h.error}
                  </li>
                ))}
            </ul>
          )}
          {report.skipped.length > 0 && (
            <ul className="text-text-muted space-y-0.5">
              {report.skipped.map((s) => (
                <li key={`${s.platform}-${s.hashtag}`}>
                  skipped {s.platform}/{s.hashtag} — {s.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card p-3 mb-6 flex flex-wrap items-center gap-3">
        <label className="text-xs text-text-secondary">
          Platform
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="input ml-2 inline-block w-auto py-1"
          >
            <option value="all">All</option>
            {Platforms.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-text-secondary flex items-center gap-2">
          Min score: <span className="font-mono text-text-primary">{minScore}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="accent-accent-bright"
          />
        </label>
        <div className="ml-auto text-xs text-text-muted">
          {filtered ? `${filtered.length} posts` : ""}
        </div>
      </div>

      {error && (
        <div className="card p-4 text-red-300 text-sm border-red-500/30">{error}</div>
      )}

      {!posts && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-48 animate-pulse bg-bg-elevated/40" />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && <EmptyState message="No posts match these filters." />}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((p) => (
            <OpportunityCard key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
