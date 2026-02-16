{{
  config(materialized='view')
}}

with source as (
    select * from raw_opensky_positions
),

cleaned as (
    select
        icao24 as aircraft_id,
        callsign,
        origin_country,
        longitude,
        latitude,
        round(baro_altitude, 0) as barometric_altitude_m,
        round(geo_altitude, 0) as geometric_altitude_m,
        on_ground as is_on_ground,
        round(velocity, 1) as ground_speed_ms,
        round(velocity * 1.944, 1) as ground_speed_knots,
        round(true_track, 1) as heading_degrees,
        round(vertical_rate, 1) as vertical_rate_ms,
        snapshot_time,
        polled_at,

        -- Derived: altitude in feet (aviation standard)
        round(baro_altitude * 3.281, 0) as altitude_ft,

        -- Derived: flight phase
        case
            when on_ground then 'Ground'
            when vertical_rate > 2 then 'Climbing'
            when vertical_rate < -2 then 'Descending'
            else 'Cruise'
        end as flight_phase

    from source
    where latitude is not null
      and longitude is not null
      and icao24 is not null
)

select * from cleaned