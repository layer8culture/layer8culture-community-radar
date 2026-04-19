# Community Radar — Layer8Culture

A signal-tracking and authentic-engagement dashboard for tech / creator-economy creators. Built for **Donville** to surface high-value posts, track influencers, score opportunities, and generate human-sounding comments on demand.

> **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · Supabase Postgres · OpenAI

---

## Features

- **Daily Action Dashboard** — top 5 posts to comment on, 3 influencers to follow, 2 conversations to join, 1 creator to invite.
- **Opportunity Feed** — posts ranked by `opportunityScore = relevance·0.4 + velocity·0.3 + freshness·0.3`, filterable by platform and minimum score.
- **Influencer Tracker** — full CRUD, sortable/filterable table, detail page per influencer.
- **Hashtag Tracker** — seeded with the Layer8Culture defaults; add/remove tags per platform.
- **Real-data ingestion** — `POST /api/refresh` (or the **↻ Refresh now** button on the Opportunity Feed) pulls live posts from **YouTube** and **Reddit** for each tracked hashtag, scores them, and auto-creates Influencer records for new creators discovered.
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

## Deploying to Vercel

See [`DEPLOY.md`](./DEPLOY.md) for the full step-by-step checklist (root directory, env vars, cron verification, custom domain, branch selection, day-2 ops). Quick version:

1. Push the `CommunityRadar/` directory to GitHub.
2. Import the project in Vercel and set the **root directory** to `CommunityRadar`. The included `vercel.json` already pins the build command to `npm run db:generate && npm run build` and registers a 6-hourly cron hitting `POST /api/refresh`.
3. Use Supabase's **Transaction pooler** URL (port `6543`) for `DATABASE_URL` in Vercel, with `?pgbouncer=true&connection_limit=1` appended — required for serverless.
4. Add env vars in Project → Settings → Environment Variables:
   - `DATABASE_URL` (transaction pooler)
   - `GITHUB_TOKEN` (recommended) or `OPENAI_API_KEY`
   - `YOUTUBE_API_KEY`, `REDDIT_USER_AGENT`, `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` for ingestion
   - `CRON_SECRET` — random string; required to authorize the scheduled `/api/refresh` calls
5. Deploy.

---

## Roadmap (stretch goals not yet wired)

- "Layer8Culture themes" tagging system on posts.
- "Mark complete" toggle on Daily Actions.
- Engagement-actions-per-day analytics.
- Twitter/X, Instagram, TikTok ingestion (paid / approval-gated APIs).

---

## Design notes

- **Dark theme tokens** live in `tailwind.config.ts` (`bg`, `accent`, `text`). Background `#0b0b0c`, accent electric blue `#1e90ff`.
- **State management** is intentionally simple (`useState`/`useEffect`). No Redux, no Zustand.
- **Server vs client** — pages that need fresh data on every load (Dashboard) are server components calling the store directly. Interactive pages (Opportunities, Influencers, Hashtags, Relationships) are client components that hit the API routes.
# layer8culture-community-radar
# layer8culture-community-radar
