"use client";

import { useEffect, useRef, useMemo } from "react";
import { AIRPORT_COORDS, HUB_CONNECTIONS } from "@/lib/constants";
import type { CascadeVulnerability } from "@/lib/types";

// Project lat/lon to SVG coordinates (Albers-like for US focus)
function project(lat: number, lon: number): [number, number] {
  const x = ((lon + 130) / 70) * 900 + 50;
  const y = ((50 - lat) / 30) * 500 + 30;
  return [x, y];
}

function ArcPath({ from, to, delay }: { from: string; to: string; delay: number }) {
  const c1 = AIRPORT_COORDS[from];
  const c2 = AIRPORT_COORDS[to];
  if (!c1 || !c2) return null;
  const [x1, y1] = project(c1.lat, c1.lon);
  const [x2, y2] = project(c2.lat, c2.lon);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - 40;
  return (
    <path
      d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
      fill="none"
      stroke="#4F46E5"
      strokeWidth={0.8}
      opacity={0.15}
      className="arc-path"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}

export function GlobeHero({ airports }: { airports: CascadeVulnerability[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Particle background animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: { x: number; y: number; vx: number; vy: number; r: number; o: number }[] = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * 1000,
        y: Math.random() * 600,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.5 + 0.5,
        o: Math.random() * 0.3 + 0.05,
      });
    }

    let animId: number;
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > rect.width) p.vx *= -1;
        if (p.y < 0 || p.y > rect.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79, 70, 229, ${p.o})`;
        ctx.fill();
      }
      // Draw connecting lines between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(79, 70, 229, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const airportPoints = useMemo(() => {
    const maxImpact = Math.max(...airports.map((a) => a.total_economic_impact || 1));
    return airports
      .filter((a) => AIRPORT_COORDS[a.airport])
      .map((a) => {
        const coord = AIRPORT_COORDS[a.airport];
        const [x, y] = project(coord.lat, coord.lon);
        const impact = a.total_economic_impact || 0;
        const r = 3 + (impact / maxImpact) * 10;
        const risk = a.avg_pct_delayed > 22 ? "high" : a.avg_pct_delayed > 18 ? "moderate" : "low";
        return { ...a, x, y, r, risk };
      });
  }, [airports]);

  const arcs = useMemo(() => {
    return HUB_CONNECTIONS.map(([from, to], i) => ({ from, to, delay: i * 0.15 }));
  }, []);

  return (
    <div className="relative h-[380px] w-full overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Animated particle canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* SVG Map overlay */}
      <svg
        viewBox="0 0 1000 560"
        className="relative z-10 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Flight arcs */}
        {arcs.map((arc) => (
          <ArcPath key={`${arc.from}-${arc.to}`} from={arc.from} to={arc.to} delay={arc.delay} />
        ))}

        {/* Airport glow rings */}
        {airportPoints.map((ap) => (
          <g key={ap.airport}>
            {/* Outer pulse ring for top 5 */}
            {ap.vulnerability_rank <= 5 && (
              <circle
                cx={ap.x}
                cy={ap.y}
                r={ap.r * 2.5}
                fill="none"
                stroke={ap.risk === "high" ? "#DC2626" : ap.risk === "moderate" ? "#D97706" : "#059669"}
                strokeWidth={0.5}
                opacity={0.3}
                className="pulse-ring"
                style={{ transformOrigin: `${ap.x}px ${ap.y}px`, animationDelay: `${ap.vulnerability_rank * 0.3}s` }}
              />
            )}
            {/* Glow */}
            <circle
              cx={ap.x}
              cy={ap.y}
              r={ap.r * 1.8}
              fill={ap.risk === "high" ? "#DC2626" : ap.risk === "moderate" ? "#D97706" : "#059669"}
              opacity={0.08}
            />
            {/* Dot */}
            <circle
              cx={ap.x}
              cy={ap.y}
              r={ap.r}
              fill={ap.risk === "high" ? "#DC2626" : ap.risk === "moderate" ? "#D97706" : "#059669"}
              opacity={0.85}
              className="airport-dot"
              style={{ animationDelay: `${ap.vulnerability_rank * 0.1}s` }}
            />
            {/* Label for top airports */}
            {ap.vulnerability_rank <= 8 && (
              <text
                x={ap.x}
                y={ap.y - ap.r - 5}
                textAnchor="middle"
                className="fill-slate-700 text-[10px] font-bold"
              >
                {ap.airport}
              </text>
            )}
          </g>
        ))}
      </svg>

      {/* Gradient overlays */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-16 bg-gradient-to-t from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-12 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-12 bg-gradient-to-l from-background to-transparent" />

      {/* Title overlay */}
      <div className="pointer-events-none absolute top-5 left-5 z-30">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Hub Vulnerability Network
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground/70">
          Animated visualization of US airport cascade risk
        </p>
      </div>

      {/* Legend */}
      <div className="absolute right-5 bottom-6 z-30 flex items-center gap-4">
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
