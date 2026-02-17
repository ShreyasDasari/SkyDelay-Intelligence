"use client";

import { GlobeHero } from "@/components/three/globe";
import type { CascadeVulnerability } from "@/lib/types";

interface GlobeWrapperProps {
  airports: CascadeVulnerability[];
}

export function GlobeWrapper({ airports }: GlobeWrapperProps) {
  return <GlobeHero airports={airports} />;
}
