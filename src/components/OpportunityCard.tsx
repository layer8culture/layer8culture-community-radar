"use client";

import { useState } from "react";
import {
  generateStaticComments,
  isStaticExport,
  upsertStaticRelationship,
} from "@/lib/staticMode";
import type { Post, SuggestedAction } from "@/lib/types";
import type { CommentSource, CommentSuggestion } from "@/lib/openai";
import { ActionBadge, PlatformBadge, ScoreBar } from "./ui/Primitives";

// Maps the post's suggestedAction to the Relationship boolean field it sets.
const ACTION_TO_FIELD: Record<SuggestedAction, keyof RelationshipBooleans> = {
  like: "liked",
  comment: "commented",
  repost: "replied",
  follow: "followed",
  dm: "replied",
  invite: "invited",
};

type RelationshipBooleans = {
  liked: boolean;
  commented: boolean;
  followed: boolean;
  replied: boolean;
  invited: boolean;
};

const ACTION_LABELS: Record<SuggestedAction, string> = {
  like: "Liked",
  comment: "Commented",
  repost: "Reposted / Replied",
  follow: "Followed",
  dm: "Sent DM",
  invite: "Invited",
};

export function OpportunityCard({ post }: { post: Post }) {
  const [comments, setComments] = useState<CommentSuggestion[] | null>(null);
  const [source, setSource] = useState<CommentSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  // "Mark as actioned" state
  const [actionOpen, setActionOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<SuggestedAction>(post.suggestedAction);
  const [actionNotes, setActionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actioned, setActioned] = useState<{ action: SuggestedAction; notes: string } | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      if (isStaticExport) {
        const data = await generateStaticComments({
          postContent: post.content,
          creatorName: post.creatorHandle,
          platform: post.platform,
        });
        setComments(data.comments);
        setSource(data.source);
        return;
      }

      const res = await fetch("/api/generate-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postContent: post.content,
          creatorName: post.creatorHandle,
          platform: post.platform,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComments(data.comments);
      setSource(data.source);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate comments");
    } finally {
      setLoading(false);
    }
  }

  async function saveAsRelationship() {
    setSaving(true);
    setSaveError(null);
    try {
      const field = ACTION_TO_FIELD[selectedAction];
      const body: Record<string, unknown> = {
        creatorHandle: post.creatorHandle,
        platform: post.platform,
        liked: false,
        commented: false,
        followed: false,
        replied: false,
        invited: false,
        notes: actionNotes.trim(),
      };
      body[field] = true;
      if (isStaticExport) {
        await upsertStaticRelationship({
          creatorHandle: post.creatorHandle,
          platform: post.platform,
          liked: Boolean(body.liked),
          commented: Boolean(body.commented),
          followed: Boolean(body.followed),
          replied: Boolean(body.replied),
          invited: Boolean(body.invited),
          notes: actionNotes.trim(),
        });
        setActioned({ action: selectedAction, notes: actionNotes.trim() });
        setActionOpen(false);
        return;
      }

      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setActioned({ action: selectedAction, notes: actionNotes.trim() });
      setActionOpen(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article
      className={`card p-5 hover:border-accent-bright/40 transition-colors${actioned ? " border-green-500/40" : ""}`}
    >
      <header className="flex items-center justify-between mb-3 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center text-xs font-mono text-accent-glow shrink-0">
            {post.creatorHandle.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">@{post.creatorHandle}</div>
            <div className="text-[11px] text-text-muted">
              {new Date(post.createdAt).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actioned && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider bg-green-500/15 border border-green-500/40 text-green-400 font-medium">
              ✓ {ACTION_LABELS[actioned.action]}
            </span>
          )}
          <PlatformBadge platform={post.platform} />
          <ActionBadge action={post.suggestedAction} />
        </div>
      </header>

      <p className="text-text-primary text-sm leading-relaxed mb-4">
        {post.url ? (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent-glow"
          >
            {post.content}
          </a>
        ) : (
          post.content
        )}
      </p>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <ScoreCell label="Opportunity" value={post.opportunityScore} />
        <ScoreCell label="Relevance" value={post.relevanceScore} />
        <ScoreCell label="Velocity" value={post.engagementVelocity} />
      </div>

      {/* Bottom action row */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary text-xs"
        >
          {loading ? "Generating…" : comments ? "Regenerate comments" : "✨ Suggest comments"}
        </button>

        <button
          onClick={() => {
            setActionOpen((v) => !v);
            setSaveError(null);
          }}
          className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
            actioned
              ? "border-green-500/40 text-green-400 hover:bg-green-500/10"
              : "border-bg-border text-text-secondary hover:border-accent-glow/50 hover:text-accent-glow"
          }`}
        >
          {actioned ? "✓ Actioned" : "Mark as actioned"}
        </button>
      </div>

      {source && (
        <div className="mt-1 text-[10px] text-text-muted uppercase tracking-wider">
          via {source === "github-models" ? "GitHub Models" : source === "openai" ? "OpenAI" : "fallback templates"}
        </div>
      )}

      {/* Inline "Mark as actioned" form */}
      {actionOpen && (
        <div className="mt-4 border border-bg-border rounded-md p-4 bg-bg-elevated/40 space-y-3">
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">
            Save to relationships
          </p>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">
              Action taken
            </label>
            <select
              className="input w-full text-sm"
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value as SuggestedAction)}
            >
              {(Object.entries(ACTION_LABELS) as [SuggestedAction, string][]).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">
              Notes (optional)
            </label>
            <textarea
              className="input w-full text-sm resize-none"
              rows={2}
              placeholder={`e.g. Left a comment on their "${post.content.slice(0, 40)}…" post`}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>

          {saveError && (
            <p className="text-xs text-red-300">{saveError}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={saveAsRelationship}
              disabled={saving}
              className="btn-primary text-xs"
            >
              {saving ? "Saving…" : "Save relationship"}
            </button>
            <button
              onClick={() => { setActionOpen(false); setSaveError(null); }}
              className="btn-ghost text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-md p-2">
          {error}
        </div>
      )}

      {comments && (
        <div className="mt-4 space-y-2">
          {comments.map((c, i) => (
            <div
              key={i}
              className="border border-bg-border rounded-md p-3 bg-bg-elevated/40"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-accent-glow">
                  {c.tone}
                </span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(c.text);
                    setCopied(i);
                    setTimeout(() => setCopied((x) => (x === i ? null : x)), 1500);
                  }}
                  className="text-[10px] text-text-muted hover:text-text-primary"
                >
                  {copied === i ? "Copied ✓" : "Copy"}
                </button>
              </div>
              <p className="text-sm text-text-primary">{c.text}</p>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function ScoreCell({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-text-muted mb-1">
        <span>{label}</span>
        <span className="text-text-primary font-mono">{value}</span>
      </div>
      <ScoreBar score={value} />
    </div>
  );
}
