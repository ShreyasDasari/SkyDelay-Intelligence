import { Heatmap } from "@/components/dashboard/heatmap";
import { DelayPie } from "@/components/dashboard/delay-pie";
import { DailyImpactBar } from "@/components/dashboard/daily-impact-bar";
import { getHeatmapData, getDelayCauseDistribution } from "@/lib/queries";

export default async function PatternsPage() {
  const [heatmapData, causeData] = await Promise.all([
    getHeatmapData(),
    getDelayCauseDistribution(),
  ]);

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

      <div className="animate-fade-in-delay-1">
        <Heatmap data={heatmapData} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-delay-2">
        <DelayPie data={causeData} />
        <DailyImpactBar />
      </div>
    </div>
  );
}
