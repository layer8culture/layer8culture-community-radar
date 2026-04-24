"use client";

import { useEffect, useState } from "react";
import { PageHeader, EmptyState, PlatformBadge, ScoreBar } from "@/components/ui/Primitives";
import type { Relationship, Platform } from "@/lib/types";
import { Platforms } from "@/lib/types";

const FLAGS: Array<{ key: keyof Pick<Relationship, "liked" | "commented" | "followed" | "replied" | "invited">; label: string }> = [
  { key: "liked", label: "Liked" },
  { key: "commented", label: "Commented" },
  { key: "followed", label: "Followed" },
  { key: "replied", label: "Replied" },
  { key: "invited", label: "Invited" },
];

export default function RelationshipsPage() {
  const [rels, setRels] = useState<Relationship[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // new-relationship form
  const [newHandle, setNewHandle] = useState("");
  const [newPlatform, setNewPlatform] = useState<Platform>("twitter");

  async function load() {
    try {
      const r = await fetch("/api/relationships");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setRels(d.relationships);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => { load(); }, []);

  async function patch(id: string, patch: Partial<Relationship>) {
    setSavingId(id);
    try {
      const r = await fetch(`/api/relationships/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setRels((cur) => (cur ?? []).map((x) => (x.id === id ? d.relationship : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!newHandle.trim()) return;
    try {
      const r = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creatorHandle: newHandle.trim(), platform: newPlatform }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setNewHandle("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Relationships"
        subtitle="Track every interaction you've had with each creator."
      />

      <form onSubmit={add} className="card p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs uppercase tracking-wider text-text-muted">Creator handle</label>
          <input className="input mt-1" value={newHandle} onChange={(e) => setNewHandle(e.target.value)} placeholder="e.g. swyx" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-text-muted">Platform</label>
          <select className="input mt-1" value={newPlatform} onChange={(e) => setNewPlatform(e.target.value as Platform)}>
            {Platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <button type="submit" className="btn-primary">+ Add relationship</button>
      </form>

      {error && <div className="card p-4 text-red-300 text-sm border-red-500/30 mb-4">{error}</div>}

      {!rels && !error && <div className="card p-12 text-center text-text-muted">Loading…</div>}

      {rels && rels.length === 0 && <EmptyState message="No relationships tracked yet." />}

      {rels && rels.length > 0 && (
        <div className="space-y-3">
          {rels.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center text-xs font-mono text-accent-glow shrink-0">
                    {r.creatorHandle.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">@{r.creatorHandle}</div>
                    <div className="text-[11px] text-text-muted">Updated {new Date(r.updatedAt).toLocaleString()}</div>
                  </div>
                  <PlatformBadge platform={r.platform} />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted">Collab</span>
                  <span className="font-mono text-xs w-7 text-right">{r.collaboratorScore}</span>
                  <div className="w-24"><ScoreBar score={r.collaboratorScore} /></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {FLAGS.map((f) => {
                  const active = r[f.key];
                  return (
                    <button
                      key={f.key}
                      onClick={() => patch(r.id, { [f.key]: !active } as Partial<Relationship>)}
                      disabled={savingId === r.id}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        active
                          ? "bg-accent-bright/15 text-accent-glow border-accent-bright/30"
                          : "bg-bg-elevated border-bg-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {active ? "✓ " : ""}{f.label}
                    </button>
                  );
                })}
              </div>

              <textarea
                defaultValue={r.notes}
                onBlur={(e) => {
                  if (e.target.value !== r.notes) patch(r.id, { notes: e.target.value });
                }}
                placeholder="Notes on this relationship…"
                className="input min-h-[60px] text-xs"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
