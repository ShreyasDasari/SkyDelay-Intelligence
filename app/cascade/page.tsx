import { CascadeSimulator } from "@/components/dashboard/cascade-simulator";
import { getCascadeAirports, getAirportDates } from "@/lib/queries";

export default async function CascadePage() {
  const airports = await getCascadeAirports();
  const dates = airports.length > 0 ? await getAirportDates(airports[0].airport) : [];

  return (
    <div className="space-y-6">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Cascade Delay Simulator
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Model the downstream ripple effect of a hub airport delay
        </p>
      </div>

      <CascadeSimulator airports={airports} dates={dates} />
    </div>
  );
}
