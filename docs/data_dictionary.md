# Data Dictionary

## Raw Tables

### raw_bts_flights (1,738,833 rows)
BTS On-Time Performance data from transtats.bts.gov. Each row is one domestic US flight.

| Column | Type | Description |
|---|---|---|
| flightdate | VARCHAR | Flight date (YYYY-MM-DD) |
| origin | VARCHAR | 3-letter IATA origin airport code |
| dest | VARCHAR | 3-letter IATA destination airport code |
| iata_code_reporting_airline | VARCHAR | 2-letter airline IATA code |
| depdelayminutes | DOUBLE | Departure delay in minutes (0 if on time) |
| arrdelayminutes | DOUBLE | Arrival delay in minutes |
| carrierdelay | DOUBLE | Minutes of delay attributed to carrier |
| weatherdelay | DOUBLE | Minutes of delay attributed to weather |
| nasdelay | DOUBLE | Minutes of delay attributed to NAS/ATC |
| lateaircraftdelay | DOUBLE | Minutes of delay from late arriving aircraft |
| cancelled | DOUBLE | 1 if cancelled, 0 otherwise |

### raw_opensky_positions (polled, ~1,800 per snapshot)
Live aircraft ADS-B positions from OpenSky Network REST API.

| Column | Type | Description |
|---|---|---|
| icao24 | VARCHAR | Unique aircraft transponder address (hex) |
| callsign | VARCHAR | Flight callsign |
| latitude | DOUBLE | WGS-84 latitude |
| longitude | DOUBLE | WGS-84 longitude |
| baro_altitude | DOUBLE | Barometric altitude (meters) |
| velocity | DOUBLE | Ground speed (m/s) |
| on_ground | BOOLEAN | True if aircraft is on ground |

### raw_weather_observations (polled, 30 airports)
NOAA METAR observations from aviationweather.gov.

| Column | Type | Description |
|---|---|---|
| station_id | VARCHAR | ICAO station code (e.g., KORD) |
| iata_code | VARCHAR | 3-letter IATA code |
| wind_speed_kt | DOUBLE | Wind speed in knots |
| visibility_miles | DOUBLE | Visibility in statute miles |
| temperature_c | DOUBLE | Temperature in Celsius |
| ceiling_ft | DOUBLE | Ceiling height in feet (lowest BKN/OVC) |
| flight_category | VARCHAR | VFR, MVFR, IFR, or LIFR |

### raw_faa_airport_status (polled, all active delays)
FAA NAS Status from nasstatus.faa.gov.

| Column | Type | Description |
|---|---|---|
| airport_code | VARCHAR | IATA airport code |
| delay_type | VARCHAR | Ground Stop, GDP, Arrival/Departure Delay |
| delay_reason | VARCHAR | Cause of delay program |
| has_delay | BOOLEAN | True if delay is active |

## Mart Tables

### mart_delay_economics (30,364 rows)
Airport-day level economic impact estimates.

| Column | Type | Description |
|---|---|---|
| airport | VARCHAR | IATA airport code |
| flight_date | VARCHAR | Date |
| est_total_economic_impact | DOUBLE | Estimated total cost ($) using NEXTOR methodology |
| rolling_7day_avg_delay | DOUBLE | 7-day rolling average departure delay |

### mart_cascade_vulnerability (161 rows)
Airport-level cascade vulnerability scores.

| Column | Type | Description |
|---|---|---|
| airport | VARCHAR | IATA airport code |
| vulnerability_rank | INTEGER | Rank (1 = most vulnerable) |
| cascade_vulnerability_score | DOUBLE | Composite score |
| total_economic_impact | DOUBLE | 3-month total estimated cost ($) |

### mart_route_economics (8,436 rows)
Route-airline level economic impact.

| Column | Type | Description |
|---|---|---|
| route_id | VARCHAR | Origin-Dest (e.g., ORD-EWR) |
| est_total_economic_impact | DOUBLE | Route total estimated cost ($) |
| dominant_delay_cause | VARCHAR | Primary delay cause on this route |
