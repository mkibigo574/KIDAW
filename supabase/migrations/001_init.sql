-- KIDA Welfare initial schema
-- Run this in the Supabase SQL editor (or `supabase db push` with the CLI).

-- ---------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------
create sequence if not exists member_number_seq start 1;

create table if not exists members (
  id            uuid primary key default gen_random_uuid(),
  member_number text unique,                 -- assigned by trigger: KIDAW-001
  full_name     text not null,
  email         text not null unique,
  phone         text,
  national_id   text,
  date_of_birth text,
  branch        text,                        -- home area / branch
  next_of_kin   jsonb,                       -- { name_relationship, phone }
  status        text not null default 'pending'  -- pending -> active once the $100 registration fee is paid
                check (status in ('pending', 'active', 'inactive')),
  created_at    timestamptz not null default now()
);

create or replace function assign_member_number()
returns trigger
language plpgsql
as $$
begin
  if new.member_number is null then
    new.member_number := 'KIDAW-' || lpad(nextval('member_number_seq')::text, 3, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_member_number on members;
create trigger trg_assign_member_number
  before insert on members
  for each row execute function assign_member_number();

-- ---------------------------------------------------------------
-- Contributions (registration fee + ongoing welfare contributions)
-- ---------------------------------------------------------------
create table if not exists contributions (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references members (id) on delete cascade,
  amount_cents      integer not null check (amount_cents > 0),
  currency          text not null default 'usd',
  type              text not null default 'contribution'
                    check (type in ('registration', 'contribution')),
  stripe_session_id text unique,             -- makes the Stripe webhook idempotent
  status            text not null default 'paid'
                    check (status in ('paid', 'refunded')),
  paid_at           timestamptz not null default now()
);

create index if not exists idx_contributions_member on contributions (member_id);

-- ---------------------------------------------------------------
-- Row Level Security: members may read only their own records.
-- All writes go through the server using the service-role key.
-- ---------------------------------------------------------------
alter table members enable row level security;
alter table contributions enable row level security;

create policy "Members can view their own record"
  on members for select
  using (email = (auth.jwt() ->> 'email'));

create policy "Members can view their own contributions"
  on contributions for select
  using (
    exists (
      select 1 from members m
      where m.id = contributions.member_id
        and m.email = (auth.jwt() ->> 'email')
    )
  );
