-- Add public read policies for analytics tables
-- These are read-only analytics marts, safe for anonymous access

ALTER TABLE IF EXISTS mart_delay_economics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON mart_delay_economics FOR SELECT USING (true);

ALTER TABLE IF EXISTS mart_cascade_vulnerability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON mart_cascade_vulnerability FOR SELECT USING (true);

ALTER TABLE IF EXISTS mart_route_economics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access" ON mart_route_economics FOR SELECT USING (true);
