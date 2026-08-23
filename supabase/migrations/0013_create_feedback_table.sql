-- Signed-in-only feedback/suggestions form on the home page. A daily
-- automation job (feedback-digest) emails any un-notified rows to the admin
-- as a single batch, or sends nothing on a day with none — see
-- apps/automation/src/jobs/feedback-digest.
--
-- Deliberately insert-only: no select policy. The UI never reads feedback
-- back (a toast confirms submission client-side, nothing rendered depends
-- on the row afterwards), and the digest job reads via the service-role
-- key, which bypasses RLS entirely — a select policy here would only grant
-- access nothing in the app actually uses. `email` is denormalized from
-- session.user.email at insert time purely so the digest job can read it
-- directly without a service-role join against auth.users; `user_id`
-- remains the real source of truth. `notified_at` is how the digest job
-- tracks what it's already emailed.
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null,
  message text not null,
  created_at timestamptz default now(),
  notified_at timestamptz
);

alter table feedback enable row level security;

create policy "Users can add own feedback"
  on feedback for insert
  with check (auth.uid() = user_id);
