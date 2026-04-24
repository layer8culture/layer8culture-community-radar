import Link from "next/link";
import { dailySummary } from "@/lib/store";
import { OpportunityCard } from "@/components/OpportunityCard";
import { ActionBadge, PageHeader, PlatformBadge, ScoreBar, StatCard, TrendBadge } from "@/components/ui/Primitives";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const summary = await dailySummary();
  return (
    <div className="space-y-8">
      <PageHeader
        title="Today's Actions"
        subtitle="Your daily community-engagement plan, ranked by opportunity."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Posts to comment on" value={summary.topPostsToCommentOn.length} hint="High-value engagement targets" />
        <StatCard label="Influencers to follow" value={summary.influencersToFollow.length} hint="Not yet in your network" />
        <StatCard label="Conversations to join" value={summary.conversationsToJoin.length} hint="Trending in your niche" />
        <StatCard label="Creator to invite" value={summary.creatorToInvite ? 1 : 0} hint="Top collab candidate" />
      </section>

      <section>
        <SectionHeader title="🔥 Top 5 posts to comment on" link={{ href: "/opportunities", label: "See full feed →" }} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {summary.topPostsToCommentOn.length === 0 ? (
            <div className="card p-6 text-text-muted text-sm">No high-value posts right now.</div>
          ) : (
            summary.topPostsToCommentOn.map((p) => <OpportunityCard key={p.id} post={p} />)
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SectionHeader title="✦ 3 influencers to follow" link={{ href: "/influencers", label: "All influencers →" }} />
          <div className="card divide-y divide-bg-border">
            {summary.influencersToFollow.length === 0 ? (
              <div className="p-4 text-text-muted text-sm">You&apos;re following all your top targets.</div>
            ) : (
              summary.influencersToFollow.map((i) => (
                <Link
                  key={i.id}
                  href={`/influencers/${i.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-bg-elevated/40 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-bg-elevated border border-bg-border flex items-center justify-center text-xs font-mono text-accent-glow">
                    {i.handle.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">@{i.handle}</div>
                    <div className="text-xs text-text-muted truncate">{i.niche} · {i.followerCount.toLocaleString()} followers</div>
                  </div>
                  <PlatformBadge platform={i.platform} />
                  <TrendBadge trend={i.engagementTrend} />
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="⌁ 2 conversations to join" />
          <div className="card divide-y divide-bg-border">
            {summary.conversationsToJoin.length === 0 ? (
              <div className="p-4 text-text-muted text-sm">No trending conversations right now.</div>
            ) : (
              summary.conversationsToJoin.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">@{p.creatorHandle}</span>
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={p.platform} />
                      <ActionBadge action={p.suggestedAction} />
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{p.content}</p>
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-text-muted">
                    <span>velocity {p.engagementVelocity}</span>
                    <ScoreBar score={p.engagementVelocity} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title="🤝 1 creator to invite" />
        {summary.creatorToInvite ? (
          <Link
            href={`/influencers/${summary.creatorToInvite.id}`}
            className="card block p-5 hover:border-accent-bright/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-accent-bright/15 border border-accent-bright/40 flex items-center justify-center text-base font-mono text-accent-glow">
                {summary.creatorToInvite.handle.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base font-semibold">@{summary.creatorToInvite.handle}</span>
                  <PlatformBadge platform={summary.creatorToInvite.platform} />
                  <TrendBadge trend={summary.creatorToInvite.engagementTrend} />
                </div>
                <div className="text-xs text-text-secondary">
                  {summary.creatorToInvite.niche} · {summary.creatorToInvite.followerCount.toLocaleString()} followers · relevance {summary.creatorToInvite.relevanceScore}
                </div>
              </div>
              <span className="badge-accent">Invite to collab</span>
            </div>
          </Link>
        ) : (
          <div className="card p-6 text-text-muted text-sm">Add some influencers first.</div>
        )}
      </section>
    </div>
  );
}

function SectionHeader({ title, link }: { title: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">{title}</h2>
      {link && (
        <Link href={link.href} className="text-xs text-accent-glow hover:text-accent-bright">
          {link.label}
        </Link>
      )}
    </div>
  );
}
