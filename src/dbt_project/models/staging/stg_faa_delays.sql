{{
  config(materialized='view')
}}

with source as (
    select * from raw_faa_airport_status
),

cleaned as (
    select
        airport_code,
        delay_type,
        delay_reason,
        avg_delay,
        max_delay,
        start_time,
        end_time,
        has_delay,
        polled_at,

        -- Derived: delay category
        case
            when delay_type = 'Ground Stop' then 'Ground Stop'
            when delay_type = 'Ground Delay Program' then 'GDP'
            when delay_type like '%Arrival%' then 'Arrival Delay'
            when delay_type like '%Departure%' then 'Departure Delay'
            when delay_type = 'No Active Delays' then 'Normal Operations'
            else 'Other'
        end as delay_category,

        -- Derived: is this a severe program?
        case
            when delay_type = 'Ground Stop' then true
            when delay_type = 'Ground Delay Program' then true
            else false
        end as is_severe_program

    from source
    where airport_code is not null
)

select * from cleaned