"use client";

import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { AIRPORT_COORDS } from "@/lib/constants";

// Normalize lat/lon to flat 2D plane
function latLonToFlat(lat: number, lon: number): [number, number] {
  // Center on US: lat 25-50, lon -65 to -125
  const x = ((lon + 125) / 60) * 8 - 4;
  const y = ((lat - 25) / 25) * 5 - 2.5;
  return [x, y];
}

function RippleRing({
  delay,
  index,
  active,
}: {
  delay: number;
  index: number;
  active: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0.2);
  const [opacity, setOpacity] = useState(0.8);

  useFrame((_, delta) => {
    if (!active) return;
    setScale((s) => {
      const newScale = s + delta * (0.6 + index * 0.15);
      if (newScale > 3) return 0.2;
      return newScale;
    });
    setOpacity((o) => {
      const newOpacity = 0.8 - (scale / 3) * 0.8;
      return Math.max(0, newOpacity);
    });
  });

  if (!active) return null;

  return (
    <mesh ref={ref} scale={[scale, scale, 1]} position={[0, 0, 0.01 * index]}>
      <ringGeometry args={[0.95, 1, 64]} />
      <meshBasicMaterial
        color="#4F46E5"
        transparent
        opacity={opacity}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function AirportNode({
  code,
  position,
  isSource,
  isAffected,
  affectedDelay,
}: {
  code: string;
  position: [number, number];
  isSource: boolean;
  isAffected: boolean;
  affectedDelay: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [glowOpacity, setGlowOpacity] = useState(0);

  useFrame((_, delta) => {
    if (isSource && ref.current) {
      ref.current.rotation.z += delta * 0.5;
    }
    if (isAffected) {
      setGlowOpacity((o) => Math.min(o + delta * 2, 0.8));
    }
  });

  const color = isSource ? "#DC2626" : isAffected ? "#F59E0B" : "#94A3B8";
  const size = isSource ? 0.12 : isAffected ? 0.08 : 0.04;

  return (
    <group position={[position[0], position[1], 0]}>
      {/* Glow */}
      {(isSource || isAffected) && (
        <mesh>
          <circleGeometry args={[size * 3, 32]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isSource ? 0.2 : glowOpacity * 0.15}
          />
        </mesh>
      )}
      <mesh ref={ref}>
        <circleGeometry args={[size, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {(isSource || isAffected) && (
        <Text
          position={[0, size + 0.15, 0.1]}
          fontSize={0.12}
          color={isSource ? "#DC2626" : "#D97706"}
          anchorX="center"
          anchorY="bottom"
          font="/fonts/Geist-Bold.ttf"
        >
          {code}
        </Text>
      )}
    </group>
  );
}

function CascadeScene({
  sourceAirport,
  active,
  affectedAirports,
}: {
  sourceAirport: string;
  active: boolean;
  affectedAirports: string[];
}) {
  const sourceCoord = AIRPORT_COORDS[sourceAirport];
  const sourcePos = sourceCoord
    ? latLonToFlat(sourceCoord.lat, sourceCoord.lon)
    : ([0, 0] as [number, number]);

  const airportNodes = useMemo(() => {
    return Object.entries(AIRPORT_COORDS).map(([code, coord]) => ({
      code,
      position: latLonToFlat(coord.lat, coord.lon) as [number, number],
    }));
  }, []);

  return (
    <>
      <ambientLight intensity={0.8} />

      {/* US outline (subtle grid) */}
      <gridHelper
        args={[10, 20, "#E2E8F0", "#F1F5F9"]}
        rotation={[Math.PI / 2, 0, 0]}
        position={[0, 0, -0.1]}
      />

      {/* Ripple rings from source */}
      <group position={[sourcePos[0], sourcePos[1], 0]}>
        {[0, 1, 2, 3].map((i) => (
          <RippleRing key={i} delay={i * 0.5} index={i} active={active} />
        ))}
      </group>

      {/* Connection lines to affected airports */}
      {active &&
        affectedAirports.map((code) => {
          const coord = AIRPORT_COORDS[code];
          if (!coord) return null;
          const pos = latLonToFlat(coord.lat, coord.lon);
          const geom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(sourcePos[0], sourcePos[1], 0.02),
            new THREE.Vector3(pos[0], pos[1], 0.02),
          ]);
          return (
            <line key={code} geometry={geom}>
              <lineBasicMaterial color="#F59E0B" transparent opacity={0.3} />
            </line>
          );
        })}

      {/* Airport nodes */}
      {airportNodes.map((node) => (
        <AirportNode
          key={node.code}
          code={node.code}
          position={node.position}
          isSource={node.code === sourceAirport}
          isAffected={active && affectedAirports.includes(node.code)}
          affectedDelay={0}
        />
      ))}
    </>
  );
}

interface CascadeRippleProps {
  sourceAirport: string;
  active: boolean;
  affectedAirports?: string[];
}

export function CascadeRipple({
  sourceAirport,
  active,
  affectedAirports = [],
}: CascadeRippleProps) {
  // Generate affected airports from hub connections if not provided
  const affected = useMemo(() => {
    if (affectedAirports.length > 0) return affectedAirports;
    // Default: show top connected airports
    const nearby = Object.keys(AIRPORT_COORDS).filter(
      (c) => c !== sourceAirport
    );
    return nearby.slice(0, 10);
  }, [sourceAirport, affectedAirports]);

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-slate-50 to-white">
      <Canvas
        camera={{ position: [0, 0, 7], fov: 45 }}
        orthographic={false}
        style={{ background: "transparent" }}
      >
        <CascadeScene
          sourceAirport={sourceAirport}
          active={active}
          affectedAirports={affected}
        />
      </Canvas>
      {!active && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Run a simulation to see cascade propagation
          </p>
        </div>
      )}
    </div>
  );
}
