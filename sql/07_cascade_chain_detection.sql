-- ============================================================================
-- QUERY 7: Cascade Chain Detection — Finding Multi-Hop Delay Propagation
-- Skills: Self-join, recursive thinking, complex join conditions
-- Business Q: When a flight arrives late, how far does the delay ripple?
-- ============================================================================

WITH inbound_delays AS (
    -- Level 0: Flights arriving delayed at ORD
    SELECT
        iata_code_reporting_airline AS airline,
        flight_number_reporting_airline AS flight_num,
        origin AS arrived_from,
        dest AS hub,
        CAST(FLOOR(crsarrtime / 100) AS INTEGER) * 60 + CAST(crsarrtime % 100 AS INTEGER) 
            AS arr_time_min,
        arrdelayminutes AS delay_min,
        0 AS cascade_level
    FROM raw_bts_flights
    WHERE dest = 'ORD'
      AND flightdate = '2025-10-15'
      AND arrdelayminutes >= 30
      AND arrdelayminutes IS NOT NULL
),
level1_cascade AS (
    -- Level 1: Outbound flights from ORD affected by delayed inbounds
    SELECT
        dep.iata_code_reporting_airline AS airline,
        dep.flight_number_reporting_airline AS flight_num,
        dep.origin AS departed_from,
        dep.dest AS going_to,
        CAST(FLOOR(dep.crsdeptime / 100) AS INTEGER) * 60 + CAST(dep.crsdeptime % 100 AS INTEGER)
            AS dep_time_min,
        dep.depdelayminutes AS delay_min,
        1 AS cascade_level,
        arr.arrived_from AS original_delay_source
    FROM raw_bts_flights dep
    INNER JOIN inbound_delays arr
        ON dep.iata_code_reporting_airline = arr.airline
    WHERE dep.origin = 'ORD'
      AND dep.flightdate = '2025-10-15'
      AND (CAST(FLOOR(dep.crsdeptime / 100) AS INTEGER) * 60 + CAST(dep.crsdeptime % 100 AS INTEGER))
          > arr.arr_time_min
      AND (CAST(FLOOR(dep.crsdeptime / 100) AS INTEGER) * 60 + CAST(dep.crsdeptime % 100 AS INTEGER))
          - arr.arr_time_min BETWEEN 20 AND 180
      AND dep.depdelayminutes > 0
      AND dep.depdelayminutes IS NOT NULL
      AND dep.cancelled = 0
)
SELECT
    cascade_level,
    count(DISTINCT flight_num) AS flights_affected,
    count(DISTINCT going_to) AS destinations_affected,
    round(avg(delay_min), 1) AS avg_delay_propagated,
    round(min(delay_min), 1) AS min_delay,
    round(max(delay_min), 1) AS max_delay,
    -- Estimated passengers impacted at this cascade level
    count(DISTINCT flight_num) * 160 * 0.87 AS est_passengers
FROM level1_cascade
GROUP BY cascade_level

UNION ALL

SELECT
    0 AS cascade_level,
    count(DISTINCT flight_num) AS flights_affected,
    1 AS destinations_affected,
    round(avg(delay_min), 1) AS avg_delay_propagated,
    round(min(delay_min), 1) AS min_delay,
    round(max(delay_min), 1) AS max_delay,
    count(DISTINCT flight_num) * 160 * 0.87 AS est_passengers
FROM inbound_delays

ORDER BY cascade_level;