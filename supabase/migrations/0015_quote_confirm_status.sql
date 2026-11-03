-- Delivery status of the confirmation text sent to the customer after a quote request.
alter table quote_requests add column confirm_status text check (char_length(confirm_status) <= 500);
