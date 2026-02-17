"use client";

import { useMemo } from "react";
import { AIRPORT_COORDS } from "@/lib/constants";

function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 130) / 70) * 900 + 50;
  const y = ((50 - lat) / 30) * 500 + 30;
  return [x, y];
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
  const affected = useMemo(() => {
    if (affectedAirports.length > 0) return affectedAirports;
    return Object.keys(AIRPORT_COORDS)
      .filter((c) => c !== sourceAirport)
      .slice(0, 10);
  }, [sourceAirport, affectedAirports]);

  const sourceCoord = AIRPORT_COORDS[sourceAirport];
  const sourcePos = sourceCoord
    ? project(sourceCoord.lat, sourceCoord.lon)
    : [500, 280];

  const connections = useMemo(() => {
    return affected
      .map((code) => {
        const coord = AIRPORT_COORDS[code];
        if (!coord) return null;
        const [x, y] = project(coord.lat, coord.lon);
        return { code, x, y };
      })
      .filter(Boolean) as { code: string; x: number; y: number }[];
  }, [affected]);

  return (
    <div className="relative h-[300px] w-full overflow-hidden rounded-xl border border-border bg-gradient-to-b from-slate-50 to-white">
      <svg
        viewBox="0 0 1000 560"
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <radialGradient id="ripple-grad">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background grid */}
        <g opacity={0.1}>
          {Array.from({ length: 20 }).map((_, i) => (
            <line key={`h${i}`} x1={0} y1={i * 28} x2={1000} y2={i * 28} stroke="#94A3B8" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 36 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 28} y1={0} x2={i * 28} y2={560} stroke="#94A3B8" strokeWidth={0.5} />
          ))}
        </g>

        {/* Ripple rings emanating from source */}
        {active && (
          <g>
            {[0, 1, 2, 3].map((i) => (
              <circle
                key={i}
                cx={sourcePos[0]}
                cy={sourcePos[1]}
                r={30}
                fill="none"
                stroke="#4F46E5"
                strokeWidth={2 - i * 0.3}
                className="cascade-ring"
                style={{ animationDelay: `${i * 0.4}s` }}
              />
            ))}
            <circle
              cx={sourcePos[0]}
              cy={sourcePos[1]}
              r={80}
              fill="url(#ripple-grad)"
              className="cascade-glow"
            />
          </g>
        )}

        {/* Connection lines to affected airports */}
        {active &&
          connections.map((c, i) => {
            const mx = (sourcePos[0] + c.x) / 2;
            const my = (sourcePos[1] + c.y) / 2 - 20;
            return (
              <g key={c.code}>
                <path
                  d={`M ${sourcePos[0]} ${sourcePos[1]} Q ${mx} ${my} ${c.x} ${c.y}`}
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth={1}
                  strokeDasharray="6 4"
                  opacity={0.5}
                  className="cascade-line"
                  style={{ animationDelay: `${0.5 + i * 0.15}s` }}
                />
              </g>
            );
          })}

        {/* Affected airport nodes */}
        {active &&
          connections.map((c, i) => (
            <g key={c.code} className="cascade-node" style={{ animationDelay: `${0.5 + i * 0.15}s` }}>
              <circle cx={c.x} cy={c.y} r={12} fill="#F59E0B" opacity={0.1} />
              <circle cx={c.x} cy={c.y} r={5} fill="#F59E0B" opacity={0.8} />
              <text
                x={c.x}
                y={c.y - 10}
                textAnchor="middle"
                className="fill-amber-700 text-[9px] font-bold"
              >
                {c.code}
              </text>
            </g>
          ))}

        {/* All airport dots (subtle) */}
        {Object.entries(AIRPORT_COORDS).map(([code, coord]) => {
          if (code === sourceAirport || affected.includes(code)) return null;
          const [x, y] = project(coord.lat, coord.lon);
          return <circle key={code} cx={x} cy={y} r={2} fill="#94A3B8" opacity={0.25} />;
        })}

        {/* Source airport */}
        <g>
          <circle cx={sourcePos[0]} cy={sourcePos[1]} r={18} fill="#DC2626" opacity={0.12} />
          <circle
            cx={sourcePos[0]}
            cy={sourcePos[1]}
            r={8}
            fill="#DC2626"
            className={active ? "source-pulse" : ""}
          />
          <text
            x={sourcePos[0]}
            y={sourcePos[1] - 22}
            textAnchor="middle"
            className="fill-red-700 text-[11px] font-bold"
          >
            {sourceAirport}
          </text>
        </g>
      </svg>

      {!active && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
          <p className="text-sm text-muted-foreground">
            Run a simulation to see cascade propagation
          </p>
        </div>
      )}
    </div>
  );
}
