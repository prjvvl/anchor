-- Replace the anonymous, email-only `subscribers` table with a
-- `newsletter_opt_in` flag on a per-account `profiles` table (1:1 with
-- auth.users), now that email-OTP sign-in exists. Newsletter opt-in is no
-- longer possible without an account.

drop table subscribers;

create table profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  newsletter_opt_in boolean not null default false,
  unsubscribe_token uuid unique not null default gen_random_uuid(),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The row-scoped policy above still leaves every column writable by its
-- owner — without this, a signed-in user could overwrite their own `email`
-- to someone else's address, and the newsletter job would spam that person
-- next send. Restrict client writes to the one column profile.html needs.
revoke update on profiles from authenticated;
grant update (newsletter_opt_in) on profiles to authenticated;

-- Auto-create a profile row whenever a new auth.users row appears (first
-- OTP request for a new email). security definer + explicit search_path
-- lets this bypass RLS safely; standard Supabase pattern.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill accounts created before this migration — the trigger only fires
-- on future inserts, and email-OTP already shipped (there's at least one
-- real signed-up user already).
insert into profiles (user_id, email)
select id, email from auth.users
on conflict (user_id) do nothing;
