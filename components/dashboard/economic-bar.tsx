"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import type { CascadeVulnerability } from "@/lib/types";

interface EconomicBarProps {
  data: CascadeVulnerability[];
}

export function EconomicBar({ data }: EconomicBarProps) {
  const chartData = data.map((d) => ({
    airport: d.airport,
    costM: Math.round((d.total_economic_impact / 1e6) * 10) / 10,
  }));

  // Gradient from light indigo to deep indigo based on value
  const maxCost = Math.max(...chartData.map((d) => d.costM), 1);

  return (
    <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Economic Impact - Top 12 ($M)
      </h3>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="airport"
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Impact ($M)",
                angle: -90,
                position: "insideLeft",
                offset: 16,
                style: { fill: "#94A3B8", fontSize: 10, textAnchor: "middle" },
              }}
            />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number) => [`$${value.toFixed(1)}M`, "Impact"]}
            />
            <Bar dataKey="costM" radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => {
                const intensity = entry.costM / maxCost;
                const r = Math.round(79 + (14 - 79) * intensity);
                const g = Math.round(70 + (165 - 70) * intensity);
                const b = Math.round(229 + (233 - 229) * intensity);
                return (
                  <Cell key={index} fill={`rgb(${r}, ${g}, ${b})`} />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
