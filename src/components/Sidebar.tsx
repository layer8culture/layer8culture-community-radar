"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "◎" },
  { href: "/opportunities", label: "Opportunity Feed", icon: "⌁" },
  { href: "/influencers", label: "Influencers", icon: "✦" },
  { href: "/hashtags", label: "Hashtags", icon: "#" },
  { href: "/relationships", label: "Relationships", icon: "⇌" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-bg-border bg-bg-elevated/50 backdrop-blur flex flex-col">
      <div className="px-5 py-5 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-accent-bright shadow-glow flex items-center justify-center text-white font-bold">
            8
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Community Radar</div>
            <div className="text-[10px] uppercase tracking-wider text-text-muted">Layer8Culture</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(item.href + "/");
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
