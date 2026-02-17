"use client";

import useSWR from "swr";
import { Heatmap } from "@/components/dashboard/heatmap";
import { DelayPie } from "@/components/dashboard/delay-pie";
import { DailyImpactBar } from "@/components/dashboard/daily-impact-bar";
import { getHeatmapData, getDelayCauseDistribution } from "@/lib/queries";

export default function PatternsPage() {
  const { data: heatmapData } = useSWR("heatmap-data", getHeatmapData);
  const { data: causeData } = useSWR("cause-data", getDelayCauseDistribution);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Delay Patterns
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Temporal and causal analysis of US domestic flight delays
        </p>
      </div>

      {heatmapData && causeData ? (
        <>
          <div className="animate-fade-in-delay-1">
            <Heatmap data={heatmapData} />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-delay-2">
            <DelayPie data={causeData} />
            <DailyImpactBar />
          </div>
        </>
      ) : (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-card">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading pattern data...</p>
          </div>
        </div>
      )}
    </div>
  );
}
