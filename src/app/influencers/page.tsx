"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState, PlatformBadge, TrendBadge, ScoreBar } from "@/components/ui/Primitives";
import { InfluencerForm } from "@/components/InfluencerForm";
import { SocialLinks } from "@/components/SocialLinks";
import { isStaticExport, listStaticInfluencers } from "@/lib/staticMode";
import type { Influencer } from "@/lib/types";
import { Platforms } from "@/lib/types";

type SortKey = "relevanceScore" | "followerCount" | "postingFrequency" | "handle";

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [platform, setPlatform] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("relevanceScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  async function load() {
    setError(null);
    try {
      if (isStaticExport) {
        setInfluencers(await listStaticInfluencers());
        return;
      }

      const r = await fetch("/api/influencers");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setInfluencers(d.influencers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!influencers) return null;
    const q = search.trim().toLowerCase();
    const filteredList = influencers
      .filter((i) => platform === "all" || i.platform === platform)
      .filter((i) => !q || i.handle.toLowerCase().includes(q) || i.niche.toLowerCase().includes(q));
    const sorted = [...filteredList].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [influencers, platform, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <PageHeader
        title="Influencers"
        subtitle="Track creators, niches, and engagement trends."
        action={
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            {showForm ? "Cancel" : "+ Add influencer"}
          </button>
        }
      />

      {showForm && (
        <div className="mb-6">
          <InfluencerForm
            onSaved={() => {
              setShowForm(false);
              load();
            }}
          />
        </div>
      )}

      <div className="card p-3 mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search handle or niche…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All platforms</option>
          {Platforms.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <div className="ml-auto text-xs text-text-muted">{filtered ? `${filtered.length} influencers` : ""}</div>
      </div>

      {error && <div className="card p-4 text-red-300 text-sm border-red-500/30 mb-4">{error}</div>}

      {!influencers && !error && (
        <div className="card p-12 text-center text-text-muted">Loading…</div>
      )}

      {filtered && filtered.length === 0 && <EmptyState message="No influencers yet. Add one above." />}

      {filtered && filtered.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-text-muted bg-bg-elevated/50">
              <tr>
                <Th label="Handle" onClick={() => toggleSort("handle")} active={sortKey === "handle"} dir={sortDir} />
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-left">Niche</th>
                <Th label="Followers" onClick={() => toggleSort("followerCount")} active={sortKey === "followerCount"} dir={sortDir} />
                <Th label="Posts/wk" onClick={() => toggleSort("postingFrequency")} active={sortKey === "postingFrequency"} dir={sortDir} />
                <th className="px-4 py-3 text-left">Trend</th>
                <Th label="Relevance" onClick={() => toggleSort("relevanceScore")} active={sortKey === "relevanceScore"} dir={sortDir} />
                <th className="px-4 py-3 text-left">Links</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {filtered.map((i) => (
                <tr key={i.id} className="hover:bg-bg-elevated/30 transition-colors">
                  <td className="px-4 py-3 font-medium">@{i.handle}</td>
                  <td className="px-4 py-3"><PlatformBadge platform={i.platform} /></td>
                  <td className="px-4 py-3 text-text-secondary">{i.niche}</td>
                  <td className="px-4 py-3 font-mono">{i.followerCount.toLocaleString()}</td>
                  <td className="px-4 py-3 font-mono">{i.postingFrequency}</td>
                  <td className="px-4 py-3"><TrendBadge trend={i.engagementTrend} /></td>
                  <td className="px-4 py-3 w-40">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs w-7">{i.relevanceScore}</span>
                      <ScoreBar score={i.relevanceScore} />
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[260px]">
                    <SocialLinks links={i.socialLinks ?? []} variant="compact" emptyText="—" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/influencers/${i.id}`} className="text-accent-glow hover:text-accent-bright text-xs">
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ label, onClick, active, dir }: { label: string; onClick: () => void; active: boolean; dir: "asc" | "desc" }) {
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={onClick} className={`flex items-center gap-1 hover:text-text-primary ${active ? "text-accent-glow" : ""}`}>
        {label}
        {active && <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
