import type { SocialLink } from "@/lib/types";
import { PLATFORM_LABELS } from "@/lib/socialLinks";

interface Props {
  links: SocialLink[];
  // "full" shows label + platform; "compact" is icon-only chips for table cells.
  variant?: "full" | "compact";
  emptyText?: string;
}

export function SocialLinks({ links, variant = "full", emptyText = "No links yet" }: Props) {
  if (!links || links.length === 0) {
    return <span className="text-xs text-text-muted">{emptyText}</span>;
  }
  const orderedLinks = [...links].sort(
    (a, b) => platformOrder(a.platform) - platformOrder(b.platform),
  );
  return (
    <div className={variant === "compact" ? "flex flex-wrap gap-1" : "flex flex-wrap gap-2"}>
      {orderedLinks.map((l) => (
        <a
          key={`${l.platform}|${l.url}`}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${PLATFORM_LABELS[l.platform] ?? l.platform} — ${l.url}`}
          className={
            variant === "compact"
              ? "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider bg-bg-elevated/60 border border-bg-border text-text-secondary hover:text-accent-glow hover:border-accent-glow/50 transition-colors"
              : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-bg-elevated/60 border border-bg-border text-text-secondary hover:text-accent-glow hover:border-accent-glow/50 transition-colors"
          }
        >
          <span aria-hidden>{platformGlyph(l.platform)}</span>
          <span>{PLATFORM_LABELS[l.platform] ?? l.platform}</span>
        </a>
      ))}
    </div>
  );
}

// Stable display order: source platforms first, then big general ones.
const ORDER = [
  "youtube",
  "twitter",
  "instagram",
  "tiktok",
  "twitch",
  "reddit",
  "bluesky",
  "threads",
  "github",
  "linkedin",
  "mastodon",
  "substack",
  "patreon",
  "discord",
  "linktree",
  "website",
];
function platformOrder(p: string): number {
  const i = ORDER.indexOf(p);
  return i === -1 ? 99 : i;
}

// Tiny ascii glyphs so we don't need to ship an icon library.
function platformGlyph(p: string): string {
  switch (p) {
    case "youtube":
      return "▶";
    case "twitter":
      return "𝕏";
    case "instagram":
      return "◉";
    case "tiktok":
      return "♪";
    case "twitch":
      return "▰";
    case "reddit":
      return "ⓡ";
    case "bluesky":
      return "☁";
    case "threads":
      return "@";
    case "github":
      return "⌥";
    case "linkedin":
      return "in";
    case "mastodon":
      return "🐘";
    case "substack":
      return "✉";
    case "patreon":
      return "♥";
    case "discord":
      return "💬";
    case "linktree":
      return "🌲";
    default:
      return "↗";
  }
}
