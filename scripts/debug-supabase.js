import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL:", url ? url.substring(0, 30) + "..." : "MISSING");
console.log("KEY:", key ? key.substring(0, 20) + "..." : "MISSING");

if (!url || !key) {
  console.log("Missing env vars!");
  process.exit(1);
}

const supabase = createClient(url, key);

// Try to list tables by querying information_schema
const { data: tables, error: tablesErr } = await supabase
  .from("information_schema.tables")
  .select("table_name")
  .eq("table_schema", "public");

console.log("\n--- Tables via information_schema ---");
console.log("Data:", tables);
console.log("Error:", tablesErr);

// Try the three expected table names
const tableNames = [
  "mart_delay_economics",
  "mart_cascade_vulnerability", 
  "mart_route_economics",
  // Maybe they used different names
  "delay_economics",
  "cascade_vulnerability",
  "route_economics",
];

for (const name of tableNames) {
  const { data, error, count } = await supabase
    .from(name)
    .select("*", { count: "exact", head: false })
    .limit(1);
  
  console.log(`\n--- Table: ${name} ---`);
  if (error) {
    console.log("Error:", error.message, error.code);
  } else {
    console.log("Count:", count);
    console.log("Sample row keys:", data && data.length > 0 ? Object.keys(data[0]) : "no rows");
    console.log("Sample row:", data && data.length > 0 ? JSON.stringify(data[0]).substring(0, 500) : "empty");
  }
}
