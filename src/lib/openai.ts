// Comment generation. Provider is auto-selected in this priority order:
//   1. GitHub Models  — if GITHUB_TOKEN is set (PAT with `models:read` scope).
//      Free tier with rate limits; works alongside a Copilot subscription.
//      Endpoint: https://models.github.ai/inference (OpenAI-compatible).
//   2. OpenAI         — if OPENAI_API_KEY is set.
//   3. Fallback       — deterministic templated comments so the UI is always
//                       demonstrable.
//
// Both providers use the `openai` npm SDK; GitHub Models just overrides the
// baseURL. Default models per provider:
//   GitHub Models  → openai/gpt-4o-mini  (override: GITHUB_MODELS_MODEL)
//   OpenAI         → gpt-4o-mini         (override: OPENAI_MODEL)

import OpenAI from "openai";
import type { ContentFormat, ContentPlatform, Platform } from "./types";

export type CommentTone = "insightful" | "encouraging" | "builder-to-builder" | "community-oriented";

export type CommentSource = "github-models" | "openai" | "fallback";

export interface CommentInput {
  postContent: string;
  creatorName: string;
  platform: Platform;
}

export interface CommentSuggestion {
  tone: CommentTone;
  text: string;
}

const TONES: CommentTone[] = ["insightful", "encouraging", "builder-to-builder", "community-oriented"];

const SYSTEM_PROMPT = `You are Donville, a tech creator who runs Layer8Culture — a community for builders, indie hackers, and live-coders. You write short, authentic engagement comments. Your style: warm, specific, never generic, never spammy, never markdown, never hashtags. You always reference a concrete detail from the post you're replying to. You sound like a real human builder, not a marketing bot.`;

function userPrompt(input: CommentInput, tones: CommentTone[]): string {
  return [
    `Platform: ${input.platform}`,
    `Creator: @${input.creatorName}`,
    `Post:\n"""${input.postContent}"""`,
    "",
    `Write ${tones.length} comment variations, each in a different tone, returned as a JSON object:`,
    `{"comments": [{"tone": "<tone>", "text": "<comment>"}, ...]}`,
    `Tones to produce, in order: ${tones.map((t) => `"${t}"`).join(", ")}.`,
    "Each comment must:",
    "- be 1-2 sentences",
    "- reference something specific from the post",
    "- avoid hashtags, emojis (unless one fits naturally), and any phrase like 'great post' or 'love this'",
    "- never sell, pitch, or self-promote",
    "Return ONLY the JSON object, no prose.",
  ].join("\n");
}

function fallbackComments(input: CommentInput): CommentSuggestion[] {
  const snippet = input.postContent.replace(/\s+/g, " ").trim().slice(0, 70);
  const handle = input.creatorName.replace(/^@/, "");
  return [
    {
      tone: "insightful",
      text: `The angle on "${snippet}${snippet.length === 70 ? "…" : ""}" is the part most people miss — what's been the unexpected second-order effect for you, ${handle}?`,
    },
    {
      tone: "encouraging",
      text: `Watching this in real-time is the reason I'm on ${input.platform}. Keep posting the messy middle, that's where the value is.`,
    },
    {
      tone: "builder-to-builder",
      text: `Shipped something similar last month and hit the same wall. Did you go all-in on the simpler approach or layer it on top of what you already had?`,
    },
    {
      tone: "community-oriented",
      text: `Sharing this with the Layer8Culture builders — the conversation in the replies is going to be gold. Anyone else in the trenches on this?`,
    },
  ];
}

interface ProviderConfig {
  source: Exclude<CommentSource, "fallback">;
  client: OpenAI;
  model: string;
}

function selectProvider(): ProviderConfig | null {
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    return {
      source: "github-models",
      client: new OpenAI({
        apiKey: githubToken,
        baseURL: "https://models.github.ai/inference",
      }),
      model: process.env.GITHUB_MODELS_MODEL || "openai/gpt-4o-mini",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      source: "openai",
      client: new OpenAI({ apiKey: openaiKey }),
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    };
  }
  return null;
}

export async function generateComments(input: CommentInput): Promise<{
  source: CommentSource;
  comments: CommentSuggestion[];
}> {
  const provider = selectProvider();
  if (!provider) return { source: "fallback", comments: fallbackComments(input) };

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(input, TONES) },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as { comments?: Array<{ tone?: string; text?: string }> };
    const comments: CommentSuggestion[] = (parsed.comments || [])
      .filter((c) => typeof c.text === "string" && c.text.trim().length > 0)
      .map((c, i) => ({
        tone: (TONES.includes(c.tone as CommentTone) ? c.tone : TONES[i % TONES.length]) as CommentTone,
        text: c.text!.trim(),
      }));
    if (comments.length === 0) return { source: "fallback", comments: fallbackComments(input) };
    return { source: provider.source, comments };
  } catch (err) {
    console.error(`[generateComments] ${provider.source} failed, using fallback:`, err);
    return { source: "fallback", comments: fallbackComments(input) };
  }
}

// ---------------------------------------------------------------------------
// Content Studio — short-form content plan generation (Instagram + TikTok)
// ---------------------------------------------------------------------------
//
// This is the growth engine: turn one topic into a ready-to-shoot Reel/TikTok —
// hook variations, a beat-by-beat script, a save/share-optimized caption, a
// first-comment for SEO, a tuned hashtag set, an audio direction, and a CTA
// engineered to convert non-followers. Uses the same provider selection as the
// comment generator, with a deterministic fallback so the UI always works.

export interface ContentPlanInput {
  topic: string;
  platform: ContentPlatform;
  format: ContentFormat;
  niche?: string;
  audioIdea?: string;
}

export interface ContentPlan {
  hooks: string[];
  scriptBeats: string[];
  caption: string;
  firstComment: string;
  hashtags: string[];
  audioIdea: string;
  cta: string;
}

const CONTENT_SYSTEM_PROMPT = `You are a short-form video strategist for Donville, who runs Layer8Culture — a community for builders, indie hackers, and live-coders. You write scroll-stopping Instagram Reels and TikToks that grow a following organically. You understand that on these platforms reach comes from watch-time, completion, saves, and shares to NON-followers — not from follower count. Your hooks land in the first 1-3 seconds, your scripts are tight and visual, your captions drive saves and comments, and your CTAs convert viewers into followers. Never generic, never corporate, never spammy.`;

function contentUserPrompt(input: ContentPlanInput): string {
  const platformNotes =
    input.platform === "tiktok"
      ? "TikTok: fast pacing, native text-on-screen, lean into trending sounds, 21-34s sweet spot, hook must survive a muted autoplay."
      : "Instagram Reels: clean visual hook, strong on-screen text, 7-30s, optimize the caption + first comment for saves and Explore-page SEO.";
  return [
    `Platform: ${input.platform}. ${platformNotes}`,
    `Format: ${input.format}.`,
    input.niche ? `Creator niche: ${input.niche}.` : `Creator niche: developer / build-in-public / coding.`,
    input.audioIdea ? `Suggested audio/trend to ride: ${input.audioIdea}.` : "",
    `Topic: """${input.topic}"""`,
    "",
    "Produce a complete content plan as a JSON object with EXACTLY these keys:",
    `{`,
    `  "hooks": ["<3 distinct first-1-3-second hooks, each <120 chars>"],`,
    `  "scriptBeats": ["<4-6 beats, each prefixed with a timestamp like '0-3s:'>"],`,
    `  "caption": "<1-3 sentence caption that earns saves/comments, no hashtags inline>",`,
    `  "firstComment": "<a first comment to pin: a question or SEO line that sparks replies>",`,
    `  "hashtags": ["<6-10 tags, no # symbol, mix 1-2 broad + niche + specific>"],`,
    `  "audioIdea": "<one concrete trending-audio or sound direction>",`,
    `  "cta": "<one follow/save-driving call to action>"`,
    `}`,
    "Rules: no markdown, no emojis spam (at most 1-2 if natural), never invent fake stats, keep it shootable today. Return ONLY the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");
}

function fallbackContentPlan(input: ContentPlanInput): ContentPlan {
  const topic = input.topic.trim();
  const short = topic.length > 60 ? `${topic.slice(0, 57)}…` : topic;
  const broadTag = input.platform === "tiktok" ? "techtok" : "codingreels";
  return {
    hooks: [
      `Nobody talks about this part of "${short}" — but it changed everything.`,
      `I wish someone told me this about ${short} before I started.`,
      `Stop scrolling if you've ever struggled with ${short}.`,
    ],
    scriptBeats: [
      `0-3s: Open on the hook with bold on-screen text; face-to-cam or fast b-roll.`,
      `3-10s: Set up the problem viewers feel about ${short}.`,
      `10-20s: Show the turn — the demo, diff, or before/after.`,
      `20-27s: Deliver the payoff and one concrete takeaway.`,
      `27-30s: "${input.platform === "tiktok" ? "Save this + follow for more" : "Follow for the full series"}."`,
    ],
    caption: `The thing most people miss about ${short}. Save this for your next build session — and tell me if you've hit the same wall.`,
    firstComment: `What's the part of ${short} that tripped you up the most? Drop it below and I'll make a follow-up.`,
    hashtags: [broadTag, "buildinpublic", "indiehacker", "webdev", "programming", "softwareengineer", "learntocode"],
    audioIdea: input.audioIdea || (input.platform === "tiktok" ? "A trending fast-paced sound; sync your reveal to the beat drop." : "A lo-fi focus beat trending on Reels under build montages."),
    cta: input.platform === "tiktok" ? "Save this + follow for the next one." : "Follow for the full build series.",
  };
}

function asStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => (x as string).trim().replace(/^#/, ""))
    .slice(0, max);
}

export async function generateContentPlan(input: ContentPlanInput): Promise<{
  source: CommentSource;
  plan: ContentPlan;
}> {
  const provider = selectProvider();
  if (!provider) return { source: "fallback", plan: fallbackContentPlan(input) };

  try {
    const completion = await provider.client.chat.completions.create({
      model: provider.model,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CONTENT_SYSTEM_PROMPT },
        { role: "user", content: contentUserPrompt(input) },
      ],
    });
    const raw = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const hooks = asStringArray(parsed.hooks, 4);
    const scriptBeats = asStringArray(parsed.scriptBeats, 8);
    if (hooks.length === 0 || scriptBeats.length === 0) {
      return { source: "fallback", plan: fallbackContentPlan(input) };
    }
    const plan: ContentPlan = {
      hooks,
      scriptBeats,
      caption: typeof parsed.caption === "string" ? parsed.caption.trim() : "",
      firstComment: typeof parsed.firstComment === "string" ? parsed.firstComment.trim() : "",
      hashtags: asStringArray(parsed.hashtags, 12),
      audioIdea: typeof parsed.audioIdea === "string" ? parsed.audioIdea.trim() : input.audioIdea ?? "",
      cta: typeof parsed.cta === "string" ? parsed.cta.trim() : "",
    };
    return { source: provider.source, plan };
  } catch (err) {
    console.error(`[generateContentPlan] ${provider.source} failed, using fallback:`, err);
    return { source: "fallback", plan: fallbackContentPlan(input) };
  }
}
