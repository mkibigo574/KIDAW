-- Beneficiaries: nuclear family members nominated by the member after
-- registration (next of kin stays as members.next_of_kin jsonb).

create table if not exists beneficiaries (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references members (id) on delete cascade,
  full_name     text not null,
  relationship  text not null check (relationship in ('spouse', 'child')),
  date_of_birth text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_beneficiaries_member on beneficiaries (member_id);

-- Members may read their own beneficiaries; writes go through the server.
alter table beneficiaries enable row level security;

create policy "Members can view their own beneficiaries"
  on beneficiaries for select
  using (
    exists (
      select 1 from members m
      where m.id = beneficiaries.member_id
        and m.email = (auth.jwt() ->> 'email')
    )
  );
