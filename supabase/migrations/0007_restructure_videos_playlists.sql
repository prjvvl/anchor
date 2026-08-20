-- Restructure `videos` into a flat, denormalized playlist-membership model:
-- a video can belong to more than one playlist, each membership as its own
-- row (rather than a normalized playlists/playlist_items join). `active`
-- stays, but now scoped per (video, playlist) row instead of per video.

alter table videos add column tags text[] default '{}'::text[];
alter table videos add column playlist text;
alter table videos add column idx integer;
alter table videos add column published_at timestamptz;
alter table videos add column views integer;

-- Backfill: every existing row came from the top-news job, which is now
-- this table's only 'playlist' value. published_at/views move out of
-- metadata into their own columns; metadata keeps only ai_reasoning.
update videos
set
  playlist = 'top-news',
  published_at = (metadata->>'published_at')::timestamptz,
  views = (metadata->>'view_count')::integer,
  metadata = metadata - 'published_at' - 'view_count'
where playlist is null;

alter table videos alter column playlist set not null;

-- youtube_video_id was globally unique; uniqueness is now scoped per
-- playlist so the same video can appear in more than one.
alter table videos drop constraint videos_youtube_video_id_key;
alter table videos add constraint videos_video_playlist_unique unique (youtube_video_id, playlist);

-- Superseded by `playlist` + `idx`, never populated by any code path.
alter table videos drop column playlist_id;
