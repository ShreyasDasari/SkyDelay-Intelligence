"use client";

import { DAY_ORDER } from "@/lib/constants";
import type { HeatmapCell } from "@/lib/types";

interface HeatmapProps {
  data: HeatmapCell[];
}

function getHeatColor(value: number, min: number, max: number): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  // White -> Indigo-100 -> Indigo-300 -> Indigo-600
  if (t < 0.33) {
    const s = t / 0.33;
    const r = Math.round(255 - (255 - 224) * s);
    const g = Math.round(255 - (255 - 231) * s);
    const b = Math.round(255 - (255 - 255) * s);
    return `rgb(${r}, ${g}, ${b})`;
  }
  if (t < 0.66) {
    const s = (t - 0.33) / 0.33;
    const r = Math.round(224 - (224 - 165) * s);
    const g = Math.round(231 - (231 - 180) * s);
    const b = Math.round(255 - (255 - 252) * s);
    return `rgb(${r}, ${g}, ${b})`;
  }
  const s = (t - 0.66) / 0.34;
  const r = Math.round(165 - (165 - 79) * s);
  const g = Math.round(180 - (180 - 70) * s);
  const b = Math.round(252 - (252 - 229) * s);
  return `rgb(${r}, ${g}, ${b})`;
}

function getTextColor(value: number, min: number, max: number): string {
  const t = (value - min) / (max - min || 1);
  return t > 0.55 ? "#FFFFFF" : "#334155";
}

export function Heatmap({ data }: HeatmapProps) {
  const months = [...new Set(data.map((d) => d.month))].sort((a, b) => a - b);
  const monthLabels: Record<number, string> = {
    1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr", 5: "May", 6: "Jun",
    7: "Jul", 8: "Aug", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec",
  };

  // Build lookup
  const lookup: Record<string, number> = {};
  data.forEach((d) => {
    lookup[`${d.day_name}|${d.month}`] = d.value;
  });

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return (
    <div className="chart-card rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {"Delay Rate - Day of Week x Month"}
      </h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground" />
              {months.map((m) => (
                <th
                  key={m}
                  className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {monthLabels[m] || `M${m}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_ORDER.map((day) => (
              <tr key={day}>
                <td className="px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {day.slice(0, 3)}
                </td>
                {months.map((m) => {
                  const val = lookup[`${day}|${m}`];
                  if (val === undefined) {
                    return (
                      <td key={m} className="px-1 py-1">
                        <div className="flex h-10 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                          -
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={m} className="px-1 py-1">
                      <div
                        className="flex h-10 items-center justify-center rounded-md text-[11px] font-semibold transition-all hover:scale-105"
                        style={{
                          backgroundColor: getHeatColor(val, min, max),
                          color: getTextColor(val, min, max),
                        }}
                      >
                        {val.toFixed(1)}%
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="text-[10px] text-muted-foreground">Low</span>
        <div className="flex h-3 w-32 overflow-hidden rounded-full">
          <div className="flex-1" style={{ backgroundColor: getHeatColor(min, min, max) }} />
          <div className="flex-1" style={{ backgroundColor: getHeatColor((min + max) / 3, min, max) }} />
          <div className="flex-1" style={{ backgroundColor: getHeatColor((2 * (min + max)) / 3, min, max) }} />
          <div className="flex-1" style={{ backgroundColor: getHeatColor(max, min, max) }} />
        </div>
        <span className="text-[10px] text-muted-foreground">High</span>
      </div>
    </div>
  );
}
