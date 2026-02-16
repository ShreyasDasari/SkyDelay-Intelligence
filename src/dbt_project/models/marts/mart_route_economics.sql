{{
  config(materialized='table')
}}

with routes as (
    select * from {{ ref('int_route_performance') }}
),

economics as (
    select
        route_id,
        origin_airport,
        dest_airport,
        origin_city,
        dest_city,
        airline_iata,
        total_flights,
        delayed_flights,
        pct_delayed,
        avg_dep_delay,
        cancelled_flights,
        pct_cancelled,
        avg_distance_miles,

        round(delayed_flights * 160 * 0.87
            * avg_dep_delay * 0.74, 0) as est_passenger_cost,
        round(delayed_flights * avg_dep_delay * 68.48, 0) as est_airline_ops_cost,
        round(
            (delayed_flights * 160 * 0.87 * avg_dep_delay * 0.74)
            + (delayed_flights * avg_dep_delay * 68.48), 0
        ) as est_total_economic_impact,

        round(
            ((delayed_flights * 160 * 0.87 * avg_dep_delay * 0.74)
            + (delayed_flights * avg_dep_delay * 68.48))
            / nullif(total_flights, 0), 0
        ) as est_cost_per_flight,

        case
            when weather_count >= carrier_count
                and weather_count >= nas_count
                and weather_count >= late_aircraft_count then 'Weather'
            when late_aircraft_count >= carrier_count
                and late_aircraft_count >= nas_count then 'Late Aircraft'
            when nas_count >= carrier_count then 'NAS/ATC'
            else 'Carrier'
        end as dominant_delay_cause

    from routes
)

select * from economics
order by est_total_economic_impact desc