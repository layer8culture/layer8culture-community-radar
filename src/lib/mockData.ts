import type {
  ContentIdea,
  FollowerSnapshot,
  Hashtag,
  Influencer,
  MyAccount,
  MyPost,
  Platform,
  Post,
  Relationship,
  Trend,
} from "./types";
import { computeOpportunityScore, deriveSuggestedAction, freshnessFromDate } from "./scoring";

// Hashtags are tracked per platform. The defaults skew toward the platforms we
// optimize for (Instagram + TikTok) plus a couple of ingestion-ready defaults:
// Reddit subreddits work out of the box via the public RSS fallback (no keys),
// and a YouTube query works once YOUTUBE_API_KEY is set. (Twitter/X has no
// ingestion path, so seeding twitter tags would just produce "skipped" rows.)
const SEED_HASHTAGS: Array<{ name: string; platform: Platform }> = [
  { name: "buildinpublic", platform: "instagram" },
  { name: "vibecoding", platform: "instagram" },
  { name: "codingreels", platform: "instagram" },
  { name: "indiehacker", platform: "instagram" },
  { name: "codingtiktok", platform: "tiktok" },
  { name: "techtok", platform: "tiktok" },
  { name: "buildinpublic", platform: "tiktok" },
  { name: "vibecoding", platform: "tiktok" },
  { name: "r/SideProject", platform: "reddit" },
  { name: "r/webdev", platform: "reddit" },
  { name: "AI agents tutorial", platform: "youtube" },
];

const SEED_INFLUENCERS: Array<Omit<Influencer, "id" | "socialLinks" | "createdAt" | "updatedAt">> = [
  { handle: "swyx", platform: "twitter", niche: "AI / DX", followerCount: 120000, postingFrequency: 25, engagementTrend: "rising", relevanceScore: 92 },
  { handle: "levelsio", platform: "twitter", niche: "indie hacking", followerCount: 510000, postingFrequency: 40, engagementTrend: "stable", relevanceScore: 88 },
  { handle: "theo", platform: "twitter", niche: "webdev / video", followerCount: 320000, postingFrequency: 35, engagementTrend: "rising", relevanceScore: 90 },
  { handle: "dan_abramov", platform: "twitter", niche: "react / OSS", followerCount: 450000, postingFrequency: 12, engagementTrend: "stable", relevanceScore: 80 },
  { handle: "fireship_dev", platform: "youtube", niche: "dev tutorials", followerCount: 3500000, postingFrequency: 3, engagementTrend: "rising", relevanceScore: 85 },
  { handle: "sahil", platform: "twitter", niche: "creator economy", followerCount: 180000, postingFrequency: 18, engagementTrend: "rising", relevanceScore: 87 },
  { handle: "rauchg", platform: "twitter", niche: "vercel / next", followerCount: 220000, postingFrequency: 14, engagementTrend: "stable", relevanceScore: 86 },
  { handle: "buildspace", platform: "youtube", niche: "creator coding", followerCount: 240000, postingFrequency: 4, engagementTrend: "rising", relevanceScore: 82 },
  { handle: "the.donville", platform: "instagram", niche: "creator coding", followerCount: 14000, postingFrequency: 8, engagementTrend: "rising", relevanceScore: 78 },
  { handle: "codingcafe", platform: "tiktok", niche: "live coding", followerCount: 89000, postingFrequency: 21, engagementTrend: "rising", relevanceScore: 75 },
];

const SEED_POSTS_RAW: Array<{ content: string; creatorHandle: string; platform: Platform; engagementVelocity: number; relevanceScore: number; ageHours: number }> = [
  { content: "Just shipped my AI agent that auto-replies to my DMs. Game changer for the creator workflow.", creatorHandle: "swyx", platform: "twitter", engagementVelocity: 92, relevanceScore: 95, ageHours: 2 },
  { content: "Live coding right now — building a Twitch chat moderator with GPT-4o. Come hang.", creatorHandle: "theo", platform: "twitter", engagementVelocity: 88, relevanceScore: 90, ageHours: 1 },
  { content: "Hot take: building in public is the highest leverage marketing channel for indie devs in 2026.", creatorHandle: "levelsio", platform: "twitter", engagementVelocity: 75, relevanceScore: 92, ageHours: 6 },
  { content: "We just hit 100 stars on the OSS livestream toolkit. Wild seeing the community pile in.", creatorHandle: "buildspace", platform: "youtube", engagementVelocity: 70, relevanceScore: 85, ageHours: 18 },
  { content: "Anyone else feel like the creator economy is splitting into two: technical builders vs. talkers?", creatorHandle: "sahil", platform: "twitter", engagementVelocity: 80, relevanceScore: 87, ageHours: 4 },
  { content: "New video: Edge functions in 100 seconds. AI workloads are about to get weird.", creatorHandle: "fireship_dev", platform: "youtube", engagementVelocity: 95, relevanceScore: 80, ageHours: 12 },
  { content: "Trying out vibe coding for the first time — pair programming with Claude feels like a co-founder.", creatorHandle: "rauchg", platform: "twitter", engagementVelocity: 60, relevanceScore: 88, ageHours: 8 },
  { content: "Day 30 of #buildinpublic — first paying customer for my AI scheduling tool. Tears.", creatorHandle: "the.donville", platform: "instagram", engagementVelocity: 55, relevanceScore: 78, ageHours: 5 },
  { content: "POV: you spend 3 hours debugging a CSS issue and the fix is `display: flex`. We have all been here.", creatorHandle: "codingcafe", platform: "tiktok", engagementVelocity: 65, relevanceScore: 60, ageHours: 22 },
  { content: "React 19 is finally landing in stable. The compiler changes everything for perf.", creatorHandle: "dan_abramov", platform: "twitter", engagementVelocity: 72, relevanceScore: 70, ageHours: 30 },
  { content: "What's your favorite open-source AI agent framework right now? I keep flipping between three.", creatorHandle: "swyx", platform: "twitter", engagementVelocity: 50, relevanceScore: 89, ageHours: 14 },
  { content: "Just streamed a 4-hour pair-coding session with a viewer. The community-as-collaborator era is real.", creatorHandle: "the.donville", platform: "instagram", engagementVelocity: 68, relevanceScore: 91, ageHours: 3 },
];

export function buildSeedInfluencers(): Influencer[] {
  const now = new Date().toISOString();
  return SEED_INFLUENCERS.map((i, idx) => ({
    ...i,
    id: `seed-inf-${idx + 1}`,
    socialLinks: [],
    createdAt: now,
    updatedAt: now,
  }));
}

export function buildSeedHashtags(): Hashtag[] {
  const now = new Date().toISOString();
  return SEED_HASHTAGS.map((t, idx) => ({
    id: `seed-tag-${idx}`,
    name: t.name,
    platform: t.platform,
    relevanceScore: 60 + Math.floor(Math.random() * 35),
    lastCheckedAt: now,
    createdAt: now,
  }));
}

export function buildSeedPosts(): Post[] {
  const now = Date.now();
  return SEED_POSTS_RAW.map((p, idx) => {
    const createdAt = new Date(now - p.ageHours * 36e5).toISOString();
    const opportunityScore = computeOpportunityScore({
      relevanceScore: p.relevanceScore,
      engagementVelocity: p.engagementVelocity,
      freshness: freshnessFromDate(createdAt),
    });
    const post: Post = {
      id: `seed-post-${idx + 1}`,
      content: p.content,
      creatorHandle: p.creatorHandle,
      platform: p.platform,
      engagementVelocity: p.engagementVelocity,
      relevanceScore: p.relevanceScore,
      opportunityScore,
      suggestedAction: "like",
      createdAt,
    };
    post.suggestedAction = deriveSuggestedAction(post);
    return post;
  });
}

export function buildSeedRelationships(): Relationship[] {
  const now = new Date().toISOString();
  return SEED_INFLUENCERS.slice(0, 5).map((i, idx) => ({
    id: `seed-rel-${idx + 1}`,
    creatorHandle: i.handle,
    platform: i.platform,
    liked: idx < 3,
    commented: idx < 2,
    followed: idx < 4,
    replied: idx < 1,
    invited: false,
    collaboratorScore: 60 + idx * 5,
    notes: idx === 0 ? "DM'd about a potential collab on a livestream series." : "",
    influencerId: null,
    createdAt: now,
    updatedAt: now,
  }));
}

// ---------------------------------------------------------------------------
// Organic-growth seeds (Content Studio, Trend Radar, My Growth)
// ---------------------------------------------------------------------------

export function buildSeedContentIdeas(): ContentIdea[] {
  const now = Date.now();
  const raw: Array<Pick<ContentIdea, "topic" | "platform" | "format" | "hook" | "hooks" | "scriptBeats" | "caption" | "firstComment" | "hashtags" | "audioIdea" | "cta" | "status">> = [
    {
      topic: "Why I rebuilt my side project's auth in a weekend",
      platform: "instagram",
      format: "reel",
      hook: "I deleted my entire auth system on a Friday night. Here's why that was the smartest thing I did all month.",
      hooks: [
        "I deleted my entire auth system on a Friday night.",
        "Your auth code is probably costing you users. Here's the 3-line fix.",
        "Stop building auth from scratch. Watch this first.",
      ],
      scriptBeats: [
        "0-3s: Hook on screen + face-to-cam, fast cut from the delete confirmation dialog.",
        "3-8s: The problem — 200 lines of brittle session code.",
        "8-18s: The swap — show the before/after diff in the editor.",
        "18-25s: The payoff — login works, fewer bugs, screen-record the flow.",
        "25-30s: CTA — 'Follow for the full build series.'",
      ],
      caption: "Spent Friday night deleting code instead of writing it — and shipped a better product because of it. Sometimes the move is subtraction, not addition. Full breakdown in the series 👀",
      firstComment: "Dropping the repo + the exact library I swapped to in tomorrow's post. What's the gnarliest thing you've ripped out of your codebase?",
      hashtags: ["buildinpublic", "indiehacker", "codingreels", "webdev", "saas", "softwareengineer"],
      audioIdea: "Low-fi 'focus' beat trending on Reels; cut the diff reveal on the beat drop.",
      cta: "Follow for the full build series.",
      status: "idea",
    },
    {
      topic: "3 VS Code shortcuts that feel illegal",
      platform: "tiktok",
      format: "tutorial",
      hook: "These 3 VS Code shortcuts feel illegal to know.",
      hooks: [
        "These 3 VS Code shortcuts feel illegal to know.",
        "I've coded for 8 years and only just found shortcut #2.",
        "POV: your senior dev does this and you have no idea how.",
      ],
      scriptBeats: [
        "0-2s: Hook + screen recording already rolling.",
        "2-10s: Shortcut 1 — multi-cursor edit, show the magic.",
        "10-18s: Shortcut 2 — command palette refactor.",
        "18-26s: Shortcut 3 — the one nobody knows.",
        "26-30s: 'Save this so you don't forget' + follow CTA.",
      ],
      caption: "Save this before your next coding session. Which one did you not know? 👇",
      firstComment: "If you want the full cheat-sheet PDF, comment 'SHORTCUTS' and I'll send it.",
      hashtags: ["codingtiktok", "techtok", "vscode", "programming", "webdev", "learntocode"],
      audioIdea: "Trending fast-paced 'oddly satisfying' sound; sync each shortcut to a beat.",
      cta: "Save this + follow for more.",
      status: "drafting",
    },
  ];
  return raw.map((r, idx) => ({
    ...r,
    id: `seed-idea-${idx + 1}`,
    scheduledFor: null,
    notes: "",
    createdAt: new Date(now - (idx + 1) * 36e5).toISOString(),
    updatedAt: new Date(now - (idx + 1) * 36e5).toISOString(),
  }));
}

export function buildSeedTrends(): Trend[] {
  const now = Date.now();
  const raw: Array<Omit<Trend, "id" | "createdAt">> = [
    { platform: "tiktok", type: "format", title: "Build-with-me speedrun", description: "Sped-up screen recording of shipping a feature start-to-finish under a trending timer sound. High completion rate.", momentum: "rising", exampleUrl: null },
    { platform: "tiktok", type: "sound", title: "'Oddly satisfying' tech sound", description: "Fast clicky sound used over refactor/cleanup clips. Pairs well with code-cleanup reveals.", momentum: "peaking", exampleUrl: null },
    { platform: "tiktok", type: "hashtag", title: "#techtok", description: "Broad discovery tag for developer content. Use 1 broad + 3 niche tags.", momentum: "peaking", exampleUrl: null },
    { platform: "instagram", type: "format", title: "Carousel teardown", description: "Slide 1 hook, slides 2-6 the breakdown, last slide CTA to follow. Strong save-rate driver.", momentum: "rising", exampleUrl: null },
    { platform: "instagram", type: "topic", title: "'I was today years old' dev facts", description: "Surprising-fact framing on a common tool or shortcut. High share-rate.", momentum: "rising", exampleUrl: null },
    { platform: "instagram", type: "sound", title: "Lo-fi focus beat", description: "Calm beat trending on Reels; works under build/coding montages.", momentum: "peaking", exampleUrl: null },
  ];
  return raw.map((r, idx) => ({
    ...r,
    id: `seed-trend-${idx + 1}`,
    createdAt: new Date(now - idx * 6 * 36e5).toISOString(),
  }));
}

export function buildSeedAccounts(): MyAccount[] {
  const now = new Date().toISOString();
  return [
    { id: "seed-acct-ig", platform: "instagram", handle: "the.donville", displayName: "Donville · Layer8Culture", followers: 14200, createdAt: now, updatedAt: now },
    { id: "seed-acct-tt", platform: "tiktok", handle: "donville.codes", displayName: "Donville Codes", followers: 8600, createdAt: now, updatedAt: now },
  ];
}

export function buildSeedFollowerSnapshots(): FollowerSnapshot[] {
  // 6 weekly readings per account so the growth chart has a trend out of the box.
  const out: FollowerSnapshot[] = [];
  const accounts: Array<{ id: string; start: number; weeklyGain: number }> = [
    { id: "seed-acct-ig", start: 12400, weeklyGain: 300 },
    { id: "seed-acct-tt", start: 6800, weeklyGain: 320 },
  ];
  const weekMs = 7 * 24 * 36e5;
  for (const a of accounts) {
    for (let w = 5; w >= 0; w--) {
      const followers = a.start + (5 - w) * a.weeklyGain + Math.floor(Math.random() * 80);
      const date = new Date(Date.now() - w * weekMs).toISOString();
      out.push({
        id: `seed-snap-${a.id}-${w}`,
        accountId: a.id,
        date,
        followers,
        reach: 20000 + Math.floor(Math.random() * 8000),
        profileViews: 800 + Math.floor(Math.random() * 400),
        createdAt: date,
      });
    }
  }
  return out;
}

export function buildSeedMyPosts(): MyPost[] {
  const now = Date.now();
  const raw: Array<Omit<MyPost, "id" | "accountId" | "createdAt"> & { accountId: string; ageHours: number }> = [
    { accountId: "seed-acct-ig", platform: "instagram", title: "Why I rebuilt auth in a weekend", format: "reel", postedAt: "", reach: 42000, likes: 3100, comments: 210, shares: 540, saves: 1900, follows: 320, ageHours: 0.5 },
    { accountId: "seed-acct-ig", platform: "instagram", title: "5 tools that replaced my whole stack", format: "carousel", postedAt: "", reach: 28000, likes: 2400, comments: 140, shares: 380, saves: 2600, follows: 410, ageHours: 72 },
    { accountId: "seed-acct-tt", platform: "tiktok", title: "3 VS Code shortcuts that feel illegal", format: "tutorial", postedAt: "", reach: 96000, likes: 8800, comments: 530, shares: 1200, saves: 4100, follows: 940, ageHours: 26 },
    { accountId: "seed-acct-tt", platform: "tiktok", title: "Vibe coding a game in 60 seconds", format: "voiceover", postedAt: "", reach: 18000, likes: 1300, comments: 90, shares: 160, saves: 420, follows: 110, ageHours: 120 },
  ];
  return raw.map((r, idx) => {
    const postedAt = new Date(now - r.ageHours * 36e5).toISOString();
    const { ageHours: _ageHours, ...rest } = r;
    void _ageHours;
    return { ...rest, postedAt, id: `seed-mypost-${idx + 1}`, createdAt: postedAt };
  });
}
