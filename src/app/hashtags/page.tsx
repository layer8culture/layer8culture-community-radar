"use client";

import { useEffect, useState } from "react";
import { PageHeader, EmptyState, PlatformBadge, ScoreBar } from "@/components/ui/Primitives";
import type { Hashtag, Platform } from "@/lib/types";
import { Platforms } from "@/lib/types";

export default function HashtagsPage() {
  const [tags, setTags] = useState<Hashtag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>("twitter");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/hashtags");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setTags(d.hashtags);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch("/api/hashtags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), platform }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this hashtag?")) return;
    await fetch(`/api/hashtags/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Hashtag Tracker"
        subtitle="Watch hashtags across platforms. Background fetch is mocked for the MVP."
      />

      <form onSubmit={handleAdd} className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-wider text-text-muted">Hashtag</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input mt-1"
            placeholder="e.g. buildinpublic (no #)"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted">Platform</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value as Platform)}
            className="input mt-1"
          >
            {Platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Adding…" : "+ Add"}
        </button>
      </form>

      {error && <div className="card p-4 text-red-300 text-sm border-red-500/30 mb-4">{error}</div>}

      {!tags && !error && <div className="card p-12 text-center text-text-muted">Loading…</div>}

      {tags && tags.length === 0 && <EmptyState message="No hashtags yet." />}

      {tags && tags.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tags.map((t) => (
            <div key={t.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-accent-glow">#{t.name}</div>
                <PlatformBadge platform={t.platform} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono w-7">{t.relevanceScore}</span>
                <ScoreBar score={t.relevanceScore} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">
                  Last checked {new Date(t.lastCheckedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="text-[11px] text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted mt-6">
        Stretch goal: a cron job will fetch trending posts per hashtag and feed them into the Opportunity stream.
      </p>
    </div>
  );
}
