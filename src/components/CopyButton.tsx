"use client";

import { useState } from "react";

// Small copy-to-clipboard button used across the Content Studio.
export function CopyButton({
  text,
  label = "Copy",
  className = "",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={`text-[10px] uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors ${className}`}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
