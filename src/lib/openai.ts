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
import type { Platform } from "./types";

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
