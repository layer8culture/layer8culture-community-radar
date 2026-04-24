"use client";

import { useState } from "react";
import {
  createStaticInfluencer,
  isStaticExport,
  updateStaticInfluencer,
} from "@/lib/staticMode";
import { Platforms, EngagementTrends } from "@/lib/types";
import type { Influencer, Platform, EngagementTrend } from "@/lib/types";

type Mode = { kind: "create" } | { kind: "edit"; influencer: Influencer };

export function InfluencerForm({
  mode = { kind: "create" },
  onSaved,
}: {
  mode?: Mode;
  onSaved?: (i: Influencer) => void;
}) {
  const initial = mode.kind === "edit" ? mode.influencer : null;
  const [handle, setHandle] = useState(initial?.handle ?? "");
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? "twitter");
  const [niche, setNiche] = useState(initial?.niche ?? "");
  const [followerCount, setFollowerCount] = useState(initial?.followerCount ?? 0);
  const [postingFrequency, setPostingFrequency] = useState(initial?.postingFrequency ?? 0);
  const [engagementTrend, setEngagementTrend] = useState<EngagementTrend>(initial?.engagementTrend ?? "stable");
  const [relevanceScore, setRelevanceScore] = useState(initial?.relevanceScore ?? 60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) {
      setError("Handle is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      if (isStaticExport) {
        const input = {
          handle,
          platform,
          niche,
          followerCount,
          postingFrequency,
          engagementTrend,
          relevanceScore,
        };
        const influencer =
          mode.kind === "edit"
            ? await updateStaticInfluencer(mode.influencer.id, input)
            : await createStaticInfluencer(input);
        if (!influencer) throw new Error("Influencer not found");
        onSaved?.(influencer);
        return;
      }

      const url = mode.kind === "edit" ? `/api/influencers/${mode.influencer.id}` : "/api/influencers";
      const method = mode.kind === "edit" ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handle, platform, niche, followerCount, postingFrequency, engagementTrend, relevanceScore,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      onSaved?.(data.influencer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-5 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Handle" required>
          <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="e.g. swyx" />
        </Field>
        <Field label="Platform">
          <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)}>
            {Platforms.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Niche">
          <input className="input" value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. AI / DX" />
        </Field>
        <Field label="Engagement trend">
          <select className="input" value={engagementTrend} onChange={(e) => setEngagementTrend(e.target.value as EngagementTrend)}>
            {EngagementTrends.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Followers">
          <input type="number" min={0} className="input" value={followerCount}
            onChange={(e) => setFollowerCount(Number(e.target.value) || 0)} />
        </Field>
        <Field label="Posts per week">
          <input type="number" min={0} className="input" value={postingFrequency}
            onChange={(e) => setPostingFrequency(Number(e.target.value) || 0)} />
        </Field>
        <Field label={`Relevance score (${relevanceScore})`}>
          <input type="range" min={0} max={100} value={relevanceScore}
            onChange={(e) => setRelevanceScore(Number(e.target.value))}
            className="w-full accent-accent-bright" />
        </Field>
      </div>
      {error && <div className="text-sm text-red-300">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? "Saving…" : mode.kind === "edit" ? "Save changes" : "Add influencer"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-text-muted">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
