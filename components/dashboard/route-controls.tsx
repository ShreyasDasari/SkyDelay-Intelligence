"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CAUSES = ["Weather", "Carrier", "NAS/ATC", "Late Aircraft"];

export function RouteControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentMinFlights = parseInt(searchParams.get("minFlights") || "100");
  const currentCauses = searchParams.get("causes")?.split(",") || CAUSES;

  const [minFlights, setMinFlights] = useState(currentMinFlights);
  const [selectedCauses, setSelectedCauses] = useState<string[]>(currentCauses);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    params.set("minFlights", minFlights.toString());
    params.set("causes", selectedCauses.join(","));
    startTransition(() => {
      router.push(`/routes?${params.toString()}`);
    });
  }, [minFlights, selectedCauses, router]);

  function toggleCause(cause: string) {
    setSelectedCauses((prev) =>
      prev.includes(cause)
        ? prev.filter((c) => c !== cause)
        : [...prev, cause]
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Minimum Flights: {minFlights}
          </label>
          <input
            type="range"
            min={50}
            max={500}
            step={50}
            value={minFlights}
            onChange={(e) => setMinFlights(parseInt(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>50</span>
            <span>500</span>
          </div>
        </div>
        <div className="flex-1">
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Delay Cause Filter
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CAUSES.map((cause) => (
              <button
                key={cause}
                onClick={() => toggleCause(cause)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
                  selectedCauses.includes(cause)
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                {cause}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={applyFilters}
          disabled={isPending}
          className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Apply"}
        </button>
      </div>
    </div>
  );
}
