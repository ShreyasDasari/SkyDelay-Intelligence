"use client";

import { useState } from "react";
import useSWR from "swr";
import { RouteScatter } from "@/components/dashboard/route-scatter";
import { RouteTable } from "@/components/dashboard/route-table";
import { CHART_COLORS } from "@/lib/constants";

const ALL_CAUSES = ["Weather", "Carrier", "NAS/ATC", "Late Aircraft"];
const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function RoutesPage() {
  const [minFlights, setMinFlights] = useState(100);
  const [causes, setCauses] = useState<string[]>(ALL_CAUSES);

  const apiUrl = `/api/routes?minFlights=${minFlights}&causes=${causes.join(",")}`;
  const { data } = useSWR(apiUrl, fetcher);
  const routes = data?.routes;

  function toggleCause(cause: string) {
    setCauses((prev) =>
      prev.includes(cause) ? prev.filter((c) => c !== cause) : [...prev, cause]
    );
  }

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Route Economics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identifying routes with the highest delay-driven economic losses
        </p>
      </div>

      <div className="animate-fade-in-delay-1 flex flex-wrap items-end gap-6 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Min Flights
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={minFlights}
              onChange={(e) => setMinFlights(parseInt(e.target.value))}
              className="h-1.5 w-40 cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="min-w-[40px] font-mono text-sm font-semibold text-foreground">
              {minFlights}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            Delay Causes
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_CAUSES.map((cause) => {
              const active = causes.includes(cause);
              const color = CHART_COLORS.delayCause[cause] || CHART_COLORS.primary;
              return (
                <button
                  key={cause}
                  onClick={() => toggleCause(cause)}
                  className="rounded-full border px-3 py-1 text-xs font-medium transition-all"
                  style={{
                    borderColor: active ? color : "var(--color-border)",
                    backgroundColor: active ? `${color}12` : "transparent",
                    color: active ? color : "var(--color-muted-foreground)",
                  }}
                >
                  {cause}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {routes ? (
        <>
          <div className="animate-fade-in-delay-2">
            <RouteScatter data={routes} />
          </div>
          <div className="animate-fade-in-delay-3">
            <RouteTable data={routes} />
          </div>
        </>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading route data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
