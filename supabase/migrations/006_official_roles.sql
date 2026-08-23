-- Committee roles, replacing the flat OFFICIALS_EMAILS environment variable.
-- Roles are held by email so an officer can be appointed before they hold a
-- member record, and revoked (rather than deleted) so handovers stay on record.
--
-- Offices:
--   chairperson - chairs meetings; approves welfare disbursements
--   records     - Public Officer & Record Keeping Officer (one combined office)
--   treasurer   - keeps the contribution ledger and reconciles payments
--   welfare     - receives welfare cases and coordinates support

create table if not exists official_roles (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  role         text not null check (role in ('chairperson', 'records', 'treasurer', 'welfare')),
  appointed_at timestamptz not null default now(),
  appointed_by text,
  revoked_at   timestamptz,
  revoked_by   text
);

-- One live appointment per person per office; revoked rows may repeat.
create unique index if not exists uq_official_role_active
  on official_roles (email, role)
  where revoked_at is null;

create index if not exists idx_official_roles_email on official_roles (email);

-- No client access at all: every read and write goes through the server, which
-- checks permissions first.
alter table official_roles enable row level security;
