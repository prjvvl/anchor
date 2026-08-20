create table newsletter_log (
  sent_date date primary key,
  sent_at timestamptz default now(),
  recipient_count integer not null
);

-- No public policy at all — only the newsletter job (secret key) ever
-- touches this table, as a send-once-per-day guard against a retriggered run.
alter table newsletter_log enable row level security;
