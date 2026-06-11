"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◎" },
  { href: "/content", label: "Content Studio", icon: "✎" },
  { href: "/trends", label: "Trend Radar", icon: "↗" },
  { href: "/growth", label: "My Growth", icon: "📈" },
  { href: "/opportunities", label: "Opportunity Feed", icon: "⌁" },
  { href: "/influencers", label: "Influencers", icon: "✦" },
  { href: "/hashtags", label: "Hashtags", icon: "#" },
  { href: "/relationships", label: "Networking", icon: "⇌" },
];

function isActive(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(href + "/");
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-md bg-accent-bright shadow-glow flex items-center justify-center text-white font-bold shrink-0">
        8
      </div>
      <div className="min-w-0">
        <div className={`font-semibold leading-tight ${compact ? "text-sm" : "text-sm"} truncate`}>Community Radar</div>
        <div className="text-[10px] uppercase tracking-wider text-text-muted truncate">Layer8Culture</div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-60 shrink-0 border-r border-bg-border bg-bg-elevated/50 backdrop-blur flex-col">
      <div className="px-5 py-5 border-b border-bg-border">
        <BrandMark />
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                active
                  ? "bg-accent-bright/15 text-accent-glow border border-accent-bright/30"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary border border-transparent"
              }`}
            >
              <span className="text-base w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-bg-border text-[11px] text-text-muted">
        v0.1 MVP · built for Donville
      </div>
    </aside>
  );
}

export function MobileTopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer when navigating to a new page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 border-b border-bg-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
        <Link href="/" className="flex items-center gap-2 min-w-0" aria-label="Community Radar home">
          <BrandMark compact />
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav-drawer"
          aria-label={open ? "Close menu" : "Open menu"}
          className="inline-flex items-center justify-center w-11 h-11 rounded-md border border-bg-border text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </header>

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <nav
            id="mobile-nav-drawer"
            className="md:hidden fixed top-[57px] left-0 right-0 z-40 max-h-[calc(100vh-57px)] overflow-y-auto bg-bg-elevated border-b border-bg-border shadow-2xl"
          >
            <div className="p-3 space-y-1">
              {NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-md text-sm transition-colors ${
                      active
                        ? "bg-accent-bright/15 text-accent-glow border border-accent-bright/30"
                        : "text-text-secondary hover:bg-bg hover:text-text-primary border border-transparent"
                    }`}
                  >
                    <span className="text-base w-5 text-center">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
            <div className="px-4 py-3 border-t border-bg-border text-[11px] text-text-muted">
              v0.1 MVP · built for Donville
            </div>
          </nav>
        </>
      )}
    </>
  );
}
