-- Remove internal pitch-seed copy from public group descriptions.
update public.subgroups
set description = null,
    updated_at = now()
where description ilike '%seeded for pitch mode%';
