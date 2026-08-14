-- Avant-Garde Archive bridge hub room (UbuWeb link catalog home).

insert into public.subgroups (name, slug, description, created_by)
select
  'Avant-Garde Archive',
  'avant-garde-archive',
  'Curated text-card index of avant-garde film, sound, and poetry. Links out to external archives (including UbuWeb). Decro does not host the works.',
  'pitch:seed'
where not exists (
  select 1 from public.subgroups s where s.slug = 'avant-garde-archive'
);
