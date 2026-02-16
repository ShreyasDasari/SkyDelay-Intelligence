{{
  config(materialized='view')
}}

with flights as (
    select * from {{ ref('stg_bts_flights') }}
),

airport_daily as (
    select
        origin_airport as airport,
        flight_date,
        day_name,
        is_weekend,
        month,

        count(*) as total_departures,
        round(avg(dep_delay_abs_minutes), 1) as avg_dep_delay_min,
        round(avg(arr_delay_abs_minutes), 1) as avg_arr_delay_min,
        sum(is_dep_delayed_15) as flights_delayed_15,
        round(sum(is_dep_delayed_15) * 100.0 / count(*), 1) as pct_delayed_15,
        sum(is_cancelled) as flights_cancelled,
        round(sum(is_cancelled) * 100.0 / count(*), 2) as pct_cancelled,

        round(avg(case when carrier_delay_minutes > 0
            then carrier_delay_minutes end), 1) as avg_carrier_delay,
        round(avg(case when weather_delay_minutes > 0
            then weather_delay_minutes end), 1) as avg_weather_delay,
        round(avg(case when nas_delay_minutes > 0
            then nas_delay_minutes end), 1) as avg_nas_delay,
        round(avg(case when late_aircraft_delay_minutes > 0
            then late_aircraft_delay_minutes end), 1) as avg_late_aircraft_delay,

        sum(case when primary_delay_cause = 'Weather' then 1 else 0 end) as weather_delays,
        sum(case when primary_delay_cause = 'Carrier' then 1 else 0 end) as carrier_delays,
        sum(case when primary_delay_cause = 'NAS/ATC' then 1 else 0 end) as nas_delays,
        sum(case when primary_delay_cause = 'Late Aircraft' then 1 else 0 end) as late_aircraft_delays,

        count(distinct dest_airport) as routes_served,
        count(distinct airline_iata) as airlines_operating

    from flights
    where is_cancelled = 0
    group by origin_airport, flight_date, day_name, is_weekend, month
)

select * from airport_daily