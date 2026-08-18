create table videos (
  id uuid primary key default gen_random_uuid(),
  youtube_video_id text unique not null,
  channel_name text,
  title text not null,
  category text default 'other',
  playlist_id text,
  duration integer,
  active boolean default true,
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- Public (website, using the publishable key) can only ever read active videos.
-- All writes happen via the secret key (automation job), which bypasses RLS entirely.
alter table videos enable row level security;

create policy "Public can read active videos"
  on videos for select
  using (active = true);
