"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Legend,
} from "recharts";
import { CHART_COLORS } from "@/lib/constants";
import type { RouteEconomics } from "@/lib/types";

interface RouteScatterProps {
  data: RouteEconomics[];
}

export function RouteScatter({ data }: RouteScatterProps) {
  // Group by dominant delay cause
  const grouped: Record<string, RouteEconomics[]> = {};
  data.forEach((r) => {
    const cause = r.dominant_delay_cause || "Other";
    if (!grouped[cause]) grouped[cause] = [];
    grouped[cause].push(r);
  });

  const causes = Object.keys(grouped);

  return (
    <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        Routes: Flights vs Economic Impact
      </h3>
      <div className="mt-4 h-[420px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="total_flights"
              type="number"
              name="Total Flights"
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={{ stroke: "#E2E8F0" }}
              tickLine={false}
              label={{
                value: "Total Flights (3 months)",
                position: "insideBottom",
                offset: -4,
                style: { fill: "#94A3B8", fontSize: 10 },
              }}
            />
            <YAxis
              dataKey="est_total_economic_impact"
              type="number"
              name="Economic Impact"
              tick={{ fill: "#64748B", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) =>
                v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${(v / 1e3).toFixed(0)}K`
              }
              label={{
                value: "Economic Impact ($)",
                angle: -90,
                position: "insideLeft",
                offset: 8,
                style: { fill: "#94A3B8", fontSize: 10, textAnchor: "middle" },
              }}
            />
            <ZAxis dataKey="pct_delayed" range={[40, 400]} name="% Delayed" />
            <Tooltip
              contentStyle={{
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as RouteEconomics;
                return (
                  <div className="rounded-lg border border-border bg-white p-3 shadow-md">
                    <p className="text-xs font-bold text-foreground">
                      {d.route_id} ({d.airline_iata})
                    </p>
                    <div className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                      <p>Flights: {d.total_flights.toLocaleString()}</p>
                      <p>Delayed: {d.pct_delayed?.toFixed(1)}%</p>
                      <p>
                        Avg Delay: {d.avg_dep_delay?.toFixed(1)} min
                      </p>
                      <p>
                        Impact: $
                        {d.est_total_economic_impact?.toLocaleString()}
                      </p>
                      <p>Cause: {d.dominant_delay_cause}</p>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11 }}
              iconType="circle"
              iconSize={8}
            />
            {causes.map((cause) => (
              <Scatter
                key={cause}
                name={cause}
                data={grouped[cause]}
                fill={
                  CHART_COLORS.delayCause[cause] || CHART_COLORS.primary
                }
                fillOpacity={0.7}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
