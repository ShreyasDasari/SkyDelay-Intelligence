"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { CHART_COLORS } from "@/lib/constants";

const AIRPORTS = ["ORD", "ATL", "DFW", "JFK", "DEN", "LAX", "EWR", "BOS"];

export function DailyImpactBar() {
  const [airport, setAirport] = useState("ORD");
  const [data, setData] = useState<
    { flight_date: string; cost: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const supabase = createClient();
      const { data: result } = await supabase
        .from("mart_delay_economics")
        .select("flight_date, est_total_economic_impact")
        .eq("airport", airport)
        .order("flight_date", { ascending: true });

      setData(
        (result || []).map((r) => ({
          flight_date: r.flight_date?.slice(5) || "",
          cost: r.est_total_economic_impact || 0,
        }))
      );
      setLoading(false);
    }
    fetchData();
  }, [airport]);

  return (
    <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Daily Economic Impact
        </h3>
        <select
          value={airport}
          onChange={(e) => setAirport(e.target.value)}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
        >
          {AIRPORTS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 h-[300px]">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#F1F5F9"
                vertical={false}
              />
              <XAxis
                dataKey="flight_date"
                tick={{ fill: "#64748B", fontSize: 9 }}
                axisLine={{ stroke: "#E2E8F0" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) =>
                  v >= 1e6
                    ? `$${(v / 1e6).toFixed(1)}M`
                    : `$${(v / 1e3).toFixed(0)}K`
                }
              />
              <Tooltip
                contentStyle={{
                  background: "#fff",
                  border: "1px solid #E2E8F0",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [
                  `$${value.toLocaleString()}`,
                  "Daily Cost",
                ]}
              />
              <Bar
                dataKey="cost"
                fill={CHART_COLORS.primary}
                radius={[2, 2, 0, 0]}
                maxBarSize={8}
                opacity={0.85}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
