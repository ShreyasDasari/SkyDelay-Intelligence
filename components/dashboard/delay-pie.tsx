"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import type { DelayCause } from "@/lib/types";

interface DelayPieProps {
  data: DelayCause[];
}

const COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.risk.high,
  "#059669",
  CHART_COLORS.accent,
];

export function DelayPie({ data }: DelayPieProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Delay Cause Distribution
      </h3>
      <div className="mt-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={65}
              outerRadius={95}
              paddingAngle={3}
              dataKey="count"
              nameKey="cause"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i]} strokeWidth={2} stroke="#FFFFFF" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              formatter={(value: number, name: string) => [
                `${value.toLocaleString()} (${((value / total) * 100).toFixed(1)}%)`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-muted-foreground">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
