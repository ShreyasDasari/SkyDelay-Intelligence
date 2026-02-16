{{
  config(materialized='view')
}}

with source as (
    select * from raw_weather_observations
),

cleaned as (
    select
        station_id,
        iata_code as airport_code,
        observation_time,
        raw_metar,

        -- Wind
        wind_direction_deg,
        wind_speed_kt as wind_speed_knots,
        wind_gust_kt as wind_gust_knots,

        -- Visibility
        visibility_miles,

        -- Temperature
        temperature_c,
        dewpoint_c,
        round(temperature_c * 9.0 / 5.0 + 32, 1) as temperature_f,

        -- Pressure
        altimeter_inhg,

        -- Clouds
        cloud_cover,
        ceiling_ft as ceiling_feet,

        -- Weather phenomena
        weather_string,

        -- Flight category (VFR, MVFR, IFR, LIFR)
        flight_category,

        -- Derived: is this delay-risk weather?
        case
            when flight_category in ('IFR', 'LIFR') then true
            when visibility_miles is not null and visibility_miles < 3 then true
            when ceiling_ft is not null and ceiling_ft < 1000 then true
            when wind_gust_kt is not null and wind_gust_kt > 35 then true
            when weather_string like '%TS%' then true
            when weather_string like '%FZ%' then true
            when weather_string like '%SN%' then true
            else false
        end as is_delay_risk_weather,

        -- Derived: weather severity tier
        case
            when flight_category = 'LIFR' then 'Severe'
            when flight_category = 'IFR' then 'Moderate'
            when flight_category = 'MVFR' then 'Marginal'
            when wind_gust_kt is not null and wind_gust_kt > 35 then 'Moderate'
            when weather_string like '%TS%' then 'Severe'
            else 'Clear'
        end as weather_severity,

        polled_at

    from source
    where station_id is not null
)

select * from cleaned