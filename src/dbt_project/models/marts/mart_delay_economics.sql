{{
  config(materialized='table')
}}

with airport_metrics as (
    select * from {{ ref('int_airport_daily_metrics') }}
),

economics as (
    select
        airport,
        flight_date,
        day_name,
        is_weekend,
        month,
        total_departures,
        avg_dep_delay_min,
        pct_delayed_15,
        flights_delayed_15,
        flights_cancelled,
        pct_cancelled,

        round(flights_delayed_15 * 160 * 0.87 * avg_dep_delay_min * 0.74, 0)
            as est_passenger_delay_cost,
        round(flights_delayed_15 * avg_dep_delay_min * 68.48, 0)
            as est_airline_ops_cost,
        round(
            (flights_delayed_15 * 160 * 0.87 * avg_dep_delay_min * 0.74)
            + (flights_delayed_15 * avg_dep_delay_min * 68.48), 0
        ) as est_total_economic_impact,

        avg_weather_delay,
        avg_carrier_delay,
        avg_nas_delay,
        avg_late_aircraft_delay,
        weather_delays,
        carrier_delays,
        nas_delays,
        late_aircraft_delays,
        routes_served,
        airlines_operating,

        round(avg(avg_dep_delay_min) over (
            partition by airport order by flight_date
            rows between 6 preceding and current row
        ), 1) as rolling_7day_avg_delay,

        round(avg(pct_delayed_15) over (
            partition by airport order by flight_date
            rows between 6 preceding and current row
        ), 1) as rolling_7day_pct_delayed

    from airport_metrics
)

select * from economics