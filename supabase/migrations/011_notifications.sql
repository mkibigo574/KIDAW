-- Notifications addressed to an office rather than a person, so they survive a
-- handover: appoint a new Treasurer and they inherit the Treasurer's queue.

create table if not exists notifications (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null check (audience in ('chairperson', 'treasurer', 'records')),
  event      text not null,            -- 'disbursement.requested', 'payment.received', …
  title      text not null,
  body       text,
  link       text,                     -- where the officer goes to act on it
  entity_id  text,
  actor      text,                     -- who caused it, when a person did
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_audience
  on notifications (audience, created_at desc);

-- Read state is per person: two officers sharing an office each mark their own.
create table if not exists notification_reads (
  notification_id uuid not null references notifications (id) on delete cascade,
  email           text not null,
  read_at         timestamptz not null default now(),
  primary key (notification_id, email)
);

create index if not exists idx_notification_reads_email on notification_reads (email);

-- Server-only: served through the API, which checks the caller's office.
alter table notifications enable row level security;
alter table notification_reads enable row level security;
