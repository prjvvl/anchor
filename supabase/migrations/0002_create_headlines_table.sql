create table headlines (
  id uuid primary key default gen_random_uuid(),
  guid text unique not null,
  title text not null,
  link text not null,
  source text,
  published_at timestamptz,
  created_at timestamptz default now()
);

-- No pre-check query needed before insert: the automation job upserts on
-- this constraint and ignores conflicts, so an overlapping fetch window
-- (or a re-run) is a no-op instead of a duplicate row.
alter table headlines enable row level security;

-- Public (website, using the publishable key) reads all headlines — there's
-- no active/inactive concept here like `videos`, it's just a feed mirror.
create policy "Public can read headlines"
  on headlines for select
  using (true);
