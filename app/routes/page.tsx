import { Suspense } from "react";
import { RouteScatter } from "@/components/dashboard/route-scatter";
import { RouteTable } from "@/components/dashboard/route-table";
import { RouteControls } from "@/components/dashboard/route-controls";
import { getRouteEconomics } from "@/lib/queries";

interface RoutesPageProps {
  searchParams: Promise<{ minFlights?: string; causes?: string }>;
}

export default async function RoutesPage({ searchParams }: RoutesPageProps) {
  const params = await searchParams;
  const minFlights = parseInt(params.minFlights || "100");
  const causes = params.causes
    ? params.causes.split(",")
    : ["Weather", "Carrier", "NAS/ATC", "Late Aircraft"];

  const routes = await getRouteEconomics(minFlights, causes);

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Route Economics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identifying routes with the highest delay-driven economic losses
        </p>
      </div>

      <Suspense fallback={null}>
        <RouteControls />
      </Suspense>

      <div className="animate-fade-in-delay-1">
        <RouteScatter data={routes} />
      </div>

      <div className="animate-fade-in-delay-2">
        <RouteTable data={routes} />
      </div>
    </div>
  );
}
