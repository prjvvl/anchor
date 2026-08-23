-- Phase 4, part 1: region/language tagging + bookmarks. Resume/watch-position
-- tracking was scoped in the same planning session but is deferred — not
-- included here.

-- Region/language are set once per source in config (channels.ts/feeds.ts/
-- playlists.js) and copied onto every row a job produces, same as `category`
-- already works — no per-item classification needed.
alter table headlines add column region text not null default 'global';
alter table headlines add column language text not null default 'en';

alter table videos add column region text not null default 'global';
alter table videos add column language text not null default 'en';

-- Sitewide filter preferences, synced from localStorage on sign-in. The
-- blanket `revoke update on profiles from authenticated` from 0008 already
-- blocks every column by default, so this only needs an additive grant,
-- same pattern as newsletter_opt_in/display_name.
alter table profiles add column preferred_regions text[] not null default '{global}'::text[];
alter table profiles add column preferred_languages text[] not null default '{en}'::text[];

grant update (preferred_regions, preferred_languages) on profiles to authenticated;

-- Mirrors user_progress (0009): row existence is the only state, no status
-- column. Deliberately no FK to `videos` — same video can exist as more
-- than one playlist row (see 0007), and a bookmark shouldn't be tied to any
-- one of them.
create table bookmarks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  youtube_video_id text not null,
  created_at timestamptz default now(),
  primary key (user_id, youtube_video_id)
);

alter table bookmarks enable row level security;

create policy "Users can read own bookmarks"
  on bookmarks for select
  using (auth.uid() = user_id);

create policy "Users can add own bookmarks"
  on bookmarks for insert
  with check (auth.uid() = user_id);

create policy "Users can remove own bookmarks"
  on bookmarks for delete
  using (auth.uid() = user_id);
