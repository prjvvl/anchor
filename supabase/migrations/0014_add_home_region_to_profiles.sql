-- Home region: a single-select "which region gets its own homepage shelf"
-- preference, separate from preferred_regions (which controls what's
-- INCLUDED at all, multi-select). Nullable, no default: "no home region
-- chosen" is a valid, common state (homepage falls back to Global + Rest of
-- the World). Same additive-grant pattern as 0011, since the blanket
-- `revoke update on profiles from authenticated` from 0008 blocks every
-- column by default.
alter table profiles add column preferred_home_region text;

grant update (preferred_home_region) on profiles to authenticated;
