-- A call for contributions: the Treasurer proposes one (a bereavement levy, a
-- project fund), the Chairperson approves it, and once approved every member
-- sees it on their dashboard and can pay it.
--
-- Same two-signature rule as disbursements: the officer who raises a call
-- cannot be the one who approves it.

create table if not exists contribution_calls (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  purpose       text,
  amount_cents  integer not null check (amount_cents > 0),  -- expected per member
  due_date      date,
  status        text not null default 'proposed'
                check (status in ('proposed', 'active', 'rejected', 'closed')),

  initiated_by  text not null,
  initiated_at  timestamptz not null default now(),

  decided_by    text,
  decided_at    timestamptz,
  decision_note text,

  closed_at     timestamptz,
  created_at    timestamptz not null default now()
);

alter table contribution_calls drop constraint if exists calls_two_signatures;
alter table contribution_calls add constraint calls_two_signatures
  check (decided_by is null or decided_by <> initiated_by);

create index if not exists idx_calls_status on contribution_calls (status);

-- Ties a payment to the call it answers, so progress can be counted.
alter table contributions add column if not exists call_id uuid
  references contribution_calls (id) on delete set null;

create index if not exists idx_contributions_call on contributions (call_id);

-- Members may read active calls; everything else goes through the API.
alter table contribution_calls enable row level security;

drop policy if exists "Active calls are visible to members" on contribution_calls;
create policy "Active calls are visible to members"
  on contribution_calls for select
  to authenticated
  using (status in ('active', 'closed'));
