# Deploying Community Radar to Azure

End-to-end checklist for the Azure deployment. The live deploy already exists; this doc is the runbook for rebuilding it from scratch or onboarding a new operator.

> **Quick links**
> - App URL: `https://app-community-radar-ff1d31.azurewebsites.net`
> - Resource group: `rg-community-radar` (Central US)
> - Region: **Central US** — Postgres + App Service + Logic App. (We tried `eastus`/`eastus2` first; the Visual Studio Enterprise subscription is quota-restricted there.)

---

## Architecture

| Concern | Resource |
|---|---|
| Compute | **Azure App Service** — Linux, Node 22, Basic B1 plan `asp-community-radar` |
| App | Web App `app-community-radar-ff1d31` (Next.js standalone bundle, startup `node server.js`) |
| Database | **Azure Database for PostgreSQL Flexible Server** — Burstable `B1ms`, PG 16, server `psql-cradar-ff1d31`, db `community_radar` |
| Cron (6-hourly `POST /api/refresh`) | **Logic App (Consumption)** `logic-community-radar-refresh` — Recurrence trigger → HTTP POST with `Authorization: Bearer $CRON_SECRET` |
| Secrets | App Service application settings (Key Vault optional, not wired) |
| CI/CD | **GitHub Actions** workflow `.github/workflows/deploy-azure.yml`, OIDC federated credential on Entra app `gh-oidc-community-radar` |

---

## Prerequisites

- Azure CLI logged into the Visual Studio Enterprise subscription (`az account show`).
- A GitHub repo (this one) with the three Azure secrets configured (see step 7).
- Optional: YouTube Data API key, Reddit OAuth credentials, GitHub Models PAT or OpenAI key.

---

## 1. Resource group + providers

```bash
az group create -n rg-community-radar -l centralus
for p in Microsoft.Web Microsoft.DBforPostgreSQL Microsoft.Logic Microsoft.Insights; do
  az provider register -n "$p" --wait
done
```

## 2. Postgres Flexible Server

```bash
SERVER=psql-cradar-$(openssl rand -hex 3)
PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
az postgres flexible-server create \
  --resource-group rg-community-radar \
  --name "$SERVER" \
  --location centralus \
  --tier Burstable --sku-name Standard_B1ms \
  --version 16 --storage-size 32 \
  --admin-user cradar_admin \
  --admin-password "$PASS" \
  --public-access 0.0.0.0 \
  --yes

# Application DB
az postgres flexible-server db create \
  --resource-group rg-community-radar \
  --server-name "$SERVER" \
  --database-name community_radar

# Allow your workstation IP for one-time schema push (replace IP)
MY_IP=$(curl -s -4 https://api.ipify.org)
az postgres flexible-server firewall-rule create \
  --resource-group rg-community-radar \
  --name "$SERVER" \
  --rule-name allow-workstation \
  --start-ip-address "$MY_IP" --end-ip-address "$MY_IP"
```

Connection string:

```text
postgresql://cradar_admin:<URL-ENCODED-PWD>@<SERVER>.postgres.database.azure.com:5432/community_radar?sslmode=require
```

> `?sslmode=require` is mandatory on Azure Postgres. We are **not** using a pooler (App Service is a long-lived process, not serverless) — no need for the `pgbouncer` workaround that the Vercel setup uses.

## 3. Push the Prisma schema

From this repo's directory:

```bash
DATABASE_URL="<connection-string-above>" npm run db:generate
DATABASE_URL="<connection-string-above>" npx prisma db push --skip-generate
DATABASE_URL="<connection-string-above>" npx tsx prisma/seed.ts   # optional
```

Verify in the Azure portal → Postgres server → Databases → `community_radar` → tables: `Influencer`, `Hashtag`, `Post`, `Relationship`.

## 4. App Service plan + web app

```bash
az appservice plan create \
  --name asp-community-radar \
  --resource-group rg-community-radar \
  --location centralus \
  --is-linux --sku B1

az webapp create \
  --name app-community-radar-ff1d31 \
  --plan asp-community-radar \
  --resource-group rg-community-radar \
  --runtime "NODE:22-lts" \
  --https-only true

az webapp config set \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar \
  --startup-file "node server.js"
```

## 5. Application settings

Generate a `CRON_SECRET` and store all the runtime config:

```bash
CRON_SECRET=$(openssl rand -hex 32)

az webapp config appsettings set \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar \
  --settings \
    "DATABASE_URL=<conn-string>" \
    "CRON_SECRET=$CRON_SECRET" \
    "GITHUB_TOKEN=<your-pat-or-blank>" \
    "GITHUB_MODELS_MODEL=openai/gpt-4o-mini" \
    "OPENAI_API_KEY=" \
    "OPENAI_MODEL=gpt-4o-mini" \
    "YOUTUBE_API_KEY=<your-key-or-blank>" \
    "REDDIT_USER_AGENT=community-radar/0.1 (by /u/your_username)" \
    "REDDIT_CLIENT_ID=" \
    "REDDIT_CLIENT_SECRET=" \
    "WEBSITE_NODE_DEFAULT_VERSION=~22" \
    "SCM_DO_BUILD_DURING_DEPLOYMENT=false" \
    "ENABLE_ORYX_BUILD=false" \
    "WEBSITES_PORT=8080" \
    "NODE_ENV=production"
```

> **Don't enable Oryx build.** Set `SCM_DO_BUILD_DURING_DEPLOYMENT=false`. We ship a pre-built Next.js standalone bundle from GitHub Actions. If Oryx is on, it will `npm install --production`, which omits TypeScript, which makes Next.js silently drop the `tsconfig.paths` mapping and the build fails with "Cannot resolve '@/...'".

### TikTok scraper (optional)

TikTok ingestion uses headless Chromium via `playwright-core`. It's opt-in.
The current production app is configured this way:

1. **App Service plan**: B1 works for single-shot scrapes (Node ~200MB +
   Chromium headless-shell ~250MB ≈ ~500MB peak, within B1's 1.75GB envelope).
   Bump to **B2** if you observe OOM under sustained scraping.

2. **App Settings** (all already set on `app-community-radar-ff1d31`):

   ```bash
   az webapp config appsettings set \
     --name app-community-radar-ff1d31 \
     --resource-group rg-community-radar \
     --settings \
       "TIKTOK_SCRAPER_ENABLED=true" \
       "TIKTOK_SCRAPER_TIMEOUT_MS=30000" \
       "TIKTOK_SCRAPER_MAX_POSTS=15" \
       "PLAYWRIGHT_BROWSERS_PATH=/home/site/playwright-browsers"
   ```

   The non-default `PLAYWRIGHT_BROWSERS_PATH` puts the browser under
   `/home/site/` (the SMB-backed persistent share) so it survives container
   restarts and code deploys — Oryx wipes `/home/site/wwwroot/node_modules`
   on each deploy but never touches the rest of `/home/site/`.

3. **Browser binary**: Chromium is pre-installed at
   `/home/site/playwright-browsers/`. It only needs to be re-installed when
   you bump `playwright-core` to a new minor version (the browser revision is
   pinned per Playwright release). From any host with `az`:

   ```bash
   TOKEN=$(az account get-access-token --resource https://management.azure.com --query accessToken -o tsv)
   curl -s -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
     -d '{"command":"bash -c \"export PLAYWRIGHT_BROWSERS_PATH=/home/site/playwright-browsers; export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1; cd /tmp && npx -y playwright@<VERSION> install chromium chromium-headless-shell\"","dir":"/home"}' \
     https://app-community-radar-ff1d31.scm.azurewebsites.net/api/command
   ```

   Replace `<VERSION>` with the version from `package.json`'s `playwright-core`
   (e.g. `1.60.0`). `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` is needed
   because the Kudu sidecar lacks the X11 libs `--with-deps` checks for; the
   runtime container has them installed by the startup script below.

4. **Native libraries** (libnss3, libcairo2, libpango, libxkbcommon, etc.):
   the default `NODE|22-lts` App Service image is missing several libs
   Chromium links against. They're installed at container start by
   `/home/site/start-with-playwright-deps.sh` (idempotent — apt is fast no-op
   when packages are already present), wired in via:

   ```bash
   az webapp config set \
     --name app-community-radar-ff1d31 \
     --resource-group rg-community-radar \
     --always-on true \
     --startup-file "bash /home/site/start-with-playwright-deps.sh"
   ```

   `--always-on true` matters: the apt install adds ~30s to cold start, and
   without alwaysOn the container would re-pay that cost every time it slept.
   The script is checked into the repo at `scripts/start-with-playwright-deps.sh`
   for reference — it's stored on `/home/site/` because App Service's startup
   command runs *before* `wwwroot` is mounted.

5. **Cleaner alternative** (not currently used): switch the App Service to a
   custom container image based on `mcr.microsoft.com/playwright:v1.60.0-jammy`
   with the standalone Next.js bundle copied in. Removes steps 3 and 4.

6. **Optional**: set `TIKTOK_PROXY_URL=http://user:pass@host:port` if Azure
   egress IPs start getting challenge-verified by TikTok.

When `TIKTOK_SCRAPER_ENABLED` is unset, refresh runs as before — tiktok
hashtags appear in the report under `skipped` with
`reason: "TIKTOK_SCRAPER_ENABLED not set"` and no Chromium is loaded.

## 6. GitHub Actions OIDC federated credential

```bash
SUB=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)
REPO=donvilletomlinson/layer8culture-community-radar

APP_ID=$(az ad app create --display-name gh-oidc-community-radar --query appId -o tsv)
az ad sp create --id "$APP_ID"
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/$SUB/resourceGroups/rg-community-radar"

cat > /tmp/fc.json <<EOF
{
  "name": "gh-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${REPO}:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF
az ad app federated-credential create --id "$APP_ID" --parameters @/tmp/fc.json
```

## 7. GitHub repo secrets

In **Settings → Secrets and variables → Actions**, add three repo secrets:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | output `appId` from step 6 |
| `AZURE_TENANT_ID` | `az account show --query tenantId -o tsv` |
| `AZURE_SUBSCRIPTION_ID` | `az account show --query id -o tsv` |

## 8. Push and deploy

```bash
git push origin main
```

The `.github/workflows/deploy-azure.yml` workflow:

1. Installs full deps (`npm ci`).
2. `prisma generate`.
3. Azure OIDC login, then **pulls `DATABASE_URL` from App Service app settings** and exports it for the build step. This is required because several pages (`/opportunities`, `/influencers`, `/hashtags`, `/relationships`) prerender to static HTML at build time. The root layout reads `usingMock = !process.env.DATABASE_URL`, so without `DATABASE_URL` during `next build` the yellow "Running on in-memory mock data" banner gets baked into the static HTML — even though the live server has a real DB connection.
4. `next build` — produces `.next/standalone/` (a self-contained server bundle with a minimal `node_modules`).
5. Assembles a deploy directory by copying `.next/standalone/` + `public/` + `.next/static/` + `prisma/`.
6. Zips and uploads via `azure/webapps-deploy@v3` using the existing OIDC session.

Watch the run under the **Actions** tab.

## 9. Smoke test

```bash
URL=https://app-community-radar-ff1d31.azurewebsites.net
curl -s -o /dev/null -w "HTTP %{http_code}\n" "$URL"
curl -s "$URL/api/influencers" | jq '.influencers | length'
```

The dashboard should not show the yellow "mock store" banner — that means Prisma is talking to Azure Postgres.

## 10. Logic App cron

Already created in this deployment. To rebuild:

```bash
cat > /tmp/cron.json <<'EOF'
{
  "definition": {
    "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
    "contentVersion": "1.0.0.0",
    "triggers": {
      "Recurrence": {
        "type": "Recurrence",
        "recurrence": { "frequency": "Hour", "interval": 6 }
      }
    },
    "actions": {
      "Call_refresh_endpoint": {
        "type": "Http",
        "inputs": {
          "method": "POST",
          "uri": "https://app-community-radar-ff1d31.azurewebsites.net/api/refresh",
          "headers": {
            "Authorization": "Bearer <CRON_SECRET>",
            "Content-Type": "application/json"
          },
          "body": {},
          "retryPolicy": { "type": "fixed", "count": 2, "interval": "PT30S" }
        },
        "runAfter": {}
      }
    }
  }
}
EOF

az logic workflow create \
  --resource-group rg-community-radar \
  --location centralus \
  --name logic-community-radar-refresh \
  --definition /tmp/cron.json
```

Run on demand:

```bash
SUB=$(az account show --query id -o tsv)
az rest --method POST \
  --uri "https://management.azure.com/subscriptions/${SUB}/resourceGroups/rg-community-radar/providers/Microsoft.Logic/workflows/logic-community-radar-refresh/triggers/Recurrence/run?api-version=2019-05-01"
```

Check runs:

```bash
az rest --method GET \
  --uri "https://management.azure.com/subscriptions/${SUB}/resourceGroups/rg-community-radar/providers/Microsoft.Logic/workflows/logic-community-radar-refresh/runs?api-version=2019-05-01&\$top=5" \
  --query "value[].{name:name,status:properties.status,startTime:properties.startTime}" -o table
```

---

## Day-2 operations

### Rotating secrets

```bash
az webapp config appsettings set \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar \
  --settings "<KEY>=<new value>"
# App Service restarts automatically.
```

If you rotate `CRON_SECRET`, also update the Logic App's HTTP header.

### Schema changes

After editing `prisma/schema.prisma`, re-run from your laptop:

```bash
DATABASE_URL="<azure-conn-string>" npx prisma db push
```

The CI build only runs `prisma generate`, not `db push`. Postgres firewall must include your IP (see step 2).

### Tail logs

```bash
az webapp log tail \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar
```

### Restart the app

```bash
az webapp restart \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar
```

### Roll back

```bash
az webapp deployment list \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar \
  --query "[].{id:id,received:received_time,active:active}" -o table

az webapp deployment source config-zip \
  --name app-community-radar-ff1d31 \
  --resource-group rg-community-radar \
  --src <previous-app.zip>
```

---

## Cost (rough)

| Resource | SKU | ~Monthly |
|---|---|---|
| App Service plan | B1 Linux | ~$13 |
| Postgres Flexible Server | Burstable B1ms + 32 GiB | ~$12-15 |
| Logic App | Consumption, 1 run / 6 h | ~$0 |
| **Total** | | **~$25-30** |

---

## Known gotchas

- **Region**: this subscription is quota-restricted in `eastus` and `eastus2` for the Postgres Flexible Server SKUs. We use `centralus` for everything.
- **Node runtime**: App Service Linux currently exposes `NODE:22-lts` and `NODE:24-lts`. Node 20 is **not** a valid `--runtime` value here even though Next.js 14 nominally targets it.
- **Standalone output**: `next.config.mjs` sets `output: "standalone"`. The build's `.next/standalone/` is the source of truth for deploys. Don't ship the whole repo + `node_modules` — Oryx will repackage it into a broken `node_modules.tar.gz`.
- **Prisma engine**: the standalone bundle includes `node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node`. `next.config.mjs` has `outputFileTracingIncludes` to force this in.
- **SCM basic auth**: disabled by default. Enable only temporarily for `curl`-based Kudu diagnostics, then disable again.
