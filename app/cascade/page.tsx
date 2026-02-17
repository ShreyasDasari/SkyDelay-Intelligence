"use client";

import useSWR from "swr";
import { CascadeSimulator } from "@/components/dashboard/cascade-simulator";
import { getCascadeAirports, getAirportDates } from "@/lib/queries";

export default function CascadePage() {
  const { data: airports } = useSWR("cascade-airports", getCascadeAirports);
  const firstAirport = airports?.[0]?.airport;
  const { data: dates } = useSWR(
    firstAirport ? `dates-${firstAirport}` : null,
    () => (firstAirport ? getAirportDates(firstAirport) : Promise.resolve([]))
  );

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cascade Delay Simulator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Model the downstream ripple effect of a hub airport delay
        </p>
      </div>

      {airports && dates ? (
        <CascadeSimulator airports={airports} dates={dates} />
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading airports...</p>
          </div>
        </div>
      )}
    </div>
  );
}
