{{
  config(materialized='view')
}}

with source as (
    select * from raw_bts_flights
),

cleaned as (
    select
        flightdate as flight_date,
        reporting_airline as airline_code,
        iata_code_reporting_airline as airline_iata,
        cast(flight_number_reporting_airline as integer) as flight_number,

        origin as origin_airport,
        origincityname as origin_city,
        originstate as origin_state,
        dest as dest_airport,
        destcityname as dest_city,
        deststate as dest_state,
        origin || '-' || dest as route_id,

        cast(year as integer) as year,
        cast(quarter as integer) as quarter,
        cast(month as integer) as month,
        cast(dayofmonth as integer) as day_of_month,
        cast(dayofweek as integer) as day_of_week,
        case dayofweek
            when 1 then 'Monday'
            when 2 then 'Tuesday'
            when 3 then 'Wednesday'
            when 4 then 'Thursday'
            when 5 then 'Friday'
            when 6 then 'Saturday'
            when 7 then 'Sunday'
        end as day_name,
        case when dayofweek in (6, 7) then true else false end as is_weekend,

        cast(crsdeptime as integer) as scheduled_dep_hhmm,
        cast(floor(crsdeptime / 100) as integer) * 60
            + cast(crsdeptime % 100 as integer) as scheduled_dep_minutes,
        cast(crsarrtime as integer) as scheduled_arr_hhmm,
        cast(floor(crsarrtime / 100) as integer) * 60
            + cast(crsarrtime % 100 as integer) as scheduled_arr_minutes,

        cast(deptime as integer) as actual_dep_hhmm,
        cast(arrtime as integer) as actual_arr_hhmm,

        coalesce(depdelay, 0) as dep_delay_minutes,
        coalesce(depdelayminutes, 0) as dep_delay_abs_minutes,
        coalesce(cast(depdel15 as integer), 0) as is_dep_delayed_15,
        coalesce(arrdelay, 0) as arr_delay_minutes,
        coalesce(arrdelayminutes, 0) as arr_delay_abs_minutes,
        coalesce(cast(arrdel15 as integer), 0) as is_arr_delayed_15,

        coalesce(carrierdelay, 0) as carrier_delay_minutes,
        coalesce(weatherdelay, 0) as weather_delay_minutes,
        coalesce(nasdelay, 0) as nas_delay_minutes,
        coalesce(securitydelay, 0) as security_delay_minutes,
        coalesce(lateaircraftdelay, 0) as late_aircraft_delay_minutes,

        cast(cancelled as integer) as is_cancelled,
        cancellationcode as cancellation_reason,
        cast(diverted as integer) as is_diverted,

        coalesce(cast(crselapsedtime as double), 0) as scheduled_elapsed_minutes,
        coalesce(cast(actualelapsedtime as double), 0) as actual_elapsed_minutes,
        coalesce(cast(airtime as double), 0) as air_time_minutes,
        coalesce(cast(distance as double), 0) as distance_miles,

        case
            when coalesce(cancelled, 0) = 1 then 'Cancelled'
            when coalesce(depdelayminutes, 0) <= 15 then 'On Time'
            when coalesce(weatherdelay, 0) > 0
                and coalesce(weatherdelay, 0) >= coalesce(carrierdelay, 0)
                and coalesce(weatherdelay, 0) >= coalesce(nasdelay, 0)
                and coalesce(weatherdelay, 0) >= coalesce(lateaircraftdelay, 0)
                then 'Weather'
            when coalesce(nasdelay, 0) > 0
                and coalesce(nasdelay, 0) >= coalesce(carrierdelay, 0)
                and coalesce(nasdelay, 0) >= coalesce(lateaircraftdelay, 0)
                then 'NAS/ATC'
            when coalesce(lateaircraftdelay, 0) > 0
                and coalesce(lateaircraftdelay, 0) >= coalesce(carrierdelay, 0)
                then 'Late Aircraft'
            when coalesce(carrierdelay, 0) > 0 then 'Carrier'
            when coalesce(securitydelay, 0) > 0 then 'Security'
            else 'Other'
        end as primary_delay_cause

    from source
    where crsdeptime is not null
      and crsarrtime is not null
)

select * from cleaned
