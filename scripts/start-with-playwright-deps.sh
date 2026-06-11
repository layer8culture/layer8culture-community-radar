#!/usr/bin/env bash
# Azure App Service startup wrapper for the Community Radar runtime.
#
# Purpose: when TIKTOK_SCRAPER_ENABLED=true, ensure the X11/font/audio libs
# headless Chromium links against are present in the runtime container before
# launching the Next.js standalone server. The default `NODE|22-lts` App
# Service image is missing several of these (notably libnss3, libcairo2,
# libpango-1.0-0, libxkbcommon0). The Chromium binary itself lives on
# `/home/site/playwright-browsers/` and is reused across deploys.
#
# This file is mirrored to `/home/site/start-with-playwright-deps.sh` on the
# App Service (NOT to wwwroot — startup commands run before wwwroot mounts).
# To deploy a new version, upload via Kudu VFS and `chmod +x`; see
# DEPLOY-AZURE.md.
#
# The script is idempotent — apt is a fast no-op once packages are installed.
# A cold-start (post-deploy container restart) pays ~30s for the install;
# warm restarts pay <1s. We `|| true` so a transient apt failure can't bring
# the app down — the scraper will surface a clean per-hashtag error if libs
# are genuinely missing.

set +e

if [ "${TIKTOK_SCRAPER_ENABLED,,}" = "true" ]; then
  echo "[startup] Installing Chromium native deps via apt..."
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq 2>&1 | tail -5 || true
  apt-get install -y --no-install-recommends \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libxkbcommon0 \
    libasound2 libatspi2.0-0 libpango-1.0-0 libcairo2 libxshmfence1 \
    fonts-liberation 2>&1 | tail -5 || true
  echo "[startup] Chromium deps install complete."
else
  echo "[startup] TIKTOK_SCRAPER_ENABLED not set — skipping Chromium deps install."
fi

cd /home/site/wwwroot
exec node server.js
