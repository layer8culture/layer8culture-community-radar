import type { ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-text-secondary mt-1">{hint}</div>}
    </div>
  );
}

export function ScoreBar({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 80 ? "bg-emerald-400" : clamped >= 60 ? "bg-accent-bright" : clamped >= 40 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="w-full h-1.5 bg-bg-border rounded-full overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return <span className="badge-muted capitalize">{platform}</span>;
}

export function TrendBadge({ trend }: { trend: "rising" | "stable" | "declining" }) {
  const cls = trend === "rising" ? "badge-rising" : trend === "stable" ? "badge-stable" : "badge-declining";
  const arrow = trend === "rising" ? "↑" : trend === "stable" ? "→" : "↓";
  return (
    <span className={cls}>
      {arrow} {trend}
    </span>
  );
}

export function ActionBadge({ action }: { action: string }) {
  return <span className="badge-accent capitalize">{action}</span>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card p-12 text-center text-text-muted text-sm">{message}</div>
  );
}
