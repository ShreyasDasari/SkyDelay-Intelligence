-- Test: dep_delay_abs_minutes should never be negative
-- (it represents absolute delay, 0 = on time)
select *
from {{ ref('stg_bts_flights') }}
where dep_delay_abs_minutes < 0
limit 10
