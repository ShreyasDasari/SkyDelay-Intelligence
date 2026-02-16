-- ============================================================================
-- QUERY 5: Day-of-Week × Month Delay Heatmap Data
-- Skills: Cross-tab / pivot, conditional aggregation, business calendar logic
-- Business Q: When are the worst travel days? (for business analyst deliverable)
-- ============================================================================

SELECT
    CASE dayofweek
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
        WHEN 7 THEN 'Sunday'
    END AS day_name,
    dayofweek,
    round(avg(CASE WHEN month = 9 THEN depdelayminutes END), 1) AS sep_avg_delay,
    round(avg(CASE WHEN month = 10 THEN depdelayminutes END), 1) AS oct_avg_delay,
    round(avg(CASE WHEN month = 11 THEN depdelayminutes END), 1) AS nov_avg_delay,
    round(sum(CASE WHEN month = 9 AND depdel15 = 1 THEN 1 ELSE 0 END) * 100.0 
        / NULLIF(sum(CASE WHEN month = 9 THEN 1 ELSE 0 END), 0), 1) AS sep_pct_delayed,
    round(sum(CASE WHEN month = 10 AND depdel15 = 1 THEN 1 ELSE 0 END) * 100.0 
        / NULLIF(sum(CASE WHEN month = 10 THEN 1 ELSE 0 END), 0), 1) AS oct_pct_delayed,
    round(sum(CASE WHEN month = 11 AND depdel15 = 1 THEN 1 ELSE 0 END) * 100.0 
        / NULLIF(sum(CASE WHEN month = 11 THEN 1 ELSE 0 END), 0), 1) AS nov_pct_delayed,
    count(*) AS total_flights
FROM raw_bts_flights
GROUP BY dayofweek, day_name
ORDER BY dayofweek;