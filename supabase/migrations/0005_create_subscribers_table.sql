create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  unsubscribe_token uuid unique not null default gen_random_uuid(),
  created_at timestamptz default now()
);

-- Public (website, using the publishable key) can insert their own row to
-- subscribe, but can never read, update, or delete — prevents scraping the
-- list or tampering with someone else's subscription. All other access
-- (the newsletter job, the unsubscribe function) goes through the secret
-- key, which bypasses RLS entirely.
alter table subscribers enable row level security;

create policy "Public can subscribe"
  on subscribers for insert
  with check (true);
