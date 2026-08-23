-- Region can genuinely be more than one value per source (e.g. WION is
-- "Indian news, global-affairs lens" — {in, global}), confirmed while
-- scoping Stage 1 of region/language filtering. 0011 shipped `region` as
-- scalar text before that came up; this converts it to an array before any
-- query code depends on the scalar shape. No meaningful data loss — no job
-- has written a real (non-default) region value yet.
alter table headlines alter column region drop default;
alter table headlines alter column region type text[] using array[region];
alter table headlines alter column region set default '{global}'::text[];
create index headlines_region_gin on headlines using gin (region);

alter table videos alter column region drop default;
alter table videos alter column region type text[] using array[region];
alter table videos alter column region set default '{global}'::text[];
create index videos_region_gin on videos using gin (region);
