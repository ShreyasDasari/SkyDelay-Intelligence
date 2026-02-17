"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Zap, Route, Calendar, Plane, Github, Linkedin } from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";

const iconMap: Record<string, React.ReactNode> = {
  BarChart3: <BarChart3 className="h-[18px] w-[18px]" />,
  Zap: <Zap className="h-[18px] w-[18px]" />,
  Route: <Route className="h-[18px] w-[18px]" />,
  Calendar: <Calendar className="h-[18px] w-[18px]" />,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[240px] flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 pt-6 pb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Plane className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-white">
            SkyDelay
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Intelligence
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-6 flex flex-1 flex-col gap-1 px-3">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Analytics
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-150
                ${
                  isActive
                    ? "nav-active bg-sidebar-accent text-indigo-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
            >
              <span className={isActive ? "text-indigo-400" : "text-slate-500"}>
                {iconMap[item.icon]}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border px-5 py-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Data Range
        </div>
        <div className="mt-1 text-xs text-slate-400">Sep - Nov 2025</div>
        <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Sources
        </div>
        <div className="mt-1 text-xs text-slate-400">
          BTS &middot; OpenSky &middot; NOAA &middot; FAA
        </div>
        <div className="mt-4 border-t border-sidebar-border pt-3">
          <div className="text-xs font-medium text-slate-300">
            Built by Shreyas Dasari
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <a
              href="https://github.com/ShreyasDasari"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 transition-colors hover:text-indigo-400"
            >
              <Github className="h-3.5 w-3.5" />
            </a>
            <a
              href="https://linkedin.com/in/shreyasdasari"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 transition-colors hover:text-indigo-400"
            >
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
