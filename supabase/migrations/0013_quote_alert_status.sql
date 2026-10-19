-- Record whether the alert email for each quote request was delivered, with
-- the provider's error when it wasn't, so failures are visible without logs.
alter table quote_requests add column alert_status text check (char_length(alert_status) <= 500);
