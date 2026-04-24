import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";

const outDir = new URL("../out/", import.meta.url);
const screenshotsDir = new URL("screenshots/", outDir);
const screenshotSourceDir = new URL("../pages-assets/screenshots/", import.meta.url);

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
    file: "daily-actions.png",
    title: "Daily action dashboard",
    caption: "A focused queue of posts to comment on, creators to follow, conversations to join, and one high-fit collaborator to invite.",
  },
  {
    file: "opportunity-feed.png",
    title: "Opportunity feed",
    caption: "Ranked community signals with opportunity, relevance, and velocity scores so the strongest conversations surface first.",
  },
  {
    file: "creator-tracker.png",
    title: "Creator tracker",
    caption: "A lightweight creator CRM for handles, platforms, niches, engagement trends, social links, and relationship context.",
  },
];

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
  screenshots.map((screenshot) =>
    copyFile(new URL(screenshot.file, screenshotSourceDir), new URL(screenshot.file, screenshotsDir)),
  ),
);

console.log("Built GitHub Pages overview site in out/");
