"use client";

import dynamic from "next/dynamic";
import type { CascadeVulnerability } from "@/lib/types";

const GlobeHero = dynamic(
  () => import("@/components/three/globe").then((m) => m.GlobeHero),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[380px] w-full items-center justify-center rounded-2xl border border-border bg-gradient-to-b from-slate-50 to-white">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">
            Loading 3D visualization...
          </p>
        </div>
      </div>
    ),
  }
);

interface GlobeWrapperProps {
  airports: CascadeVulnerability[];
}

export function GlobeWrapper({ airports }: GlobeWrapperProps) {
  return <GlobeHero airports={airports} />;
}
