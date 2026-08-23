-- Portal features inspired by the Berur Association portal:
-- referral tracking on registration and a newsletter mailing list.

-- ---------------------------------------------------------------
-- Members: who referred this member (free text, from the form)
-- ---------------------------------------------------------------
alter table members add column if not exists referred_by text;

-- ---------------------------------------------------------------
-- Newsletter subscribers
-- ---------------------------------------------------------------
create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- RLS on with no policies: only the server (service role) may read or write.
alter table newsletter_subscribers enable row level security;
