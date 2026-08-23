-- Association settings the committee agrees and the system computes against.
-- Arrears cannot be calculated without a stated monthly contribution, so the
-- rate lives here rather than being hard-coded.

create table if not exists association_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into association_settings (key, value)
values
  ('monthly_contribution_cents', '2500'::jsonb),  -- A$25 per month
  ('arrears_grace_months', '1'::jsonb)            -- months allowed before a member counts as behind
on conflict (key) do nothing;

-- Server-only: read and written through the API, which checks permissions.
alter table association_settings enable row level security;
