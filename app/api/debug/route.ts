import { createClient } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createClient();

  // Check if tables exist and what data looks like
  const results: Record<string, unknown> = {};

  // Test 1: mart_delay_economics - get 1 row to see column names
  const { data: d1, error: e1 } = await supabase
    .from("mart_delay_economics")
    .select("*")
    .limit(1);
  results.mart_delay_economics = { data: d1, error: e1?.message };

  // Test 2: mart_cascade_vulnerability - get 1 row
  const { data: d2, error: e2 } = await supabase
    .from("mart_cascade_vulnerability")
    .select("*")
    .limit(1);
  results.mart_cascade_vulnerability = { data: d2, error: e2?.message };

  // Test 3: mart_route_economics - get 1 row
  const { data: d3, error: e3 } = await supabase
    .from("mart_route_economics")
    .select("*")
    .limit(1);
  results.mart_route_economics = { data: d3, error: e3?.message };

  // Test 4: count rows in each
  const { count: c1 } = await supabase
    .from("mart_delay_economics")
    .select("*", { count: "exact", head: true });
  const { count: c2 } = await supabase
    .from("mart_cascade_vulnerability")
    .select("*", { count: "exact", head: true });
  const { count: c3 } = await supabase
    .from("mart_route_economics")
    .select("*", { count: "exact", head: true });
  results.row_counts = {
    mart_delay_economics: c1,
    mart_cascade_vulnerability: c2,
    mart_route_economics: c3,
  };

  return NextResponse.json(results, { status: 200 });
}
