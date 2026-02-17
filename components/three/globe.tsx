"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, Html } from "@react-three/drei";
import * as THREE from "three";
import { AIRPORT_COORDS, HUB_CONNECTIONS } from "@/lib/constants";
import type { CascadeVulnerability } from "@/lib/types";

function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function ArcLine({ start, end }: { start: THREE.Vector3; end: THREE.Vector3 }) {
  const curve = useMemo(() => {
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    mid.normalize().multiplyScalar(2.3);
    return new THREE.QuadraticBezierCurve3(start, mid, end);
  }, [start, end]);

  const geometry = useMemo(() => {
    const points = curve.getPoints(40);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [curve]);

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color="#4F46E5" transparent opacity={0.2} />
    </line>
  );
}

function GlobeModel({ airports }: { airports: CascadeVulnerability[] }) {
  const globeRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.08;
    }
  });

  const airportPoints = useMemo(() => {
    return airports
      .filter((a) => AIRPORT_COORDS[a.airport])
      .map((a) => {
        const coord = AIRPORT_COORDS[a.airport];
        const pos = latLonToVector3(coord.lat, coord.lon, 2.01);
        const impact = a.total_economic_impact || 0;
        const maxImpact = Math.max(...airports.map((x) => x.total_economic_impact || 1));
        const size = 0.02 + (impact / maxImpact) * 0.05;
        return { ...a, position: pos, size };
      });
  }, [airports]);

  const arcs = useMemo(() => {
    return HUB_CONNECTIONS.map(([from, to]) => {
      if (!AIRPORT_COORDS[from] || !AIRPORT_COORDS[to]) return null;
      const s = latLonToVector3(AIRPORT_COORDS[from].lat, AIRPORT_COORDS[from].lon, 2);
      const e = latLonToVector3(AIRPORT_COORDS[to].lat, AIRPORT_COORDS[to].lon, 2);
      return { start: s, end: e, key: `${from}-${to}` };
    }).filter(Boolean) as { start: THREE.Vector3; end: THREE.Vector3; key: string }[];
  }, []);

  return (
    <group ref={globeRef}>
      {/* Wireframe globe */}
      <Sphere args={[2, 64, 64]}>
        <meshPhongMaterial color="#E2E8F0" transparent opacity={0.15} wireframe />
      </Sphere>
      {/* Solid inner */}
      <Sphere args={[1.98, 64, 64]}>
        <meshPhongMaterial color="#F1F5F9" transparent opacity={0.4} />
      </Sphere>
      {/* Airports */}
      {airportPoints.map((ap) => (
        <group key={ap.airport} position={ap.position}>
          <mesh>
            <sphereGeometry args={[ap.size, 16, 16]} />
            <meshBasicMaterial
              color={ap.avg_pct_delayed > 22 ? "#DC2626" : ap.avg_pct_delayed > 18 ? "#D97706" : "#059669"}
            />
          </mesh>
          {ap.vulnerability_rank <= 5 && (
            <Html position={[0, ap.size + 0.06, 0]} center style={{ pointerEvents: "none" }}>
              <div className="whitespace-nowrap rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur">
                {ap.airport}
              </div>
            </Html>
          )}
        </group>
      ))}
      {/* Arcs */}
      {arcs.map((arc) => (
        <ArcLine key={arc.key} start={arc.start} end={arc.end} />
      ))}
    </group>
  );
}

export function GlobeHero({ airports }: { airports: CascadeVulnerability[] }) {
  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-slate-50 to-white">
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} style={{ background: "transparent" }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color="#4F46E5" />
        <GlobeModel airports={airports} />
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
      <div className="pointer-events-none absolute top-6 left-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Hub Vulnerability Network
        </h2>
        <p className="mt-1 text-xs text-muted-foreground/70">
          3D visualization of US airport cascade risk
        </p>
      </div>
      <div className="absolute right-6 bottom-8 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-600" />
          <span className="text-[10px] text-muted-foreground">{"High (>22%)"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-600" />
          <span className="text-[10px] text-muted-foreground">Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
          <span className="text-[10px] text-muted-foreground">{"Low (<18%)"}</span>
        </div>
      </div>
    </div>
  );
}
