-- status distinguishes a brief/partial watch (in_progress, >=5s per
-- apps/web/player.js) from a completed one (90%-threshold or manual mark -
-- the table's old sole bar). position_seconds lets playback resume.
--
-- viewed_at renames to created_at (first-seen, immutable); updated_at is
-- new and bumped on every write, since the old ignoreDuplicates upsert
-- froze viewed_at at first-watch and missed re-watches.
alter table user_progress rename column viewed_at to created_at;

alter table user_progress
  add column status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  add column position_seconds integer not null default 0,
  add column updated_at timestamptz not null default now();

-- Pre-existing rows were only ever written at the old completed-only bar.
-- updated_at backfills to created_at, not "now", so this migration doesn't
-- read as "watched today" for every past viewer's streak.
update user_progress set status = 'completed', updated_at = created_at;

create policy "Users can update own progress"
  on user_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
