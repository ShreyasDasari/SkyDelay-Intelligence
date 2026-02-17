"use client";

import useSWR from "swr";
import { Plane, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { VulnerabilityBar } from "@/components/dashboard/vulnerability-bar";
import { EconomicBar } from "@/components/dashboard/economic-bar";
import { TrendLine } from "@/components/dashboard/trend-line";
import { GlobeWrapper } from "@/components/three/globe-wrapper";
import { CHART_COLORS } from "@/lib/constants";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-[380px] animate-pulse rounded-2xl border border-border bg-muted/50" />
    </div>
  );
}

export default function OverviewPage() {
  const { data, error } = useSWR("/api/overview", fetcher);

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5">
        <p className="text-sm text-destructive">Failed to load data. Check Supabase connection.</p>
      </div>
    );
  }

  if (!data || data.error) return <LoadingSkeleton />;

  const { kpis, vulnerable, economic, trend, globe } = data;

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Flight Delay Economics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cascading cost analysis across 347 US airports &middot; Sep-Nov 2025
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-delay-1">
        <KpiCard
          label="Flights Analyzed"
          value={kpis.total_flights.toLocaleString()}
          icon={<Plane className="h-4 w-4" />}
          accentColor={CHART_COLORS.primary}
        />
        <KpiCard
          label="Avg Departure Delay"
          value={`${kpis.avg_delay} min`}
          icon={<Clock className="h-4 w-4" />}
          accentColor={CHART_COLORS.secondary}
        />
        <KpiCard
          label={"Delayed >= 15 min"}
          value={`${kpis.pct_delayed}%`}
          icon={<AlertTriangle className="h-4 w-4" />}
          accentColor={CHART_COLORS.accent}
        />
        <KpiCard
          label="Total Economic Impact"
          value={`$${Math.round(kpis.total_impact / 1e6).toLocaleString()}M`}
          icon={<DollarSign className="h-4 w-4" />}
          accentColor={CHART_COLORS.risk.high}
        />
      </div>

      <div className="animate-fade-in-delay-2">
        <GlobeWrapper airports={globe} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-delay-3">
        <VulnerabilityBar data={vulnerable} />
        <EconomicBar data={economic} />
      </div>

      <div className="animate-fade-in-delay-3">
        <TrendLine data={trend} />
      </div>
    </div>
  );
}
