# metering — usage counting (Stage 12 part B)

Counts billable calls per client (search, offers, price check, booking) after a successful answer: buffered in the API process and flushed every 2 s / 200 events into `mtr_usage_events` + daily / monthly counters; nightly recount from the events. Read by the usage screens now and by billing in Stage 13. Rules: `domain/usage.js`.
