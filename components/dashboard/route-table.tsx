"use client";

import { CHART_COLORS } from "@/lib/constants";
import type { RouteEconomics } from "@/lib/types";

interface RouteTableProps {
  data: RouteEconomics[];
}

export function RouteTable({ data }: RouteTableProps) {
  const top15 = data.slice(0, 15);

  return (
    <div className="chart-card overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="p-5 pb-0">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Top Routes by Economic Impact
        </h3>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Route
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Airline
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Flights
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                % Delayed
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Avg Delay
              </th>
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Total Cost
              </th>
              <th className="px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Cause
              </th>
            </tr>
          </thead>
          <tbody>
            {top15.map((route, i) => (
              <tr
                key={`${route.route_id}-${route.airline_iata}-${i}`}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="px-5 py-2.5 font-mono text-xs font-medium text-foreground">
                  {route.route_id}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">
                  {route.airline_iata}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-foreground">
                  {route.total_flights?.toLocaleString()}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-foreground">
                  {route.pct_delayed?.toFixed(1)}%
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-foreground">
                  {route.avg_dep_delay?.toFixed(1)} min
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-medium text-foreground">
                  ${route.est_total_economic_impact?.toLocaleString()}
                </td>
                <td className="px-5 py-2.5">
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${CHART_COLORS.delayCause[route.dominant_delay_cause] || CHART_COLORS.primary}15`,
                      color:
                        CHART_COLORS.delayCause[route.dominant_delay_cause] ||
                        CHART_COLORS.primary,
                    }}
                  >
                    {route.dominant_delay_cause}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
