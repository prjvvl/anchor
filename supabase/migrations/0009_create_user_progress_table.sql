-- Per-user watch history. Row existence = viewed; no status column,
-- unmarking is a delete. Deliberately no foreign key to `videos` — watch
-- history shouldn't be tied to a specific playlist-row's lifecycle, and the
-- same YouTube video can exist as more than one `videos` row (once per
-- playlist it appears in, see 0007). Consequence, accepted: a video watched
-- via one playlist shows as viewed everywhere else it also appears.
create table user_progress (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  youtube_video_id text not null,
  viewed_at timestamptz default now(),
  primary key (user_id, youtube_video_id)
);

alter table user_progress enable row level security;

create policy "Users can read own progress"
  on user_progress for select
  using (auth.uid() = user_id);

create policy "Users can mark own progress"
  on user_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can unmark own progress"
  on user_progress for delete
  using (auth.uid() = user_id);
