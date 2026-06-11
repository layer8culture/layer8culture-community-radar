"use client";

import { useEffect, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/Primitives";
import { CopyButton } from "@/components/CopyButton";
import { ContentFormats, ContentPlatforms, ContentStatuses } from "@/lib/types";
import type { ContentFormat, ContentIdea, ContentPlatform, ContentStatus } from "@/lib/types";

interface Plan {
  hooks: string[];
  scriptBeats: string[];
  caption: string;
  firstComment: string;
  hashtags: string[];
  audioIdea: string;
  cta: string;
}

type Source = "github-models" | "openai" | "fallback";

const STATUS_LABELS: Record<ContentStatus, string> = {
  idea: "Idea",
  drafting: "Drafting",
  scheduled: "Scheduled",
  posted: "Posted",
};

function hashtagString(tags: string[]): string {
  return tags.map((t) => `#${t.replace(/^#/, "")}`).join(" ");
}

export default function ContentStudioPage() {
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState<ContentPlatform>("instagram");
  const [format, setFormat] = useState<ContentFormat>("reel");
  const [niche, setNiche] = useState("");
  const [audioIdea, setAudioIdea] = useState("");

  const [plan, setPlan] = useState<Plan | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [ideas, setIdeas] = useState<ContentIdea[] | null>(null);

  // Deep-link support from the Trend Radar: /content?topic=..&platform=..&audio=..
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("topic");
    const p = sp.get("platform");
    const a = sp.get("audio");
    if (t) setTopic(t);
    if (p === "instagram" || p === "tiktok") setPlatform(p);
    if (a) setAudioIdea(a);
  }, []);

  async function loadIdeas() {
    const r = await fetch("/api/content");
    if (r.ok) setIdeas((await r.json()).ideas);
  }
  useEffect(() => {
    loadIdeas();
  }, []);

  async function generate(overridePlatform?: ContentPlatform) {
    const usePlatform = overridePlatform ?? platform;
    if (overridePlatform) setPlatform(overridePlatform);
    if (!topic.trim()) {
      setError("Enter a topic first.");
      return;
    }
    setGenerating(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, platform: usePlatform, format, niche, audioIdea }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setPlan(data.plan);
      setSource(data.source);
      if (data.plan?.audioIdea) setAudioIdea(data.plan.audioIdea);
    } catch (e) {
      setError(e instanceof Error ? e.message : "generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          platform,
          format,
          hook: plan.hooks[0] ?? "",
          hooks: plan.hooks,
          scriptBeats: plan.scriptBeats,
          caption: plan.caption,
          firstComment: plan.firstComment,
          hashtags: plan.hashtags,
          audioIdea: plan.audioIdea,
          cta: plan.cta,
          status: "drafting",
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      setSaved(true);
      await loadIdeas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "save failed");
    } finally {
      setSaving(false);
    }
  }

  const otherPlatform: ContentPlatform = platform === "instagram" ? "tiktok" : "instagram";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Content Studio"
        subtitle="Turn one idea into a ready-to-shoot Reel or TikTok — the lever that actually grows IG/TikTok followers."
      />

      {/* Generator */}
      <section className="card p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">
              Topic / angle
            </label>
            <input
              className="input"
              placeholder="e.g. Why I rebuilt my side project's auth in a weekend"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Platform</label>
            <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as ContentPlatform)}>
              {ContentPlatforms.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Format</label>
            <select className="input" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>
              {ContentFormats.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Niche (optional)</label>
            <input
              className="input"
              placeholder="developer / build-in-public"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Audio / trend (optional)</label>
            <input
              className="input"
              placeholder="e.g. trending lo-fi focus beat"
              value={audioIdea}
              onChange={(e) => setAudioIdea(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => generate()} disabled={generating} className="btn-primary text-xs">
            {generating ? "Generating…" : plan ? "↻ Regenerate" : "✨ Generate content plan"}
          </button>
          {plan && (
            <button onClick={() => generate(otherPlatform)} disabled={generating} className="btn-ghost text-xs">
              Repurpose for {otherPlatform}
            </button>
          )}
          {source && (
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              via {source === "github-models" ? "GitHub Models" : source === "openai" ? "OpenAI" : "fallback templates"}
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-300">{error}</p>}
      </section>

      {/* Generated plan */}
      {plan && (
        <section className="card p-4 sm:p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Your content plan</h2>
            <div className="flex items-center gap-2">
              <button onClick={saveDraft} disabled={saving} className="btn-primary text-xs">
                {saving ? "Saving…" : saved ? "✓ Saved to drafts" : "Save as draft"}
              </button>
            </div>
          </div>

          <PlanBlock title="Hooks (first 1–3 seconds)" copyText={plan.hooks.join("\n")}>
            <ul className="space-y-2">
              {plan.hooks.map((h, i) => (
                <li key={i} className="flex items-start justify-between gap-3 text-sm text-text-primary">
                  <span>{h}</span>
                  <CopyButton text={h} className="shrink-0 mt-0.5" />
                </li>
              ))}
            </ul>
          </PlanBlock>

          <PlanBlock title="Script / shot list" copyText={plan.scriptBeats.join("\n")}>
            <ol className="space-y-1.5">
              {plan.scriptBeats.map((b, i) => (
                <li key={i} className="text-sm text-text-secondary leading-relaxed">{b}</li>
              ))}
            </ol>
          </PlanBlock>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PlanBlock title="Caption" copyText={plan.caption}>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{plan.caption}</p>
            </PlanBlock>
            <PlanBlock title="Pinned first comment" copyText={plan.firstComment}>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{plan.firstComment}</p>
            </PlanBlock>
          </div>

          <PlanBlock title="Hashtags" copyText={hashtagString(plan.hashtags)}>
            <div className="flex flex-wrap gap-1.5">
              {plan.hashtags.map((t, i) => (
                <span key={i} className="badge-muted">#{t.replace(/^#/, "")}</span>
              ))}
            </div>
          </PlanBlock>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <PlanBlock title="Audio / trend" copyText={plan.audioIdea}>
              <p className="text-sm text-text-secondary leading-relaxed">{plan.audioIdea}</p>
            </PlanBlock>
            <PlanBlock title="Call to action" copyText={plan.cta}>
              <p className="text-sm text-text-primary leading-relaxed">{plan.cta}</p>
            </PlanBlock>
          </div>
        </section>
      )}

      {/* Saved drafts */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">Saved drafts</h2>
        {ideas === null ? (
          <div className="card p-6 text-text-muted text-sm">Loading…</div>
        ) : ideas.length === 0 ? (
          <EmptyState message="No saved drafts yet. Generate a plan and save it." />
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => (
              <SavedIdeaCard key={idea.id} idea={idea} onChange={loadIdeas} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PlanBlock({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-text-muted font-medium">{title}</span>
        <CopyButton text={copyText} label="Copy all" />
      </div>
      <div className="border border-bg-border rounded-md p-3 bg-bg-elevated/40">{children}</div>
    </div>
  );
}

function SavedIdeaCard({ idea, onChange }: { idea: ContentIdea; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: ContentStatus) {
    setBusy(true);
    await fetch(`/api/content/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusy(false);
    onChange();
  }
  async function remove() {
    if (!confirm("Delete this draft?")) return;
    await fetch(`/api/content/${idea.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={() => setOpen((v) => !v)} className="text-left flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{idea.topic}</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge-muted capitalize">{idea.platform}</span>
            <span className="badge-muted">{idea.format}</span>
          </div>
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <select
            className="input w-auto py-1 text-xs"
            value={idea.status}
            disabled={busy}
            onChange={(e) => setStatus(e.target.value as ContentStatus)}
          >
            {ContentStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <button onClick={remove} className="text-[11px] text-red-400 hover:text-red-300">Delete</button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-bg-border pt-3">
          {idea.hooks.length > 0 && (
            <Detail label="Hooks" copyText={idea.hooks.join("\n")}>
              <ul className="list-disc list-inside text-sm text-text-secondary space-y-1">
                {idea.hooks.map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </Detail>
          )}
          {idea.scriptBeats.length > 0 && (
            <Detail label="Script" copyText={idea.scriptBeats.join("\n")}>
              <ol className="text-sm text-text-secondary space-y-1">
                {idea.scriptBeats.map((b, i) => <li key={i}>{b}</li>)}
              </ol>
            </Detail>
          )}
          {idea.caption && (
            <Detail label="Caption" copyText={idea.caption}>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{idea.caption}</p>
            </Detail>
          )}
          {idea.firstComment && (
            <Detail label="First comment" copyText={idea.firstComment}>
              <p className="text-sm text-text-primary whitespace-pre-wrap">{idea.firstComment}</p>
            </Detail>
          )}
          {idea.hashtags.length > 0 && (
            <Detail label="Hashtags" copyText={hashtagString(idea.hashtags)}>
              <div className="flex flex-wrap gap-1.5">
                {idea.hashtags.map((t, i) => <span key={i} className="badge-muted">#{t.replace(/^#/, "")}</span>)}
              </div>
            </Detail>
          )}
          {idea.cta && (
            <Detail label="CTA" copyText={idea.cta}>
              <p className="text-sm text-text-primary">{idea.cta}</p>
            </Detail>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, copyText, children }: { label: string; copyText: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
        <CopyButton text={copyText} label="Copy" />
      </div>
      {children}
    </div>
  );
}
