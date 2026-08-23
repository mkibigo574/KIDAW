-- The committee runs three offices: chairperson, treasurer and records
-- (Public Officer & Record Keeping). Welfare claims are submitted by members,
-- initiated by the treasurer and approved by the chair, so a separate welfare
-- office is no longer part of the model.

-- Close any live welfare appointment rather than deleting it, so the handover
-- stays on the record.
update official_roles
   set revoked_at = now(), revoked_by = 'system:role-removed'
 where role = 'welfare' and revoked_at is null;

alter table official_roles drop constraint if exists official_roles_role_check;
alter table official_roles add constraint official_roles_role_check
  check (role in ('chairperson', 'treasurer', 'records'));
