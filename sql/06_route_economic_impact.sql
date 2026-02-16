-- ============================================================================
-- QUERY 6: Route-Level Economic Impact Estimation
-- Skills: Calculation chains, business modeling in SQL, HAVING filters
-- Business Q: Which routes cause the most economic damage when delayed?
-- ============================================================================

WITH route_economics AS (
    SELECT
        origin,
        dest,
        origin || ' → ' || dest AS route,
        count(*) AS total_flights,
        sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) AS delayed_flights,
        round(avg(depdelayminutes), 1) AS avg_delay_min,
        -- Economic cost estimation per route
        -- Passenger cost: delayed_flights × avg_seats × load_factor × avg_delay × cost_per_min
        round(
            sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) 
            * 160 * 0.87 
            * avg(CASE WHEN depdelayminutes > 15 THEN depdelayminutes ELSE 0 END) 
            * 0.74
        , 0) AS est_passenger_cost,
        -- Airline ops cost: delayed_flights × avg_delay × cost_per_min_ops
        round(
            sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) 
            * avg(CASE WHEN depdelayminutes > 15 THEN depdelayminutes ELSE 0 END) 
            * 68.48
        , 0) AS est_airline_ops_cost
    FROM raw_bts_flights
    GROUP BY origin, dest
    HAVING count(*) >= 100
)
SELECT
    route,
    total_flights,
    delayed_flights,
    round(delayed_flights * 100.0 / total_flights, 1) AS pct_delayed,
    avg_delay_min,
    est_passenger_cost,
    est_airline_ops_cost,
    (est_passenger_cost + est_airline_ops_cost) AS total_economic_impact,
    round((est_passenger_cost + est_airline_ops_cost) / total_flights, 0) AS cost_per_flight
FROM route_economics
ORDER BY total_economic_impact DESC
LIMIT 25;