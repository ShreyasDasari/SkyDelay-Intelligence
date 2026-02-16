{{
  config(materialized='view')
}}

with flights as (
    select * from {{ ref('stg_bts_flights') }}
),

route_metrics as (
    select
        route_id,
        origin_airport,
        dest_airport,
        origin_city,
        dest_city,
        airline_iata,

        count(*) as total_flights,
        round(avg(dep_delay_abs_minutes), 1) as avg_dep_delay,
        round(avg(arr_delay_abs_minutes), 1) as avg_arr_delay,
        sum(is_dep_delayed_15) as delayed_flights,
        round(sum(is_dep_delayed_15) * 100.0 / count(*), 1) as pct_delayed,
        sum(is_cancelled) as cancelled_flights,
        round(sum(is_cancelled) * 100.0 / count(*), 2) as pct_cancelled,
        round(avg(distance_miles), 0) as avg_distance_miles,
        round(avg(air_time_minutes), 0) as avg_air_time_min,

        sum(case when primary_delay_cause = 'Weather' then 1 else 0 end) as weather_count,
        sum(case when primary_delay_cause = 'Carrier' then 1 else 0 end) as carrier_count,
        sum(case when primary_delay_cause = 'NAS/ATC' then 1 else 0 end) as nas_count,
        sum(case when primary_delay_cause = 'Late Aircraft' then 1 else 0 end) as late_aircraft_count

    from flights
    group by route_id, origin_airport, dest_airport,
             origin_city, dest_city, airline_iata
    having count(*) >= 30
)

select * from route_metrics