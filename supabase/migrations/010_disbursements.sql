-- Money paid out of the fund. Kept separate from contributions: that table is
-- the money-in ledger and is append-only, whereas a disbursement is a workflow
-- that moves through requested → approved → paid.
--
-- Two signatures are required. The Treasurer initiates and later records the
-- payment; the Chairperson approves. Neither can do the other's step.

create table if not exists disbursements (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid references members (id) on delete set null,
  amount_cents      integer not null check (amount_cents > 0),
  currency          text not null default 'aud',
  purpose           text not null,
  status            text not null default 'requested'
                    check (status in ('requested', 'approved', 'rejected', 'paid', 'cancelled')),

  initiated_by      text not null,
  initiated_at      timestamptz not null default now(),

  decided_by        text,          -- the second signature
  decided_at        timestamptz,
  decision_note     text,

  paid_at           timestamptz,
  paid_by           text,
  payment_method    text check (payment_method in ('cash', 'bank', 'other')),
  payment_reference text,

  created_at        timestamptz not null default now()
);

create index if not exists idx_disbursements_status on disbursements (status);
create index if not exists idx_disbursements_member on disbursements (member_id);

-- The approver may never be the person who requested it, whatever roles they
-- happen to hold. Enforced here so it cannot be bypassed by any code path.
alter table disbursements drop constraint if exists disbursements_two_signatures;
alter table disbursements add constraint disbursements_two_signatures
  check (decided_by is null or decided_by <> initiated_by);

-- Server-only: read and written through the API, which checks permissions.
alter table disbursements enable row level security;
