import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  accentColor?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  accentColor = "#4F46E5",
  className = "",
}: KpiCardProps) {
  return (
    <div
      className={`kpi-card relative overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}
    >
      <div
        className="absolute top-0 left-0 h-1 w-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
          </p>
          <p
            className="mt-2 font-mono text-2xl font-bold tracking-tight"
            style={{ color: accentColor }}
          >
            {value}
          </p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}
