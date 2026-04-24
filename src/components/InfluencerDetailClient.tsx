"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { InfluencerForm } from "@/components/InfluencerForm";
import { SocialLinks } from "@/components/SocialLinks";
import { PageHeader, PlatformBadge, ScoreBar, TrendBadge } from "@/components/ui/Primitives";
import {
  deleteStaticInfluencer,
  getStaticInfluencer,
  isStaticExport,
} from "@/lib/staticMode";
import type { Influencer } from "@/lib/types";

export function InfluencerDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [influencer, setInfluencer] = useState<Influencer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setError(null);
    try {
      if (isStaticExport) {
        const staticInfluencer = await getStaticInfluencer(id);
        if (!staticInfluencer) throw new Error("Influencer not found");
        setInfluencer(staticInfluencer);
        return;
      }

      const r = await fetch(`/api/influencers/${id}`);
      if (!r.ok) throw new Error(r.status === 404 ? "Influencer not found" : `HTTP ${r.status}`);
      const d = await r.json();
      setInfluencer(d.influencer);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this influencer? This cannot be undone.")) return;
    setDeleting(true);
    try {
      if (isStaticExport) {
        await deleteStaticInfluencer(id);
        router.push("/influencers");
        return;
      }

      const r = await fetch(`/api/influencers/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      router.push("/influencers");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Influencer" />
        <div className="card p-4 text-red-300 text-sm">{error}</div>
        <Link href="/influencers" className="text-accent-glow text-sm mt-4 inline-block">← Back to list</Link>
      </div>
    );
  }

  if (!influencer) {
    return <div className="card p-12 text-center text-text-muted">Loading...</div>;
  }

  return (
    <div>
      <Link href="/influencers" className="text-xs text-text-muted hover:text-text-primary">← All influencers</Link>
      <PageHeader
        title={`@${influencer.handle}`}
        subtitle={`${influencer.niche} · ${influencer.followerCount.toLocaleString()} followers`}
        action={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel edit" : "Edit"}
            </button>
            <button className="btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        }
      />

      {editing ? (
        <InfluencerForm
          mode={{ kind: "edit", influencer }}
          onSaved={(i) => {
            setInfluencer(i);
            setEditing(false);
          }}
        />
      ) : (
        <div className="card p-6 space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            <PlatformBadge platform={influencer.platform} />
            <TrendBadge trend={influencer.engagementTrend} />
            <span className="badge-muted">{influencer.postingFrequency} posts/wk</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Relevance score" value={influencer.relevanceScore} />
            <Stat label="Followers" value={influencer.followerCount.toLocaleString()} />
            <Stat label="Posts per week" value={influencer.postingFrequency} />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Relevance</div>
            <ScoreBar score={influencer.relevanceScore} />
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-text-muted mb-2">
              Social profiles
            </div>
            <SocialLinks
              links={influencer.socialLinks ?? []}
              emptyText="No links discovered yet - they'll be filled in on the next refresh."
            />
          </div>

          <div className="text-xs text-text-muted">
            Added {new Date(influencer.createdAt).toLocaleString()} · Updated {new Date(influencer.updatedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-bg-elevated/40 rounded-md p-4 border border-bg-border">
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
