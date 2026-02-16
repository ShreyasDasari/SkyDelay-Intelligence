-- ============================================================================
-- QUERY 4: Airline Performance Scorecard with Peer Benchmarking
-- Skills: Window functions (PERCENT_RANK), CTEs, multi-metric ranking
-- Business Q: Which airlines perform best/worst relative to peers on the same routes?
-- ============================================================================

WITH airline_route_perf AS (
    SELECT
        iata_code_reporting_airline AS airline,
        origin,
        dest,
        count(*) AS flights,
        round(avg(depdelayminutes), 1) AS avg_delay,
        round(sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) * 100.0 / count(*), 1) AS pct_delayed,
        round(sum(cancelled) * 100.0 / count(*), 2) AS pct_cancelled
    FROM raw_bts_flights
    GROUP BY iata_code_reporting_airline, origin, dest
    HAVING count(*) >= 50
),
route_benchmark AS (
    SELECT
        *,
        round(AVG(avg_delay) OVER (PARTITION BY origin, dest), 1) AS route_avg_delay,
        round(AVG(pct_delayed) OVER (PARTITION BY origin, dest), 1) AS route_avg_pct_delayed,
        count(*) OVER (PARTITION BY origin, dest) AS airlines_on_route
    FROM airline_route_perf
),
airline_scorecard AS (
    SELECT
        airline,
        count(*) AS routes_served,
        round(avg(avg_delay), 1) AS overall_avg_delay,
        round(avg(pct_delayed), 1) AS overall_pct_delayed,
        round(avg(pct_cancelled), 2) AS overall_pct_cancelled,
        -- How often does this airline beat the route average?
        round(sum(CASE WHEN avg_delay < route_avg_delay THEN 1 ELSE 0 END) * 100.0 
            / count(*), 1) AS pct_routes_below_avg_delay,
        round(avg(avg_delay - route_avg_delay), 1) AS avg_delay_vs_benchmark
    FROM route_benchmark
    WHERE airlines_on_route >= 2
    GROUP BY airline
    HAVING count(*) >= 10
)
SELECT
    airline,
    routes_served,
    overall_avg_delay,
    overall_pct_delayed,
    overall_pct_cancelled,
    pct_routes_below_avg_delay,
    avg_delay_vs_benchmark,
    CASE 
        WHEN avg_delay_vs_benchmark < -3 THEN 'OUTPERFORMER'
        WHEN avg_delay_vs_benchmark > 3 THEN 'UNDERPERFORMER'
        ELSE 'AVERAGE'
    END AS performance_tier,
    PERCENT_RANK() OVER (ORDER BY avg_delay_vs_benchmark ASC) AS performance_percentile
FROM airline_scorecard
ORDER BY avg_delay_vs_benchmark ASC;