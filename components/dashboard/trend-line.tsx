"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import type { DelayEconomics } from "@/lib/types";

interface TrendLineProps {
  data: DelayEconomics[];
  airports?: string[];
}

export function TrendLine({
  data,
  airports = ["ORD", "ATL", "DFW", "JFK", "DEN"],
}: TrendLineProps) {
  // Pivot data: each row is a date with airport columns
  const dateMap: Record<string, Record<string, number>> = {};
  data.forEach((d) => {
    if (!dateMap[d.flight_date]) dateMap[d.flight_date] = {};
    dateMap[d.flight_date][d.airport] = d.rolling_7day_avg_delay;
  });

  const chartData = Object.entries(dateMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      date: date.slice(5), // MM-DD
      ...vals,
    }));

  return (
    <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        7-Day Rolling Avg Delay - Top 5 Hubs
      </h3>
      <div className="mt-4 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748B", fontSize: 10 }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              label={{
                value: "Avg Delay (min)",
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
              formatter={(value: number) => [`${value?.toFixed(1)} min`]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#64748B" }}
              iconType="line"
              iconSize={12}
            />
            {airports.map((airport, i) => (
              <Line
                key={airport}
                type="monotone"
                dataKey={airport}
                stroke={CHART_COLORS.sequence[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.sequence[i] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
