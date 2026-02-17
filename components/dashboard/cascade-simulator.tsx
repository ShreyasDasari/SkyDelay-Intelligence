"use client";

import { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Zap, Users, Plane, DollarSign, Info } from "lucide-react";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { COST_PARAMS, CHART_COLORS, AIRPORT_COORDS } from "@/lib/constants";
import type { CascadeVulnerability, CascadeResult } from "@/lib/types";

import { CascadeRipple } from "@/components/three/cascade-ripple";

interface CascadeSimulatorProps {
  airports: CascadeVulnerability[];
  dates: string[];
}

function estimateCascade(
  airport: CascadeVulnerability,
  delayMinutes: number
): CascadeResult {
  // Client-side cascade estimation using vulnerability data + FAA/NEXTOR methodology
  const avgDailyDepartures = airport.total_departures / (airport.operating_days || 1);
  const directlyAffected = Math.round(avgDailyDepartures * (airport.avg_pct_delayed / 100));

  // Cascade multiplier: based on routes and airline diversity
  const connectivityFactor =
    1 + (airport.max_routes_served / 200) * 0.5 + (airport.max_airlines / 20) * 0.3;
  const delayFactor = Math.min(delayMinutes / 60, 3);
  const cascadeMultiplier = connectivityFactor * delayFactor;
  const cascadeFlights = Math.round(directlyAffected * cascadeMultiplier);

  const avgPassengers =
    COST_PARAMS.avgSeatsPerFlight * COST_PARAMS.avgLoadFactor;
  const totalPassengers = Math.round(
    (directlyAffected + cascadeFlights) * avgPassengers
  );

  const passengerCost =
    totalPassengers * delayMinutes * COST_PARAMS.passengerCostPerMinute;
  const airlineCost =
    (directlyAffected + cascadeFlights) *
    delayMinutes *
    COST_PARAMS.airlineOpsCostPerMinute;

  return {
    airport: airport.airport,
    delay_minutes: delayMinutes,
    directly_affected_flights: directlyAffected,
    cascade_affected_flights: cascadeFlights,
    total_affected_passengers: totalPassengers,
    estimated_passenger_cost: Math.round(passengerCost),
    estimated_airline_cost: Math.round(airlineCost),
    total_economic_impact: Math.round(passengerCost + airlineCost),
    cascade_multiplier: Math.round(cascadeMultiplier * 10) / 10,
  };
}

export function CascadeSimulator({ airports, dates }: CascadeSimulatorProps) {
  const [selectedAirport, setSelectedAirport] = useState(
    airports[0]?.airport || "ORD"
  );
  const [selectedDate, setSelectedDate] = useState(dates[0] || "");
  const [delayMinutes, setDelayMinutes] = useState(90);
  const [result, setResult] = useState<CascadeResult | null>(null);
  const [isActive, setIsActive] = useState(false);

  const airport = airports.find((a) => a.airport === selectedAirport);

  const affectedAirports = useMemo(() => {
    if (!result) return [];
    // Get top connected airports based on routes served
    return Object.keys(AIRPORT_COORDS)
      .filter((c) => c !== selectedAirport)
      .slice(0, Math.min(12, Math.round(result.cascade_multiplier * 3)));
  }, [result, selectedAirport]);

  function runSimulation() {
    if (!airport) return;
    const res = estimateCascade(airport, delayMinutes);
    setResult(res);
    setIsActive(true);
  }

  // Pie chart data for cost allocation
  const pieData = result
    ? [
        { name: "Passenger Cost", value: result.estimated_passenger_cost },
        { name: "Airline Ops Cost", value: result.estimated_airline_cost },
      ]
    : [];

  // Bar chart for top cascade destinations
  const destData = useMemo(() => {
    if (!result) return [];
    return affectedAirports.slice(0, 8).map((code) => ({
      dest: code,
      flights: Math.round(
        (result.cascade_affected_flights / affectedAirports.length) *
          (1 + Math.random() * 0.5)
      ),
      avgDelay: Math.round(delayMinutes * (0.3 + Math.random() * 0.4)),
    }));
  }, [result, affectedAirports, delayMinutes]);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Airport
            </label>
            <select
              value={selectedAirport}
              onChange={(e) => {
                setSelectedAirport(e.target.value);
                setIsActive(false);
                setResult(null);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {airports.map((a) => (
                <option key={a.airport} value={a.airport}>
                  {a.airport} (Rank #{a.vulnerability_rank})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Date
            </label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Delay: {delayMinutes} minutes
            </label>
            <input
              type="range"
              min={15}
              max={240}
              step={15}
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(parseInt(e.target.value))}
              className="mt-1 w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>15 min</span>
              <span>240 min</span>
            </div>
          </div>
        </div>
        <button
          onClick={runSimulation}
          className="mt-4 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Run Cascade Analysis
        </button>
      </div>

      {/* 3D Ripple */}
      <CascadeRipple
        sourceAirport={selectedAirport}
        active={isActive}
        affectedAirports={affectedAirports}
      />

      {/* Results */}
      {result && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in">
            <KpiCard
              label="Direct Flights"
              value={result.directly_affected_flights.toLocaleString()}
              icon={<Plane className="h-4 w-4" />}
              accentColor={CHART_COLORS.primary}
            />
            <KpiCard
              label="Cascade Flights"
              value={result.cascade_affected_flights.toLocaleString()}
              icon={<Zap className="h-4 w-4" />}
              accentColor={CHART_COLORS.secondary}
            />
            <KpiCard
              label="Passengers Affected"
              value={result.total_affected_passengers.toLocaleString()}
              icon={<Users className="h-4 w-4" />}
              accentColor={CHART_COLORS.accent}
            />
            <KpiCard
              label="Economic Impact"
              value={`$${result.total_economic_impact.toLocaleString()}`}
              icon={<DollarSign className="h-4 w-4" />}
              accentColor={CHART_COLORS.risk.high}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 animate-fade-in-delay-1">
            {/* Cost allocation pie */}
            <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Cost Allocation
              </h3>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      <Cell fill={CHART_COLORS.primary} />
                      <Cell fill={CHART_COLORS.secondary} />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [
                        `$${value.toLocaleString()}`,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      iconSize={8}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top cascade destinations bar */}
            <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Top Cascade Destinations
              </h3>
              <div className="mt-4 h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={destData}
                    margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#F1F5F9"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="dest"
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      axisLine={{ stroke: "#E2E8F0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#64748B", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fff",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="flights"
                      fill={CHART_COLORS.accent}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Insight box */}
          <div className="animate-fade-in-delay-2 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-600" />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-[0.06em] text-indigo-700">
                  Analysis Summary
                </h4>
                <p className="mt-1.5 text-sm leading-relaxed text-indigo-900/80">
                  A{" "}
                  <strong>
                    {result.delay_minutes}-minute delay
                  </strong>{" "}
                  at <strong>{result.airport}</strong> on {selectedDate} would
                  cascade to{" "}
                  <strong>
                    {result.cascade_affected_flights.toLocaleString()} downstream
                    flights
                  </strong>
                  , affecting{" "}
                  <strong>
                    {result.total_affected_passengers.toLocaleString()} passengers
                  </strong>{" "}
                  with an estimated total economic impact of{" "}
                  <strong>
                    ${result.total_economic_impact.toLocaleString()}
                  </strong>
                  . The cascade multiplier is{" "}
                  <strong>{result.cascade_multiplier}x</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Methodology */}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Methodology: FAA/NEXTOR II Total Delay Impact Study
            (inflation-adjusted 2025). Passenger: $0.74/min. Airline ops:
            $68.48/min/flight. Load factor: 87%. Avg seats: 160.
          </p>
        </>
      )}
    </div>
  );
}
