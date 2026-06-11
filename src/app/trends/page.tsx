"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/ui/Primitives";
import { ContentPlatforms, TrendMomentums, TrendTypes } from "@/lib/types";
import type { ContentPlatform, Trend, TrendMomentum, TrendType } from "@/lib/types";

function MomentumBadge({ momentum }: { momentum: TrendMomentum }) {
  const cls =
    momentum === "rising" ? "badge-rising" : momentum === "peaking" ? "badge-stable" : "badge-declining";
  const arrow = momentum === "rising" ? "↑" : momentum === "peaking" ? "◆" : "↓";
  return <span className={cls}>{arrow} {momentum}</span>;
}

function studioHref(t: Trend): string {
  const params = new URLSearchParams({ topic: t.title, platform: t.platform });
  if (t.type === "sound") params.set("audio", t.title);
  return `/content?${params.toString()}`;
}

export default function TrendRadarPage() {
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Add form
  const [showForm, setShowForm] = useState(false);
  const [fPlatform, setFPlatform] = useState<ContentPlatform>("tiktok");
  const [fType, setFType] = useState<TrendType>("sound");
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fMomentum, setFMomentum] = useState<TrendMomentum>("rising");
  const [fUrl, setFUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/trends");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setTrends((await r.json()).trends);
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!fTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: fPlatform,
          type: fType,
          title: fTitle.trim(),
          description: fDescription.trim(),
          momentum: fMomentum,
          exampleUrl: fUrl.trim() || null,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      setFTitle("");
      setFDescription("");
      setFUrl("");
      setShowForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to add");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this trend?")) return;
    await fetch(`/api/trends/${id}`, { method: "DELETE" });
    await load();
  }

  const filtered = useMemo(() => {
    if (!trends) return null;
    return trends
      .filter((t) => platformFilter === "all" || t.platform === platformFilter)
      .filter((t) => typeFilter === "all" || t.type === typeFilter);
  }, [trends, platformFilter, typeFilter]);

  return (
    <div>
      <PageHeader
        title="Trend Radar"
        subtitle="Sounds, formats, and topics worth riding on Instagram + TikTok right now. Send any one straight to the Content Studio."
        action={
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary text-xs">
            {showForm ? "Cancel" : "+ Add trend"}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={add} className="card p-4 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Title</label>
            <input className="input" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="e.g. Build-with-me speedrun" />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Platform</label>
            <select className="input" value={fPlatform} onChange={(e) => setFPlatform(e.target.value as ContentPlatform)}>
              {ContentPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Type</label>
            <select className="input" value={fType} onChange={(e) => setFType(e.target.value as TrendType)}>
              {TrendTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Momentum</label>
            <select className="input" value={fMomentum} onChange={(e) => setFMomentum(e.target.value as TrendMomentum)}>
              {TrendMomentums.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Example URL (optional)</label>
            <input className="input" value={fUrl} onChange={(e) => setFUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Description</label>
            <textarea className="input resize-none" rows={2} value={fDescription} onChange={(e) => setFDescription(e.target.value)} placeholder="Why it works / how to use it" />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="btn-primary text-xs">
              {submitting ? "Adding…" : "Save trend"}
            </button>
          </div>
        </form>
      )}

      <div className="card p-3 mb-6 flex flex-wrap items-center gap-3">
        <label className="text-xs text-text-secondary flex items-center gap-2">
          Platform
          <select className="input w-auto py-1" value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)}>
            <option value="all">All</option>
            {ContentPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-xs text-text-secondary flex items-center gap-2">
          Type
          <select className="input w-auto py-1" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All</option>
            {TrendTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <span className="sm:ml-auto text-xs text-text-muted">{filtered ? `${filtered.length} trends` : ""}</span>
      </div>

      {error && <div className="card p-4 text-red-300 text-sm border-red-500/30 mb-4">{error}</div>}

      {!trends && !error && <div className="card p-12 text-center text-text-muted">Loading…</div>}

      {filtered && filtered.length === 0 && <EmptyState message="No trends match these filters." />}

      {filtered && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((t) => (
            <div key={t.id} className="card p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="badge-muted capitalize">{t.platform}</span>
                  <span className="badge-accent capitalize">{t.type}</span>
                </div>
                <MomentumBadge momentum={t.momentum} />
              </div>
              <div className="text-sm font-medium">{t.title}</div>
              {t.description && <p className="text-xs text-text-secondary leading-relaxed flex-1">{t.description}</p>}
              <div className="flex items-center justify-between gap-2 mt-1">
                <Link href={studioHref(t)} className="btn-primary text-xs">Use in Studio →</Link>
                <div className="flex items-center gap-3">
                  {t.exampleUrl && (
                    <a href={t.exampleUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-accent-glow hover:text-accent-bright">
                      Example
                    </a>
                  )}
                  <button onClick={() => remove(t.id)} className="text-[11px] text-red-400 hover:text-red-300">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
