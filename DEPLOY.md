# Deploying Community Radar to Vercel

End-to-end checklist. Allow ~10 minutes if you have all the credentials handy.

---

## Prerequisites

- The repo (`layer8culture/layer8culture-site`) pushed to GitHub with the `CommunityRadar/` directory in it.
- A Supabase project with the `DATABASE_URL` available.
- A GitHub PAT with `models:read` scope (or an OpenAI key).
- A YouTube Data API key.
- A unique Reddit User-Agent string.

Optional (can be added later):

- Reddit OAuth credentials (`REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET`) — without these the app uses the public RSS fallback, which works but has no upvote/comment counts.

---

## 1. Push the schema to Supabase (one-time, from your laptop)

Vercel does not run migrations. Do this **before** the first deploy so the production database has tables.

Use Supabase's **Session pooler** URL (port `5432`) for migrations — `prisma db push` does not work over the transaction pooler.

```bash
cd CommunityRadar
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  npm run db:generate

DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  npm run db:push

# Optional — load the demo data so the dashboard isn't empty on first visit:
DATABASE_URL="postgresql://postgres.<ref>:<pwd>@aws-0-<region>.pooler.supabase.com:5432/postgres" \
  npm run db:seed
```

Verify in the Supabase dashboard → **Table Editor** that `Influencer`, `Hashtag`, `Post`, and `Relationship` tables exist.

---

## 2. Import the project in Vercel

1. Sign in at <https://vercel.com> with your GitHub account; authorize the `layer8culture` org.
2. **Add New → Project** → pick `layer8culture/layer8culture-site`.
3. **Root Directory** → click **Edit** → set to `CommunityRadar`.
   ⚠️ This is the most important setting. Without it Vercel will try to build from the repo root and fail.
4. **Framework Preset** auto-detects as **Next.js**. Leave it.
5. **Build / Install / Output settings** — leave defaults. The repo's `vercel.json` overrides the build command to `npm run db:generate && npm run build`.

---

## 3. Environment variables

Paste these in the import screen **before** clicking Deploy. Set scope to **Production, Preview, Development** for each.

| Name | Value | Required? | Notes |
|---|---|---|---|
| `DATABASE_URL` | Supabase **Transaction pooler** URL (port `6543`) with `?pgbouncer=true&connection_limit=1` appended | ✅ | Use the pooler in production — serverless will exhaust direct connections otherwise |
| `GITHUB_TOKEN` | Fine-grained PAT with `models:read` scope | ✅ (or `OPENAI_API_KEY`) | Powers the AI comment generator |
| `GITHUB_MODELS_MODEL` | `openai/gpt-4o-mini` | optional | Override the default model |
| `OPENAI_API_KEY` | OpenAI key | optional | Used only if `GITHUB_TOKEN` is unset |
| `OPENAI_MODEL` | `gpt-4o-mini` | optional | |
| `YOUTUBE_API_KEY` | From Google Cloud Console → YouTube Data API v3 | ✅ for YouTube ingestion | Free 10,000 units/day quota |
| `REDDIT_USER_AGENT` | `community-radar/0.1 (by /u/your_reddit_username)` | ✅ for Reddit ingestion | Required even when using RSS fallback |
| `REDDIT_CLIENT_ID` | OAuth client id from <https://www.reddit.com/prefs/apps> | optional | Skip → uses RSS fallback |
| `REDDIT_CLIENT_SECRET` | OAuth client secret | optional | Skip → uses RSS fallback |
| `CRON_SECRET` | `openssl rand -hex 32` | ✅ | Authorizes the scheduled `/api/refresh` call. Vercel automatically attaches `Authorization: Bearer ${CRON_SECRET}` to cron requests when this env var is named exactly `CRON_SECRET`. |

---

## 4. Deploy

Click **Deploy**. First build takes ~2 minutes.

### If it fails

The error is almost always one of:

- **Wrong root directory** — must be `CommunityRadar`, not `/`
- **`DATABASE_URL` typo / wrong password / forgot the pooler suffix**
- **Forgot to push the schema in step 1** — Prisma will error on first DB query

---

## 5. Verify the cron job

1. Vercel project → **Settings → Cron Jobs**. You should see one entry: `POST /api/refresh` every 6 hours (`0 */6 * * *`). This was picked up automatically from `vercel.json`.
2. Click **Run** to trigger it once manually.
3. Check Supabase → Table Editor → `Post` to confirm new rows appeared.

You can also hit the endpoint manually:

```bash
curl -X POST https://<your-project>.vercel.app/api/refresh \
  -H "Authorization: Bearer <CRON_SECRET>"
```

---

## 6. Custom domain (optional)

Vercel project → **Settings → Domains** → add `radar.layer8culture.com` (or whatever subdomain you want). Add the CNAME record at your DNS provider as instructed.

---

## 7. Choose the production branch

By default, Vercel deploys from `main`. The Community Radar app currently lives on the `anvil/community-radar` branch. Pick one:

- **Option A** — merge into `main`:
  ```bash
  git checkout main
  git merge anvil/community-radar
  git push origin main
  ```
- **Option B** — keep them separate and tell Vercel: **Settings → Git → Production Branch** → `anvil/community-radar`.

---

## 8. Day-2 operations

### Upgrading Reddit ingestion to OAuth

Once your Reddit API application is approved:

1. Create a "script" app at <https://www.reddit.com/prefs/apps>.
2. Add `REDDIT_CLIENT_ID` and `REDDIT_CLIENT_SECRET` to Vercel env vars.
3. Redeploy (or trigger a new commit). The app auto-switches from RSS to OAuth — no code changes needed. Engagement velocity scoring becomes accurate.

### Rotating credentials

Each env var change in Vercel requires a redeploy. Use **Deployments → ⋯ → Redeploy** on the latest production deploy after rotating any secret.

### Schema changes

Whenever `prisma/schema.prisma` changes, re-run `npm run db:push` from your laptop against the Session pooler URL. Vercel only runs `prisma generate` (the type generator), not the migration step.

---

## Reference: ports and pooler URLs

| Use case | Supabase URL | Port |
|---|---|---|
| `prisma db push` / `db:seed` from laptop | **Session pooler** | `5432` |
| App runtime on Vercel | **Transaction pooler** + `?pgbouncer=true&connection_limit=1` | `6543` |
| App runtime locally (`npm run dev`) | Either works; Session pooler is simplest | `5432` |
