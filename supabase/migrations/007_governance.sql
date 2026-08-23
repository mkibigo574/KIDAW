-- Governance controls: an append-only ledger, soft deletes, and an audit trail
-- for every privileged action.

-- ---------------------------------------------------------------
-- Audit log — actor, timestamp, before/after. Append-only.
-- ---------------------------------------------------------------
create table if not exists audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action      text not null,          -- e.g. 'role.appoint', 'member.update'
  entity      text not null,          -- table the action touched
  entity_id   text,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_audit_created on audit_log (created_at desc);
create index if not exists idx_audit_actor on audit_log (actor_email);

-- ---------------------------------------------------------------
-- Members: soft delete only. Records are never removed, so a member who
-- leaves still appears in the historical register.
-- ---------------------------------------------------------------
alter table members add column if not exists deleted_at timestamptz;
alter table members add column if not exists deleted_by text;

-- ---------------------------------------------------------------
-- Contributions: the ledger. Corrections are made by posting a reversing
-- entry, never by editing or deleting what was already posted.
-- ---------------------------------------------------------------
alter table contributions add column if not exists method text not null default 'stripe';
alter table contributions add column if not exists recorded_by text;   -- officer who posted an offline entry
alter table contributions add column if not exists reversal_of uuid references contributions (id);
alter table contributions add column if not exists note text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contributions_method_check'
  ) then
    alter table contributions add constraint contributions_method_check
      check (method in ('stripe', 'cash', 'bank', 'other'));
  end if;
end $$;

-- A reversing entry carries a negative amount, so zero is the only value barred.
alter table contributions drop constraint if exists contributions_amount_cents_check;
alter table contributions add constraint contributions_amount_cents_check
  check (amount_cents <> 0);

-- ---------------------------------------------------------------
-- Append-only enforcement, at the database rather than in application code so
-- it holds however the row is reached.
-- ---------------------------------------------------------------
create or replace function refuse_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception
    'Table % is append-only. Post a reversing entry instead of editing or deleting a posted row.',
    tg_table_name;
end;
$$;

drop trigger if exists trg_contributions_no_update on contributions;
create trigger trg_contributions_no_update
  before update on contributions
  for each row execute function refuse_mutation();

drop trigger if exists trg_contributions_no_delete on contributions;
create trigger trg_contributions_no_delete
  before delete on contributions
  for each row execute function refuse_mutation();

drop trigger if exists trg_audit_no_update on audit_log;
create trigger trg_audit_no_update
  before update on audit_log
  for each row execute function refuse_mutation();

drop trigger if exists trg_audit_no_delete on audit_log;
create trigger trg_audit_no_delete
  before delete on audit_log
  for each row execute function refuse_mutation();

-- Server-only: reads go through the API, which checks permissions first.
alter table audit_log enable row level security;
