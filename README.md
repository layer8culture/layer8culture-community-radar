# Community Radar — Layer8Culture

A signal-tracking and authentic-engagement dashboard for tech / creator-economy creators. Built for **Donville** to surface high-value posts, track influencers, score opportunities, and generate human-sounding comments on demand.

> **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · Supabase Postgres · OpenAI

---

## Features

### Grow your own audience (Instagram + TikTok)

- **Content Studio** — the core growth engine. Turn one topic into a ready-to-shoot Reel/TikTok: 3 hook variations, a beat-by-beat script, a save/share-optimized caption, a pinned first comment, a tuned hashtag set, an audio/trend direction, and a follow-driving CTA. Save drafts, manage status (idea → drafting → scheduled → posted), and one-click **repurpose** a plan for the other platform. Uses the same AI providers as the comment generator (GitHub Models → OpenAI → deterministic fallback).
- **Trend Radar** — track trending sounds, formats, hashtags, and topics per platform with a momentum badge. "Use in Studio" deep-links any trend straight into the Content Studio.
- **My Growth** — your own accounts, follower-history sparkline with period-over-period delta, and a per-post analytics table with derived metrics that actually predict growth: engagement rate, **save rate**, **share rate**, and **follower-conversion** (follows ÷ reach). Includes a first-60-minute **engagement-window** prompt for posts you just published.

### Engage with other creators (networking CRM)

- **Daily Action Dashboard** — top 5 posts to comment on (now excludes creators you've already commented on/replied to), 3 influencers to follow, 2 conversations to join, 1 creator to invite.
- **Opportunity Feed** — posts ranked by `opportunityScore = relevance·0.4 + velocity·0.3 + freshness·0.3`, filterable by platform and minimum score.
- **Influencer Tracker** — full CRUD, sortable/filterable table, detail page per influencer.
- **Hashtag Tracker** — seeded with platform-aware Layer8Culture defaults (Instagram, TikTok, Reddit, YouTube); add/remove tags per platform.
- **Real-data ingestion** — `POST /api/refresh` (or the **↻ Refresh now** button on the Opportunity Feed) pulls live posts from **YouTube**, **Reddit**, **TikTok** (opt-in), and **Instagram** (opt-in) for each tracked hashtag, scores them, and auto-creates Influencer records for new creators discovered.
- **Suggested Comment Generator** — `POST /api/generate-comment` returns 4 tonal variations (insightful · encouraging · builder-to-builder · community-oriented). Provider is auto-selected: **GitHub Models** if `GITHUB_TOKEN` is set, **OpenAI** if `OPENAI_API_KEY` is set, otherwise deterministic fallback templates so the UI always works.
- **Relationship Tracker** — track liked / commented / followed / replied / invited per creator, plus collaborator score and notes.

---

## Quick start

```bash
cd CommunityRadar
npm install
npm run dev
```

Open <http://localhost:3000>. The app **runs out of the box on seeded mock data** — no env vars required. A banner appears at the top while you're on the in-memory store.

> ⚠️ **Mock store is local-dev only.** It lives in the Node process memory. On Vercel each serverless instance has its own copy, so writes from one request may not be visible to the next, and nothing survives a cold start. Wire up Supabase (below) before deploying.

---

## GitHub Pages overview site

This repo publishes a static overview site at:

```text
https://layer8culture.github.io/layer8culture-community-radar/
```

The Pages site is **not** an interactive demo. It is a public landing page that explains what Community Radar does. The dashboard, API routes, ingestion, persistence, and AI comment generation run in the Next.js app locally or on a server deployment.

To build the same overview artifact locally:

```bash
npm run build:pages
```

GitHub Pages deploys the generated `out/` directory through `.github/workflows/deploy-pages.yml`.

---

## Environment variables

Copy `.env.example` → `.env.local`:

```bash
# Supabase Postgres connection string. Leave blank for mock-mode.
DATABASE_URL=""

# AI provider — priority: GITHUB_TOKEN → OPENAI_API_KEY → fallback templates.

# Option A: GitHub Models (recommended; free, OpenAI-compatible).
GITHUB_TOKEN=""
GITHUB_MODELS_MODEL="openai/gpt-4o-mini"

# Option B: OpenAI (only used if GITHUB_TOKEN is not set).
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

---

## Adding an AI key

The comment generator works with **either** a GitHub Models token or an OpenAI key. If both are set, GitHub Models wins. If neither is set, the API returns deterministic template comments and labels them `fallback` in the UI.

### Option A — GitHub Models (recommended, free)

GitHub Models is a free OpenAI-compatible inference endpoint hosted by GitHub. It's separate from Copilot — a Copilot subscription is **not** required.

1. Go to <https://github.com/settings/personal-access-tokens> → **Generate new token (fine-grained)**.
2. Give it the `models:read` permission. No repository access required.
3. Copy the token into `.env.local` as `GITHUB_TOKEN=...`.
4. Optional: change `GITHUB_MODELS_MODEL` (e.g. `openai/gpt-4o`, `meta/Llama-3.3-70B-Instruct`).
5. Restart `npm run dev`. The comment-card "via" label will say **GitHub Models**.

> ⚠️ **Note**: this is a GitHub PAT with `models:read`, not your Copilot session token. The Copilot subscription token is not a stable third-party API and is not used here.

### Option B — OpenAI

1. Get a key at <https://platform.openai.com/api-keys>.
2. Set `OPENAI_API_KEY` in `.env.local`.
3. Optional: change `OPENAI_MODEL` (default `gpt-4o-mini`).
4. Make sure `GITHUB_TOKEN` is unset, or OpenAI will be skipped.

---

## Connecting Supabase

1. Create a Supabase project → **Project Settings → Database → Connection string** (use the *Session* / non-pooler URL for `prisma migrate`, or the *Transaction* pooler URL for serverless runtime).
2. Set `DATABASE_URL` in `.env.local`.
3. Generate the client and push the schema:

   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed   # optional — loads the same seed data the mock store uses
   ```

4. That's it — `src/lib/store.ts` automatically switches to Prisma/Supabase when `DATABASE_URL` is set, and falls back to the in-memory mock store otherwise. The yellow "mock store" banner in the UI disappears once you're connected. No code changes required to flip backends.

---

## Project structure

```
CommunityRadar/
├── prisma/
│   ├── schema.prisma         # Postgres schema (Supabase-compatible)
│   └── seed.ts               # Optional Postgres seeder
├── src/
│   ├── app/
│   │   ├── page.tsx          # Daily action dashboard
│   │   ├── opportunities/    # Opportunity feed
│   │   ├── influencers/      # List + detail + form
│   │   ├── hashtags/
│   │   ├── relationships/
│   │   └── api/              # All Next.js route handlers
│   ├── components/           # Sidebar, OpportunityCard, InfluencerForm, ui/
│   └── lib/
│       ├── types.ts          # Shared domain types (mirror Prisma enums)
│       ├── scoring.ts        # opportunityScore + suggestedAction logic
│       ├── store.ts          # Data store (mock today, Prisma-ready)
│       ├── mockData.ts       # Seed data for both backends
│       └── openai.ts         # Comment generation + fallback
├── tailwind.config.ts        # Dark theme tokens
└── .env.example
```

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev`        | Next dev server |
| `npm run build`      | Production build |
| `npm run start`      | Run the production build |
| `npm run lint`       | ESLint (next/core-web-vitals) |
| `npm run typecheck`  | `tsc --noEmit` |
| `npm run db:generate`| `prisma generate` |
| `npm run db:push`    | `prisma db push` (sync schema to Supabase) |
| `npm run db:seed`    | Seed the connected Postgres database |

---

## Deploying

Production runs on **Azure App Service** (Linux, Node 22) backed by **Azure Database for PostgreSQL Flexible Server**, with a **Logic App** as the 6-hourly cron. End-to-end runbook: [`DEPLOY-AZURE.md`](./DEPLOY-AZURE.md). CI/CD is wired through [`.github/workflows/deploy-azure.yml`](./.github/workflows/deploy-azure.yml) using a GitHub OIDC federated credential — pushes to `main` deploy automatically.

The original Vercel + Supabase setup is still documented in [`DEPLOY.md`](./DEPLOY.md) for reference / rollback. Pick whichever target you want; both work, but production is now Azure.

---

## Roadmap (stretch goals not yet wired)

- "Layer8Culture themes" tagging system on posts.
- "Mark complete" toggle on Daily Actions.
- Auto-import follower/post analytics from the Instagram & TikTok APIs into **My Growth** (today they're entered manually).
- Twitter/X ingestion (paid / approval-gated API).

> **TikTok note:** TikTok ingestion ships behind the `TIKTOK_SCRAPER_ENABLED` flag and uses headless Chromium (`playwright-core`). It's free but only runs on hosts that can carry a ~300MB browser binary — Azure App Service B2+ or a containerised runtime. Vercel deploys should leave the flag unset. See `.env.example` and `DEPLOY-AZURE.md`. Expect the fetcher to need updating every few months as TikTok rotates its internal XHRs.

> **Instagram note:** Instagram ingestion uses the official **Graph API hashtag search** and is gated behind `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_USER_ID` (a Business/Creator account linked to a Facebook Page). Limits: 30 unique hashtags per account per rolling 7 days, and hashtag media doesn't expose the owner's username (a handle is derived from an @mention in the caption when present). Without the vars set, Instagram hashtags are skipped with a clear reason. See `.env.example`.

---

## Design notes

- **Dark theme tokens** live in `tailwind.config.ts` (`bg`, `accent`, `text`). Background `#0b0b0c`, accent electric blue `#1e90ff`.
- **State management** is intentionally simple (`useState`/`useEffect`). No Redux, no Zustand.
- **Server vs client** — pages that need fresh data on every load (Dashboard) are server components calling the store directly. Interactive pages (Opportunities, Influencers, Hashtags, Relationships, Content Studio, Trend Radar, My Growth) are client components that hit the API routes.
- **Two product surfaces** — the **growth** features (Content Studio, Trend Radar, My Growth) optimize your *own* short-form content, which is what actually drives organic IG/TikTok follower growth. The **networking** features (Opportunity Feed, Influencers, Hashtags, Networking) help you build relationships with other creators.

> **Note for a connected database:** the growth features add new tables (`ContentIdea`, `Trend`, `MyAccount`, `FollowerSnapshot`, `MyPost`). After pulling these changes, run `npm run db:push` (or a migration) so the Postgres backend has them. The zero-config in-memory mock store already includes them.
# layer8culture-community-radar
# layer8culture-community-radar
# layer8culture-community-radar
# layer8culture-community-radar
