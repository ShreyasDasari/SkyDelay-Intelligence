-- ============================================================================
-- QUERY 3: Delay Cause Decomposition by Hour of Day
-- Skills: CASE pivoting, time bucketing, proportional analysis
-- Business Q: What causes delays at different times of day? (scheduling vs weather)
-- ============================================================================

WITH hourly_causes AS (
    SELECT
        CAST(FLOOR(crsdeptime / 100) AS INTEGER) AS dep_hour,
        count(*) AS total_flights,
        sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END) AS delayed_flights,
        -- Decompose delay causes
        round(avg(CASE WHEN carrierdelay > 0 THEN carrierdelay END), 1) AS avg_carrier_delay,
        round(avg(CASE WHEN weatherdelay > 0 THEN weatherdelay END), 1) AS avg_weather_delay,
        round(avg(CASE WHEN nasdelay > 0 THEN nasdelay END), 1) AS avg_nas_delay,
        round(avg(CASE WHEN lateaircraftdelay > 0 THEN lateaircraftdelay END), 1) AS avg_late_aircraft,
        -- Proportion of delays by cause
        round(sum(CASE WHEN carrierdelay > 0 THEN 1 ELSE 0 END) * 100.0 
            / NULLIF(sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END), 0), 1) AS pct_carrier_caused,
        round(sum(CASE WHEN weatherdelay > 0 THEN 1 ELSE 0 END) * 100.0 
            / NULLIF(sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END), 0), 1) AS pct_weather_caused,
        round(sum(CASE WHEN nasdelay > 0 THEN 1 ELSE 0 END) * 100.0 
            / NULLIF(sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END), 0), 1) AS pct_nas_caused,
        round(sum(CASE WHEN lateaircraftdelay > 0 THEN 1 ELSE 0 END) * 100.0 
            / NULLIF(sum(CASE WHEN depdel15 = 1 THEN 1 ELSE 0 END), 0), 1) AS pct_late_aircraft_caused
    FROM raw_bts_flights
    WHERE crsdeptime IS NOT NULL
      AND crsdeptime >= 500  -- exclude red-eye edge cases
    GROUP BY dep_hour
    HAVING dep_hour BETWEEN 5 AND 23
)
SELECT
    dep_hour,
    CASE 
        WHEN dep_hour BETWEEN 5 AND 8 THEN 'Early Morning'
        WHEN dep_hour BETWEEN 9 AND 11 THEN 'Mid Morning'
        WHEN dep_hour BETWEEN 12 AND 14 THEN 'Afternoon'
        WHEN dep_hour BETWEEN 15 AND 17 THEN 'Late Afternoon'
        WHEN dep_hour BETWEEN 18 AND 20 THEN 'Evening'
        ELSE 'Night'
    END AS time_block,
    total_flights,
    delayed_flights,
    round(delayed_flights * 100.0 / total_flights, 1) AS pct_delayed,
    avg_carrier_delay,
    avg_weather_delay,
    avg_nas_delay,
    avg_late_aircraft,
    pct_carrier_caused,
    pct_weather_caused,
    pct_nas_caused,
    pct_late_aircraft_caused
FROM hourly_causes
ORDER BY dep_hour;