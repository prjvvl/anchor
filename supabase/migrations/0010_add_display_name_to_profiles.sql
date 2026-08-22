-- Optional display name on profiles, deferred from the Phase 2 profile
-- page scope. The blanket `revoke update on profiles from authenticated`
-- from 0008 already blocks every column by default, so this only needs an
-- additive grant, same pattern as newsletter_opt_in.

-- Length check matches the client's maxlength="60" — that's only an HTML
-- attribute, so a direct PostgREST write could otherwise set an arbitrarily
-- long value.
alter table profiles add column display_name text check (char_length(display_name) <= 60);

grant update (display_name) on profiles to authenticated;
