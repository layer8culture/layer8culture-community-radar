"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/ui/Primitives";
import { Sparkline } from "@/components/Sparkline";
import { ContentFormats, ContentPlatforms } from "@/lib/types";
import type {
  ContentFormat,
  ContentPlatform,
  FollowerSnapshot,
  MyAccount,
  MyPost,
} from "@/lib/types";

const ENGAGEMENT_WINDOW_MS = 60 * 60 * 1000;

function pct(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${(n * 100).toFixed(1)}%`;
}
function num(n: number): string {
  return n.toLocaleString();
}

export default function MyGrowthPage() {
  const [accounts, setAccounts] = useState<MyAccount[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<FollowerSnapshot[]>([]);
  const [posts, setPosts] = useState<MyPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    const r = await fetch("/api/growth/accounts");
    if (r.ok) {
      const data = (await r.json()).accounts as MyAccount[];
      setAccounts(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    }
  }, []);

  const loadDetail = useCallback(async (accountId: string) => {
    const [sr, pr] = await Promise.all([
      fetch(`/api/growth/snapshots?accountId=${accountId}`),
      fetch(`/api/growth/posts?accountId=${accountId}`),
    ]);
    if (sr.ok) setSnapshots((await sr.json()).snapshots);
    if (pr.ok) setPosts((await pr.json()).posts);
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);
  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  const selected = accounts?.find((a) => a.id === selectedId) ?? null;

  const followerSeries = useMemo(() => snapshots.map((s) => s.followers), [snapshots]);
  const growth = useMemo(() => {
    if (snapshots.length < 2) return null;
    const first = snapshots[0].followers;
    const last = snapshots[snapshots.length - 1].followers;
    const delta = last - first;
    return { delta, pctChange: first > 0 ? delta / first : 0 };
  }, [snapshots]);

  const openWindowPosts = useMemo(
    () => posts.filter((p) => Date.now() - new Date(p.postedAt).getTime() < ENGAGEMENT_WINDOW_MS),
    [posts],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Growth"
        subtitle="Track your own follower growth and per-post performance — the numbers that tell you what's actually working."
      />

      {error && <div className="card p-4 text-red-300 text-sm border-red-500/30">{error}</div>}

      <AddAccountForm onAdded={loadAccounts} setError={setError} />

      {accounts === null ? (
        <div className="card p-6 text-text-muted text-sm">Loading…</div>
      ) : accounts.length === 0 ? (
        <EmptyState message="Add an Instagram or TikTok account to start tracking growth." />
      ) : (
        <>
          {/* Account switcher */}
          <div className="flex flex-wrap gap-2">
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`px-3 py-2 rounded-md text-sm border transition-colors ${
                  a.id === selectedId
                    ? "bg-accent-bright/15 text-accent-glow border-accent-bright/30"
                    : "border-bg-border text-text-secondary hover:text-text-primary"
                }`}
              >
                @{a.handle}
                <span className="text-[10px] uppercase tracking-wider text-text-muted ml-2">{a.platform}</span>
              </button>
            ))}
          </div>

          {selected && (
            <>
              {/* Engagement window prompt (first-60-minute reply loop) */}
              {openWindowPosts.length > 0 && (
                <div className="card p-4 border-emerald-500/40 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-emerald-400 text-sm font-semibold">⏱ Engagement window open</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    You posted within the last 60 minutes. Reply to <strong>every</strong> comment now and
                    re-engage from your other accounts — early replies and watch-time in the first hour are
                    the strongest signals the IG/TikTok algorithm uses to push a post to non-followers.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {openWindowPosts.map((p) => (
                      <li key={p.id} className="text-xs text-text-primary">
                        • {p.title} — {num(p.comments)} comments to work through
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follower trend */}
              <section className="card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div>
                    <div className="text-sm font-semibold">@{selected.handle}</div>
                    <div className="text-[11px] uppercase tracking-wider text-text-muted">
                      {selected.platform} · {num(selected.followers)} followers
                    </div>
                  </div>
                  {growth && (
                    <div className="text-right">
                      <div className={`text-sm font-mono ${growth.delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {growth.delta >= 0 ? "+" : ""}{num(growth.delta)} ({pct(Math.abs(growth.pctChange))})
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-text-muted">over tracked period</div>
                    </div>
                  )}
                </div>
                <Sparkline values={followerSeries} width={640} height={72} className="w-full h-16" />
                <AddSnapshotForm
                  accountId={selected.id}
                  onAdded={() => {
                    loadDetail(selected.id);
                    loadAccounts();
                  }}
                  setError={setError}
                />
              </section>

              {/* Post performance */}
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
                  Post performance
                </h2>
                <AddPostForm
                  accountId={selected.id}
                  platform={selected.platform}
                  onAdded={() => loadDetail(selected.id)}
                  setError={setError}
                />
                {posts.length === 0 ? (
                  <EmptyState message="No posts logged yet. Add one above to see what's working." />
                ) : (
                  <PostTable posts={posts} onChange={() => loadDetail(selected.id)} />
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function AddAccountForm({ onAdded, setError }: { onAdded: () => void; setError: (s: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<ContentPlatform>("instagram");
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [followers, setFollowers] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/growth/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          handle: handle.trim(),
          displayName: displayName.trim(),
          followers: Number(followers) || 0,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      setHandle("");
      setDisplayName("");
      setFollowers("");
      setOpen(false);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to add account");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-ghost text-xs">+ Add account</button>
    );
  }
  return (
    <form onSubmit={submit} className="card p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
      <div>
        <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Platform</label>
        <select className="input" value={platform} onChange={(e) => setPlatform(e.target.value as ContentPlatform)}>
          {ContentPlatforms.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Handle</label>
        <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="your.handle" />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Display name</label>
        <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </div>
      <div>
        <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Followers</label>
        <input className="input" type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} />
      </div>
      <div className="sm:col-span-4 flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary text-xs">{busy ? "Adding…" : "Add account"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
      </div>
    </form>
  );
}

function AddSnapshotForm({
  accountId,
  onAdded,
  setError,
}: {
  accountId: string;
  onAdded: () => void;
  setError: (s: string | null) => void;
}) {
  const [followers, setFollowers] = useState("");
  const [reach, setReach] = useState("");
  const [profileViews, setProfileViews] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!followers.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/growth/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          followers: Number(followers) || 0,
          reach: Number(reach) || 0,
          profileViews: Number(profileViews) || 0,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      setFollowers("");
      setReach("");
      setProfileViews("");
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to add snapshot");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-2">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">Followers today</label>
        <input className="input w-32" type="number" value={followers} onChange={(e) => setFollowers(e.target.value)} />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">Reach (7d)</label>
        <input className="input w-32" type="number" value={reach} onChange={(e) => setReach(e.target.value)} />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">Profile views</label>
        <input className="input w-32" type="number" value={profileViews} onChange={(e) => setProfileViews(e.target.value)} />
      </div>
      <button type="submit" disabled={busy} className="btn-ghost text-xs">{busy ? "Saving…" : "+ Log reading"}</button>
    </form>
  );
}

function AddPostForm({
  accountId,
  platform,
  onAdded,
  setError,
}: {
  accountId: string;
  platform: ContentPlatform;
  onAdded: () => void;
  setError: (s: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ContentFormat>("reel");
  const [fields, setFields] = useState({ reach: "", likes: "", comments: "", shares: "", saves: "", follows: "" });
  const [busy, setBusy] = useState(false);

  function set(k: keyof typeof fields, v: string) {
    setFields((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/growth/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          platform,
          title: title.trim(),
          format,
          reach: Number(fields.reach) || 0,
          likes: Number(fields.likes) || 0,
          comments: Number(fields.comments) || 0,
          shares: Number(fields.shares) || 0,
          saves: Number(fields.saves) || 0,
          follows: Number(fields.follows) || 0,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
      setTitle("");
      setFields({ reach: "", likes: "", comments: "", shares: "", saves: "", follows: "" });
      setOpen(false);
      onAdded();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to add post");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return <button onClick={() => setOpen(true)} className="btn-ghost text-xs mb-3">+ Log a post</button>;
  }
  return (
    <form onSubmit={submit} className="card p-4 mb-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="sm:col-span-3">
          <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title / hook" />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-text-muted block mb-1">Format</label>
          <select className="input" value={format} onChange={(e) => setFormat(e.target.value as ContentFormat)}>
            {ContentFormats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {(["reach", "likes", "comments", "shares", "saves", "follows"] as const).map((k) => (
          <div key={k}>
            <label className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">{k}</label>
            <input className="input" type="number" value={fields[k]} onChange={(e) => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn-primary text-xs">{busy ? "Saving…" : "Save post"}</button>
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost text-xs">Cancel</button>
      </div>
    </form>
  );
}

function PostTable({ posts, onChange }: { posts: MyPost[]; onChange: () => void }) {
  // Highlight the best performer per save-rate (the strongest follow predictor).
  const bestId = useMemo(() => {
    let best: { id: string; rate: number } | null = null;
    for (const p of posts) {
      const rate = p.reach > 0 ? p.saves / p.reach : 0;
      if (!best || rate > best.rate) best = { id: p.id, rate };
    }
    return best?.id ?? null;
  }, [posts]);

  async function remove(id: string) {
    if (!confirm("Delete this post?")) return;
    await fetch(`/api/growth/posts/${id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-text-muted border-b border-bg-border">
            <th className="text-left p-3 font-medium">Post</th>
            <th className="text-right p-3 font-medium">Reach</th>
            <th className="text-right p-3 font-medium" title="(likes+comments+shares+saves)/reach">Eng. rate</th>
            <th className="text-right p-3 font-medium" title="saves/reach">Save rate</th>
            <th className="text-right p-3 font-medium" title="shares/reach">Share rate</th>
            <th className="text-right p-3 font-medium" title="follows/reach — viewers who became followers">Follower conv.</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => {
            const eng = p.reach > 0 ? (p.likes + p.comments + p.shares + p.saves) / p.reach : 0;
            const saveRate = p.reach > 0 ? p.saves / p.reach : 0;
            const shareRate = p.reach > 0 ? p.shares / p.reach : 0;
            const conv = p.reach > 0 ? p.follows / p.reach : 0;
            return (
              <tr key={p.id} className="border-b border-bg-border/50 last:border-0">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-[220px]">{p.title}</span>
                    {p.id === bestId && <span className="badge-rising">top saves</span>}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-text-muted mt-0.5">
                    {p.format} · {new Date(p.postedAt).toLocaleDateString()}
                  </div>
                </td>
                <td className="p-3 text-right font-mono">{num(p.reach)}</td>
                <td className="p-3 text-right font-mono">{pct(eng)}</td>
                <td className="p-3 text-right font-mono">{pct(saveRate)}</td>
                <td className="p-3 text-right font-mono">{pct(shareRate)}</td>
                <td className="p-3 text-right font-mono text-accent-glow">{pct(conv)}</td>
                <td className="p-3 text-right">
                  <button onClick={() => remove(p.id)} className="text-[11px] text-red-400 hover:text-red-300">Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
