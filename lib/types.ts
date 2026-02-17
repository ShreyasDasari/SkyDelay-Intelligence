// mart_delay_economics table (30,364 rows)
export interface DelayEconomics {
  airport: string;
  flight_date: string;
  day_name: string;
  is_weekend: boolean;
  month: number;
  total_departures: number;
  avg_dep_delay_min: number;
  pct_delayed_15: number;
  flights_delayed_15: number;
  flights_cancelled: number;
  pct_cancelled: number;
  est_passenger_delay_cost: number;
  est_airline_ops_cost: number;
  est_total_economic_impact: number;
  avg_weather_delay: number;
  avg_carrier_delay: number;
  avg_nas_delay: number;
  avg_late_aircraft_delay: number;
  weather_delays: number;
  carrier_delays: number;
  nas_delays: number;
  late_aircraft_delays: number;
  routes_served: number;
  airlines_operating: number;
  rolling_7day_avg_delay: number;
  rolling_7day_pct_delayed: number;
}

// mart_cascade_vulnerability table (161 rows)
export interface CascadeVulnerability {
  airport: string;
  operating_days: number;
  total_departures: number;
  avg_delay_min: number;
  avg_pct_delayed: number;
  avg_pct_cancelled: number;
  max_routes_served: number;
  max_airlines: number;
  avg_late_aircraft_delay: number;
  avg_daily_economic_impact: number;
  total_economic_impact: number;
  cascade_vulnerability_score: number;
  vulnerability_rank: number;
}

// mart_route_economics table (8,436 rows)
export interface RouteEconomics {
  route_id: string;
  origin_airport: string;
  dest_airport: string;
  origin_city: string;
  dest_city: string;
  airline_iata: string;
  total_flights: number;
  delayed_flights: number;
  pct_delayed: number;
  avg_dep_delay: number;
  cancelled_flights: number;
  pct_cancelled: number;
  avg_distance_miles: number;
  est_passenger_cost: number;
  est_airline_ops_cost: number;
  est_total_economic_impact: number;
  est_cost_per_flight: number;
  dominant_delay_cause: string;
}

// Aggregated KPI data for overview
export interface OverviewKPIs {
  total_flights: number;
  avg_delay: number;
  pct_delayed: number;
  total_impact: number;
}

// Cascade simulation result
export interface CascadeResult {
  airport: string;
  delay_minutes: number;
  directly_affected_flights: number;
  cascade_affected_flights: number;
  total_affected_passengers: number;
  estimated_passenger_cost: number;
  estimated_airline_cost: number;
  total_economic_impact: number;
  cascade_multiplier: number;
}

// Heatmap cell
export interface HeatmapCell {
  day_name: string;
  month: number;
  value: number;
}

// Delay cause distribution
export interface DelayCause {
  cause: string;
  count: number;
}
