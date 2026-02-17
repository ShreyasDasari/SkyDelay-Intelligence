-- Enable public read access on all mart tables
-- These are read-only analytics tables, no auth required

-- Option A: Disable RLS entirely (simplest for public dashboard)
ALTER TABLE IF EXISTS mart_delay_economics DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mart_cascade_vulnerability DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mart_route_economics DISABLE ROW LEVEL SECURITY;

-- Option B (alternative): If you want RLS but allow anon reads, run these instead:
-- CREATE POLICY "Allow anonymous read" ON mart_delay_economics FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous read" ON mart_cascade_vulnerability FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous read" ON mart_route_economics FOR SELECT USING (true);
