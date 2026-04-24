import { mkdir, rm, writeFile } from "node:fs/promises";

const outDir = new URL("../out/", import.meta.url);
const screenshotsDir = new URL("screenshots/", outDir);

const features = [
  {
    eyebrow: "Discover",
    title: "Find the conversations worth joining.",
    body:
      "Community Radar scores posts and discussions by relevance, velocity, and freshness so high-signal opportunities rise above the noise.",
    details: ["Ranked opportunity feed", "Platform and score filters", "YouTube and Reddit ingestion when configured"],
  },
  {
    eyebrow: "Track",
    title: "Know which creators are moving culture.",
    body:
      "Keep a living map of influencers, niches, social links, posting cadence, engagement trends, and relationship status.",
    details: ["Influencer CRM", "Hashtag watchlist", "Relationship history"],
  },
  {
    eyebrow: "Act",
    title: "Turn signals into authentic daily actions.",
    body:
      "The dashboard turns raw signal into a practical plan: posts to comment on, creators to follow, conversations to join, and collaborators to invite.",
    details: ["Daily action queue", "Suggested comment tones", "Follow-up and invite tracking"],
  },
];

const steps = [
  ["1", "Configure", "Add the hashtags, platforms, and creator niches that define the Layer8Culture community surface area."],
  ["2", "Prioritize", "Community Radar scores each signal so the most relevant conversations and creators show up first."],
  ["3", "Engage", "Use the daily action plan and comment suggestions to participate with context instead of chasing vanity metrics."],
];

const screenshots = [
  {
    file: "daily-actions.svg",
    title: "Daily action dashboard",
    caption: "A focused queue of posts to comment on, creators to follow, conversations to join, and one high-fit collaborator to invite.",
  },
  {
    file: "opportunity-feed.svg",
    title: "Opportunity feed",
    caption: "Ranked community signals with opportunity, relevance, and velocity scores so the strongest conversations surface first.",
  },
  {
    file: "creator-tracker.svg",
    title: "Creator tracker",
    caption: "A lightweight creator CRM for handles, platforms, niches, engagement trends, social links, and relationship context.",
  },
];

const screenshotSvgs = {
  "daily-actions.svg": screenshotShell(
    "Today's Actions",
    "Your daily community-engagement plan, ranked by opportunity.",
    [
      statRow("Posts to comment on", "5", "High-value targets", "#70e1ff"),
      statRow("Influencers to follow", "3", "Not yet in network", "#46d39a"),
      statRow("Conversations to join", "2", "Trending in niche", "#ffc857"),
      statRow("Creator to invite", "1", "Top collab candidate", "#ff7ab6"),
    ].join(""),
    [
      cardRow("@founder_signal", "AI agents are changing how small teams ship...", "comment", "92"),
      cardRow("@culturestack", "The next creator economy moat is trust at scale.", "join", "84"),
      cardRow("@builderops", "Community-led distribution beats paid reach when...", "invite", "88"),
    ].join(""),
  ),
  "opportunity-feed.svg": screenshotShell(
    "Opportunity Feed",
    "Posts ranked by opportunity score. Generate authentic comments inline.",
    filterBar("Platform: All", "Min score: 70", "12 posts"),
    [
      opportunityRow("@makerlane", "YouTube", "Relevance", "88", "Velocity", "91", "Opportunity", "94"),
      opportunityRow("@indieops", "Reddit", "Relevance", "82", "Velocity", "79", "Opportunity", "86"),
      opportunityRow("@creatortools", "YouTube", "Relevance", "77", "Velocity", "72", "Opportunity", "81"),
    ].join(""),
  ),
  "creator-tracker.svg": screenshotShell(
    "Influencers",
    "Track creators, niches, and engagement trends.",
    filterBar("Search: creator or niche", "All platforms", "34 influencers"),
    [
      tableRow("@founder_signal", "YouTube", "AI builders", "rising", "94"),
      tableRow("@culturestack", "Reddit", "Creator economy", "stable", "87"),
      tableRow("@makerlane", "YouTube", "Solo founders", "rising", "83"),
      tableRow("@indieops", "Reddit", "Ops systems", "rising", "79"),
    ].join(""),
  ),
};

function screenshotShell(title, subtitle, topContent, bodyContent) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="820" viewBox="0 0 1280 820" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)} screenshot</title>
  <desc id="desc">${escapeXml(subtitle)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#101722"/>
      <stop offset="1" stop-color="#06070a"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2f8cff"/>
      <stop offset="1" stop-color="#70e1ff"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="24" stdDeviation="28" flood-color="#000000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="1280" height="820" fill="url(#bg)"/>
  <circle cx="1040" cy="40" r="360" fill="#2f8cff" opacity="0.12"/>
  <circle cx="120" cy="150" r="280" fill="#70e1ff" opacity="0.08"/>
  <rect x="54" y="50" width="1172" height="720" rx="34" fill="#0b0f16" stroke="#273142" filter="url(#shadow)"/>
  <rect x="54" y="50" width="230" height="720" rx="34" fill="#111722" stroke="#273142"/>
  <rect x="78" y="82" width="42" height="42" rx="12" fill="url(#accent)"/>
  <text x="99" y="109" text-anchor="middle" fill="#ffffff" font-size="22" font-family="Arial, sans-serif" font-weight="700">8</text>
  <text x="136" y="99" fill="#f4f7fb" font-size="18" font-family="Arial, sans-serif" font-weight="700">Community Radar</text>
  <text x="136" y="120" fill="#9aa8bd" font-size="11" font-family="Arial, sans-serif" letter-spacing="2">LAYER8CULTURE</text>
  ${navItem(92, "Dashboard", true)}
  ${navItem(146, "Opportunity Feed", false)}
  ${navItem(200, "Influencers", false)}
  ${navItem(254, "Hashtags", false)}
  ${navItem(308, "Relationships", false)}
  <text x="320" y="110" fill="#f4f7fb" font-size="32" font-family="Arial, sans-serif" font-weight="700">${escapeXml(title)}</text>
  <text x="320" y="140" fill="#9aa8bd" font-size="16" font-family="Arial, sans-serif">${escapeXml(subtitle)}</text>
  ${topContent}
  ${bodyContent}
</svg>`;
}

function navItem(y, label, active) {
  const fill = active ? "#132740" : "transparent";
  const stroke = active ? "#2f8cff" : "transparent";
  const text = active ? "#70e1ff" : "#c8d2e1";
  return `<rect x="76" y="${y}" width="184" height="38" rx="11" fill="${fill}" stroke="${stroke}" opacity="0.95"/>
  <text x="98" y="${y + 24}" fill="${text}" font-size="14" font-family="Arial, sans-serif">${label}</text>`;
}

function statRow(label, value, hint, color) {
  const index = statRow.index++;
  const x = 320 + index * 215;
  return `<rect x="${x}" y="178" width="190" height="118" rx="18" fill="#111722" stroke="#273142"/>
  <text x="${x + 18}" y="210" fill="#9aa8bd" font-size="12" font-family="Arial, sans-serif" letter-spacing="1">${label.toUpperCase()}</text>
  <text x="${x + 18}" y="252" fill="${color}" font-size="42" font-family="Arial, sans-serif" font-weight="700">${value}</text>
  <text x="${x + 18}" y="278" fill="#c8d2e1" font-size="14" font-family="Arial, sans-serif">${hint}</text>`;
}
statRow.index = 0;

function cardRow(handle, content, action, score) {
  const index = cardRow.index++;
  const y = 335 + index * 125;
  return `<rect x="320" y="${y}" width="835" height="96" rx="20" fill="#111722" stroke="#273142"/>
  <circle cx="358" cy="${y + 38}" r="20" fill="#172233" stroke="#273142"/>
  <text x="358" y="${y + 44}" text-anchor="middle" fill="#70e1ff" font-size="14" font-family="Arial, sans-serif" font-weight="700">${handle.slice(1, 3).toUpperCase()}</text>
  <text x="392" y="${y + 32}" fill="#f4f7fb" font-size="16" font-family="Arial, sans-serif" font-weight="700">${handle}</text>
  <text x="392" y="${y + 58}" fill="#c8d2e1" font-size="15" font-family="Arial, sans-serif">${content}</text>
  <rect x="1000" y="${y + 24}" width="76" height="28" rx="10" fill="#13311f" stroke="#46d39a"/>
  <text x="1038" y="${y + 43}" text-anchor="middle" fill="#46d39a" font-size="12" font-family="Arial, sans-serif">${action}</text>
  <text x="1115" y="${y + 51}" text-anchor="middle" fill="#70e1ff" font-size="28" font-family="Arial, sans-serif" font-weight="700">${score}</text>`;
}
cardRow.index = 0;

function filterBar(left, middle, right) {
  return `<rect x="320" y="178" width="835" height="74" rx="18" fill="#111722" stroke="#273142"/>
  <rect x="344" y="200" width="228" height="30" rx="10" fill="#0b0f16" stroke="#273142"/>
  <text x="362" y="220" fill="#c8d2e1" font-size="14" font-family="Arial, sans-serif">${left}</text>
  <rect x="590" y="200" width="190" height="30" rx="10" fill="#0b0f16" stroke="#273142"/>
  <text x="608" y="220" fill="#c8d2e1" font-size="14" font-family="Arial, sans-serif">${middle}</text>
  <text x="1118" y="220" text-anchor="end" fill="#9aa8bd" font-size="14" font-family="Arial, sans-serif">${right}</text>`;
}

function opportunityRow(handle, platform, labelA, valueA, labelB, valueB, labelC, valueC) {
  const index = opportunityRow.index++;
  const y = 290 + index * 142;
  return `<rect x="320" y="${y}" width="835" height="112" rx="20" fill="#111722" stroke="#273142"/>
  <text x="346" y="${y + 34}" fill="#f4f7fb" font-size="17" font-family="Arial, sans-serif" font-weight="700">${handle}</text>
  <rect x="1046" y="${y + 18}" width="78" height="26" rx="10" fill="#172233" stroke="#273142"/>
  <text x="1085" y="${y + 36}" text-anchor="middle" fill="#c8d2e1" font-size="12" font-family="Arial, sans-serif">${platform}</text>
  <text x="346" y="${y + 66}" fill="#c8d2e1" font-size="15" font-family="Arial, sans-serif">Signal: conversation velocity is climbing across creator audiences.</text>
  ${metric(348, y + 86, labelA, valueA)}
  ${metric(568, y + 86, labelB, valueB)}
  ${metric(788, y + 86, labelC, valueC)}
  `;
}
opportunityRow.index = 0;

function metric(x, y, label, value) {
  return `<text x="${x}" y="${y}" fill="#9aa8bd" font-size="11" font-family="Arial, sans-serif">${label}</text>
  <rect x="${x + 82}" y="${y - 10}" width="90" height="8" rx="4" fill="#273142"/>
  <rect x="${x + 82}" y="${y - 10}" width="${Number(value) * 0.9}" height="8" rx="4" fill="#70e1ff"/>
  <text x="${x + 184}" y="${y}" fill="#f4f7fb" font-size="12" font-family="Arial, sans-serif">${value}</text>`;
}

function tableRow(handle, platform, niche, trend, relevance) {
  const index = tableRow.index++;
  const y = 305 + index * 78;
  return `<rect x="320" y="${y}" width="835" height="58" rx="14" fill="${index % 2 ? "#0f141c" : "#111722"}" stroke="#273142"/>
  <text x="346" y="${y + 36}" fill="#f4f7fb" font-size="15" font-family="Arial, sans-serif" font-weight="700">${handle}</text>
  <text x="520" y="${y + 36}" fill="#c8d2e1" font-size="14" font-family="Arial, sans-serif">${platform}</text>
  <text x="670" y="${y + 36}" fill="#c8d2e1" font-size="14" font-family="Arial, sans-serif">${niche}</text>
  <rect x="880" y="${y + 18}" width="72" height="24" rx="9" fill="#12311f" stroke="#46d39a"/>
  <text x="916" y="${y + 35}" text-anchor="middle" fill="#46d39a" font-size="12" font-family="Arial, sans-serif">${trend}</text>
  <text x="1096" y="${y + 37}" text-anchor="middle" fill="#70e1ff" font-size="20" font-family="Arial, sans-serif" font-weight="700">${relevance}</text>`;
}
tableRow.index = 0;

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const html = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Community Radar - Layer8Culture</title>
    <meta
      name="description"
      content="Community Radar helps Layer8Culture find high-signal creator conversations, track influencers, and plan authentic engagement."
    />
    <style>
      :root {
        color-scheme: dark;
        --bg: #08090b;
        --panel: #11141a;
        --panel-2: #161b23;
        --line: #273142;
        --text: #f4f7fb;
        --muted: #9aa8bd;
        --soft: #c8d2e1;
        --accent: #2f8cff;
        --accent-2: #70e1ff;
        --green: #46d39a;
        --amber: #ffc857;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at 20% 10%, rgba(47, 140, 255, 0.2), transparent 34rem),
          radial-gradient(circle at 80% 0%, rgba(112, 225, 255, 0.14), transparent 30rem),
          linear-gradient(180deg, #0d1118 0%, var(--bg) 52%, #06070a 100%);
      }

      a {
        color: inherit;
      }

      .wrap {
        width: min(1120px, calc(100% - 40px));
        margin: 0 auto;
      }

      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 0;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 12px;
        text-decoration: none;
      }

      .mark {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: linear-gradient(135deg, var(--accent), var(--accent-2));
        color: white;
        font-weight: 800;
        box-shadow: 0 0 36px rgba(47, 140, 255, 0.45);
      }

      .brand strong {
        display: block;
        letter-spacing: -0.03em;
      }

      .brand span {
        display: block;
        margin-top: 2px;
        color: var(--muted);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
      }

      .nav-links {
        display: flex;
        gap: 18px;
        color: var(--soft);
        font-size: 14px;
      }

      .nav-links a {
        text-decoration: none;
      }

      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.05fr) minmax(320px, 0.95fr);
        gap: 40px;
        align-items: center;
        padding: 78px 0 86px;
      }

      .eyebrow {
        color: var(--accent-2);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        margin-top: 16px;
        max-width: 820px;
        font-size: clamp(48px, 8vw, 92px);
        line-height: 0.92;
        letter-spacing: -0.08em;
      }

      h2 {
        font-size: clamp(34px, 5vw, 58px);
        line-height: 1;
        letter-spacing: -0.06em;
      }

      h3 {
        font-size: 22px;
        line-height: 1.18;
        letter-spacing: -0.03em;
      }

      .lead {
        margin-top: 24px;
        max-width: 650px;
        color: var(--soft);
        font-size: clamp(18px, 2.4vw, 22px);
        line-height: 1.55;
      }

      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 32px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 44px;
        padding: 0 18px;
        border: 1px solid var(--line);
        border-radius: 999px;
        color: var(--text);
        background: rgba(255, 255, 255, 0.04);
        text-decoration: none;
        font-weight: 700;
      }

      .button.primary {
        border-color: rgba(112, 225, 255, 0.5);
        background: linear-gradient(135deg, var(--accent), #0867d8);
        box-shadow: 0 16px 46px rgba(47, 140, 255, 0.28);
      }

      .radar-card,
      .card,
      .strip {
        border: 1px solid var(--line);
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.025)),
          var(--panel);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
      }

      .radar-card {
        position: relative;
        overflow: hidden;
        min-height: 440px;
        border-radius: 28px;
        padding: 24px;
      }

      .radar-card::before {
        content: "";
        position: absolute;
        inset: 40px;
        border-radius: 999px;
        border: 1px solid rgba(112, 225, 255, 0.22);
        box-shadow:
          0 0 0 68px rgba(112, 225, 255, 0.04),
          0 0 0 136px rgba(112, 225, 255, 0.025);
      }

      .signal {
        position: relative;
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
        margin-bottom: 14px;
        padding: 15px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 18px;
        background: rgba(8, 9, 11, 0.74);
        backdrop-filter: blur(16px);
      }

      .signal strong {
        display: block;
        margin-bottom: 4px;
      }

      .signal span {
        color: var(--muted);
        font-size: 13px;
      }

      .score {
        display: grid;
        place-items: center;
        width: 48px;
        height: 48px;
        border-radius: 16px;
        color: var(--green);
        background: rgba(70, 211, 154, 0.1);
        border: 1px solid rgba(70, 211, 154, 0.28);
        font-weight: 800;
      }

      section {
        padding: 72px 0;
      }

      .section-head {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 24px;
        margin-bottom: 26px;
      }

      .section-head p {
        max-width: 440px;
        color: var(--muted);
        line-height: 1.6;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
      }

      .card {
        border-radius: 24px;
        padding: 24px;
      }

      .card p {
        margin-top: 12px;
        color: var(--soft);
        line-height: 1.6;
      }

      .details {
        display: grid;
        gap: 10px;
        margin: 22px 0 0;
        padding: 0;
        list-style: none;
      }

      .details li {
        color: var(--soft);
        font-size: 14px;
      }

      .details li::before {
        content: "->";
        margin-right: 9px;
        color: var(--accent-2);
      }

      .strip {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 1px;
        overflow: hidden;
        border-radius: 28px;
        background: var(--line);
      }

      .step {
        padding: 28px;
        background: var(--panel);
      }

      .step b {
        display: grid;
        place-items: center;
        width: 38px;
        height: 38px;
        margin-bottom: 18px;
        border-radius: 12px;
        background: rgba(47, 140, 255, 0.14);
        color: var(--accent-2);
      }

      .step p {
        margin-top: 10px;
        color: var(--muted);
        line-height: 1.6;
      }

      .screenshots {
        display: grid;
        gap: 28px;
      }

      .screenshot-card {
        border: 1px solid var(--line);
        border-radius: 30px;
        overflow: hidden;
        background: var(--panel);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
      }

      .screenshot-card img {
        display: block;
        width: 100%;
        height: auto;
        background: #08090b;
      }

      .screenshot-caption {
        display: grid;
        grid-template-columns: 0.34fr 0.66fr;
        gap: 18px;
        padding: 22px;
        border-top: 1px solid var(--line);
      }

      .screenshot-caption p {
        color: var(--muted);
        line-height: 1.6;
      }

      .deep {
        display: grid;
        grid-template-columns: 0.82fr 1.18fr;
        gap: 22px;
        align-items: stretch;
      }

      .panel-list {
        display: grid;
        gap: 14px;
      }

      .mini {
        padding: 18px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.035);
      }

      .mini span {
        color: var(--amber);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-weight: 800;
      }

      .mini p {
        margin-top: 8px;
        color: var(--soft);
        line-height: 1.55;
      }

      .terminal {
        align-self: stretch;
        border: 1px solid rgba(112, 225, 255, 0.2);
        border-radius: 24px;
        background: #05070a;
        padding: 22px;
        color: #c8f7da;
        font: 14px/1.8 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      }

      .terminal .muted {
        color: #708096;
      }

      footer {
        padding: 34px 0 52px;
        color: var(--muted);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }

      footer .wrap {
        display: flex;
        justify-content: space-between;
        gap: 18px;
      }

      @media (max-width: 860px) {
        .hero,
        .deep,
        .grid,
        .strip,
        .screenshot-caption {
          grid-template-columns: 1fr;
        }

        .nav {
          align-items: flex-start;
          gap: 18px;
          flex-direction: column;
        }

        .section-head,
        footer .wrap {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <header class="wrap nav">
      <a class="brand" href="./" aria-label="Community Radar home">
        <span class="mark">8</span>
        <span>
          <strong>Community Radar</strong>
          <span>Layer8Culture</span>
        </span>
      </a>
      <nav class="nav-links" aria-label="Page navigation">
        <a href="#features">Features</a>
        <a href="#screenshots">Screenshots</a>
        <a href="#how">How it works</a>
        <a href="#run">Run it</a>
      </nav>
    </header>

    <main>
      <section class="wrap hero">
        <div>
          <div class="eyebrow">Signal tracking for authentic engagement</div>
          <h1>Know where culture is forming before the feed gets loud.</h1>
          <p class="lead">
            Community Radar helps Layer8Culture surface high-value conversations, track creators,
            and turn community signals into focused daily actions.
          </p>
          <div class="actions">
            <a class="button primary" href="#features">Explore the system</a>
            <a class="button" href="https://github.com/layer8culture/layer8culture-community-radar">View source</a>
          </div>
        </div>

        <aside class="radar-card" aria-label="Community signal examples">
          <div class="signal">
            <div>
              <strong>Founder thread gaining traction</strong>
              <span>Comment opportunity - relevance x velocity x freshness</span>
            </div>
            <div class="score">92</div>
          </div>
          <div class="signal">
            <div>
              <strong>Creator posting consistently in your niche</strong>
              <span>Follow target - rising engagement trend</span>
            </div>
            <div class="score">84</div>
          </div>
          <div class="signal">
            <div>
              <strong>Conversation crossing YouTube and Reddit</strong>
              <span>Join now - strong signal overlap</span>
            </div>
            <div class="score">78</div>
          </div>
          <div class="signal">
            <div>
              <strong>High-fit collaborator candidate</strong>
              <span>Invite target - relationship warm-up ready</span>
            </div>
            <div class="score">88</div>
          </div>
        </aside>
      </section>

      <section id="features" class="wrap">
        <div class="section-head">
          <div>
            <div class="eyebrow">Features</div>
            <h2>Everything points toward the next best community action.</h2>
          </div>
          <p>
            The app is designed for creators who want to participate with context,
            build relationships, and avoid random engagement theater.
          </p>
        </div>

        <div class="grid">
          ${features
            .map(
              (feature) => `<article class="card">
                <div class="eyebrow">${feature.eyebrow}</div>
                <h3>${feature.title}</h3>
                <p>${feature.body}</p>
                <ul class="details">
                  ${feature.details.map((detail) => `<li>${detail}</li>`).join("")}
                </ul>
              </article>`,
            )
            .join("")}
        </div>
      </section>

      <section id="screenshots" class="wrap">
        <div class="section-head">
          <div>
            <div class="eyebrow">Screenshots</div>
            <h2>See the Community Radar workflow at a glance.</h2>
          </div>
          <p>
            These static screenshots show the product concepts without turning
            GitHub Pages back into an interactive demo.
          </p>
        </div>

        <div class="screenshots">
          ${screenshots
            .map(
              (screenshot) => `<figure class="screenshot-card">
                <img src="./screenshots/${screenshot.file}" alt="${screenshot.title}" loading="lazy" />
                <figcaption class="screenshot-caption">
                  <h3>${screenshot.title}</h3>
                  <p>${screenshot.caption}</p>
                </figcaption>
              </figure>`,
            )
            .join("")}
        </div>
      </section>

      <section id="how" class="wrap">
        <div class="section-head">
          <div>
            <div class="eyebrow">How it works</div>
            <h2>Three steps from signal to action.</h2>
          </div>
          <p>
            Community Radar keeps the workflow simple: define your surface area,
            let the system prioritize the signals, then engage with intention.
          </p>
        </div>

        <div class="strip">
          ${steps
            .map(
              ([number, title, body]) => `<article class="step">
                <b>${number}</b>
                <h3>${title}</h3>
                <p>${body}</p>
              </article>`,
            )
            .join("")}
        </div>
      </section>

      <section class="wrap deep">
        <div>
          <div class="eyebrow">Deep dive</div>
          <h2>Built for the full Community Radar app.</h2>
        </div>
        <div class="panel-list">
          <article class="mini">
            <span>Opportunity scoring</span>
            <p>
              Posts are ranked with an opportunity score based on relevance,
              engagement velocity, and freshness.
            </p>
          </article>
          <article class="mini">
            <span>Creator relationship map</span>
            <p>
              Track who you liked, followed, replied to, commented on, or invited
              so community-building becomes a visible system.
            </p>
          </article>
          <article class="mini">
            <span>AI-assisted comments</span>
            <p>
              Generate comment options in multiple tones using GitHub Models,
              OpenAI, or deterministic fallback templates.
            </p>
          </article>
        </div>
      </section>

      <section id="run" class="wrap">
        <div class="section-head">
          <div>
            <div class="eyebrow">Run it</div>
            <h2>GitHub Pages is the overview. The app runs separately.</h2>
          </div>
          <p>
            This site explains what Community Radar does. Interactive dashboards,
            API routes, ingestion, persistence, and AI providers run in the
            Next.js app locally or on a server deployment.
          </p>
        </div>

        <div class="terminal" aria-label="Local setup commands">
          <div><span class="muted">$</span> git clone https://github.com/layer8culture/layer8culture-community-radar.git</div>
          <div><span class="muted">$</span> cd layer8culture-community-radar</div>
          <div><span class="muted">$</span> npm install</div>
          <div><span class="muted">$</span> npm run dev</div>
          <br />
          <div class="muted">Optional for full deployment: DATABASE_URL, GITHUB_TOKEN or OPENAI_API_KEY</div>
        </div>
      </section>
    </main>

    <footer>
      <div class="wrap">
        <div>Community Radar - Layer8Culture</div>
        <div>Static overview site. Interactive app lives in the repository.</div>
      </div>
    </footer>
  </body>
</html>`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(screenshotsDir, { recursive: true });
await writeFile(new URL("index.html", outDir), html);
await writeFile(new URL("404.html", outDir), html);
await writeFile(new URL(".nojekyll", outDir), "");
await Promise.all(
  Object.entries(screenshotSvgs).map(([file, svg]) => writeFile(new URL(file, screenshotsDir), svg)),
);

console.log("Built GitHub Pages overview site in out/");
