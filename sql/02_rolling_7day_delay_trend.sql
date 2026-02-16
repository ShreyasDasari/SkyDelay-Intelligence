-- ============================================================================
-- QUERY 2: Rolling 7-Day Delay Trend with Week-over-Week Change
-- Skills: Window functions (LAG, AVG OVER), date manipulation, trend analysis
-- Business Q: Are delays trending up or down at major hubs this month?
-- ============================================================================

WITH daily_delays AS (
    SELECT
        origin AS airport,
        flightdate,
        count(*) AS flights,
        round(avg(depdelayminutes), 1) AS avg_delay,
        sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) AS delayed_flights
    FROM raw_bts_flights
    WHERE origin IN ('ORD', 'ATL', 'JFK', 'DFW', 'LAX', 'DEN', 'EWR')
      AND flightdate >= '2025-10-01'
      AND flightdate <= '2025-10-31'
    GROUP BY origin, flightdate
),
rolling_metrics AS (
    SELECT
        airport,
        flightdate,
        flights,
        avg_delay,
        delayed_flights,
        round(AVG(avg_delay) OVER (
            PARTITION BY airport 
            ORDER BY flightdate 
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ), 1) AS rolling_7day_avg_delay,
        round(AVG(delayed_flights * 100.0 / flights) OVER (
            PARTITION BY airport 
            ORDER BY flightdate 
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ), 1) AS rolling_7day_pct_delayed
    FROM daily_delays
)
SELECT
    airport,
    flightdate,
    avg_delay AS daily_avg_delay,
    rolling_7day_avg_delay,
    rolling_7day_pct_delayed,
    round(rolling_7day_avg_delay - LAG(rolling_7day_avg_delay, 7) OVER (
        PARTITION BY airport ORDER BY flightdate
    ), 1) AS wow_delay_change,
    CASE 
        WHEN rolling_7day_avg_delay - LAG(rolling_7day_avg_delay, 7) OVER (
            PARTITION BY airport ORDER BY flightdate
        ) > 5 THEN 'WORSENING'
        WHEN rolling_7day_avg_delay - LAG(rolling_7day_avg_delay, 7) OVER (
            PARTITION BY airport ORDER BY flightdate
        ) < -5 THEN 'IMPROVING'
        ELSE 'STABLE'
    END AS trend_status
FROM rolling_metrics
WHERE flightdate >= '2025-10-08'
ORDER BY airport, flightdate;