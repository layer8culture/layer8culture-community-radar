# Community Radar — How-To Guide

Your daily playbook for showing up in the right conversations, following the right people, and turning attention into real relationships.

This guide is for **using** the app. For installing it, see `README.md`.

---

## The 60-second mental model

Community Radar watches the creators, hashtags, and posts you care about, then tells you **what to do today** — who to comment on, who to follow, who to invite. Everything is ranked by an **opportunity score** so you don't waste time scrolling.

Every screen answers one question:

| Screen | Question it answers |
|---|---|
| **Today's Actions** (home) | What should I do *right now* to grow my community? |
| **Opportunities** | Which posts are worth my time across all platforms? |
| **Influencers** | Who am I tracking, and how warm is each relationship? |
| **Hashtags** | Which tags am I monitoring for new opportunities? |
| **Relationships** | What have I already done with each creator? |

---

## 1. Today's Actions (the home screen)

This is your daily standup. Open it once a day — ideally at the start of your engagement block.

You'll see four counts at the top:
- **Posts to comment on** — high-value posts where a thoughtful reply will get noticed.
- **Influencers to follow** — people in your niche you're not already tracking.
- **Conversations to join** — trending threads where jumping in early pays off.
- **Creator to invite** — your top collab candidate today.

Then four sections below:

### 🔥 Top 5 posts to comment on
Each card shows:
- The post content and creator handle
- An **opportunity score** (0–100, higher = better)
- A **suggested action** badge (`comment`, `repost`, `follow`, `like`)
- A **"Generate comments"** button

Click **Generate comments** and you'll get **4 AI-written reply variations** in different tones:
- **Insightful** — thoughtful, adds a perspective
- **Encouraging** — supportive, lifts the creator up
- **Builder-to-builder** — peer-level, technical or craft-focused
- **Community-oriented** — invites others into the thread

Pick the one that sounds most like you, click **Copy**, paste into the platform. Done.

> 💡 The "via" label on each comment tells you what generated it — `GitHub Models`, `OpenAI`, or `fallback` (if no AI key is set).

### ✦ 3 influencers to follow
Quick list of accounts you should be tracking but aren't yet. Click any row to open their profile and start a relationship record.

### ⌁ 2 conversations to join
Threads with rising velocity. Get in early, before they peak.

### 🤝 1 creator to invite
The single highest-fit creator for a collab today. Click the card to open their profile and decide.

---

## 2. Opportunities

The full firehose, ranked.

**Filters at the top:**
- **Platform** — Twitter / Instagram / YouTube / TikTok / All
- **Min score** — slider; bump it up when you only want the best (e.g. 80+)

**How the score works:**
```
opportunityScore = relevance × 0.4 + velocity × 0.3 + freshness × 0.3
```
- **Relevance** — how well the post matches your niche (Layer8Culture themes).
- **Velocity** — how fast it's gaining engagement *right now*.
- **Freshness** — decays over time. A post is at 100 when new, ~50 after a day, ~10 after 4 days.

**Suggested actions** are derived automatically:
- Score ≥ 85 → **comment**
- Score ≥ 70 → **repost**
- Velocity ≥ 70 → **follow**
- Otherwise → **like**

**Workflow tip:** Set min score to 75, work top to bottom, generate a comment per card, copy/paste into the platform, log it under Relationships when you're done.

---

## 3. Influencers

Your CRM for creators worth tracking.

**The table** shows handle, platform, niche, followers, posting frequency, engagement trend (rising / stable / declining), and relevance score. Click any column header to sort. Click any row to open the detail page.

### Adding an influencer
1. Click **+ Add influencer** (top right).
2. Fill in:
   - **Handle** — without the `@`
   - **Platform** — pick one
   - **Niche** — short description (e.g. "indie devtools", "Black tech founders")
   - **Follower count** — best estimate
   - **Posting frequency** — posts per week
   - **Engagement trend** — eyeball it
   - **Relevance score** — 0–100, how well they fit your audience
3. Save.

### Editing or deleting
Open the detail page → **Edit** or **Delete**.

### What "relevance" should be
A rough rubric:
- **90–100** — bullseye fit, would be perfect collab partner
- **70–89** — strong overlap, worth nurturing
- **50–69** — adjacent audience, occasional engagement
- **<50** — nice to know, low priority

---

## 4. Hashtags

The tags that feed your Opportunity feed. Comes pre-seeded with Layer8Culture defaults.

**To add a tag:**
1. Type the tag (no `#`) in the input.
2. Pick the platform.
3. Click **Add**.

**To remove:** click the × on any tag chip.

**Tip:** more isn't better. 8–15 well-chosen tags per platform > 50 noisy ones. Prune monthly.

### Real data ingestion (YouTube + Reddit)

Hashtags on **YouTube** and **Reddit** can pull real posts into your feed. Click **↻ Refresh now** on the Opportunity Feed page to trigger a fetch (or hit `POST /api/refresh` from a cron).

**YouTube tags** — type any search query (e.g. `vibe coding`, `indie hacker daily`). It searches recent uploads matching that phrase.

**Reddit tags** — two formats:
- `r/webdev` (with the `r/` prefix) → pulls newest posts from that subreddit.
- Anything else (e.g. `livestreaming setup`) → searches Reddit-wide for posts matching that query in the last week.

For each fetched post, Community Radar:
1. Computes engagement velocity from likes/comments/upvotes vs. age.
2. Inherits relevance from the source hashtag's relevance score.
3. Auto-creates an Influencer record for the creator (so they show up in the Influencers tab).
4. Replaces all existing posts for that platform (other platforms are untouched).

**Required env vars** (in `.env.local`):
- `YOUTUBE_API_KEY` — free from https://console.cloud.google.com → Enable "YouTube Data API v3" → Credentials → API key.
- `REDDIT_USER_AGENT` — required. A unique descriptive UA, e.g. `"community-radar/0.1 (by /u/yourname)"`. With only this set, the app uses Reddit's public **RSS** endpoints — works from any IP (including Vercel) with no API approval needed. Trade-off: no upvote/comment counts, so opportunity scores lean on freshness + relevance.
- `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` — *optional* upgrade. Once your Reddit API application at https://www.reddit.com/prefs/apps is approved, paste these to switch ingestion to authenticated OAuth and unlock real upvote/comment data.

If YouTube creds are missing, those hashtags are silently skipped — the rest still work.

---

## 5. Relationships

Your engagement journal. One row per creator, tracking what you've done with them.

**Each row tracks:**
- ✅ Liked
- ✅ Commented
- ✅ Followed
- ✅ Replied (they replied to you)
- ✅ Invited (you sent a collab invite)
- **Collaborator score** — your gut-level fit (0–100)
- **Notes** — anything you want to remember

**Use it like a CRM:** check the boxes as you do the actions. Over time the table tells you who you've been showing up for and who you've been ignoring.

**Pro move:** every Friday, scan for creators you commented on but never followed up with. Send them a DM.

---

## A suggested daily routine (15 minutes)

1. **Open Today's Actions** ☕
2. **Top 5 posts** — generate comments, copy, paste, post. (~7 min)
3. **3 influencers to follow** — actually follow them on the platform, then add them under Influencers if they're not there. (~2 min)
4. **2 conversations** — drop one substantive reply in each. (~3 min)
5. **1 creator to invite** — open their profile, decide if today's the day. If yes, send the DM. Either way, log it under Relationships. (~3 min)

That's it. Close the tab.

---

## A suggested weekly routine (30 minutes)

- **Prune Hashtags** — remove anything that brought only noise this week.
- **Update Influencer trends** — bump anyone whose engagement is clearly rising or falling.
- **Review Relationships** — who replied? Who ghosted? Adjust collaborator scores.
- **Open Opportunities at min score 85** — anything you missed during the daily passes?

---

## FAQ

**Q: My data disappeared after I restarted the server.**
A: You're on the in-memory mock store (the yellow banner at the top tells you so). It resets on every restart. Wire up Supabase when you want persistence — see `README.md`.

**Q: The generated comments say "fallback" — are they AI?**
A: No. "Fallback" means no AI key was found, so the app used template comments. Add a `GITHUB_TOKEN` to `.env.local` to switch on real AI generation.

**Q: The opportunity scores look random.**
A: On mock data they're partly randomized for demo purposes. With real data wired in (Supabase + a refresh job), scores reflect actual relevance, engagement velocity, and post age.

**Q: Can I edit a generated comment before copying?**
A: Yes — the comments are just text. Treat them as a starting draft, not the final word. The best engagement is still in *your* voice.

**Q: How do I add a new platform (e.g. LinkedIn)?**
A: Add it to the `Platforms` array in `src/lib/types.ts` and to the Prisma schema. The UI picks it up automatically.

---

## Philosophy

Community Radar is an **anti-doomscroll** tool. The goal is *less* time on the platforms, but **higher-signal** time. If you're spending more than 20 minutes a day in the app or on social, you're using it wrong — go ship something instead.
