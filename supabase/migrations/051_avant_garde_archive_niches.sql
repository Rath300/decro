-- Split Avant-Garde Archive into niche rooms under the bridge hub.

insert into public.subgroups (name, slug, description, created_by)
select v.name, v.slug, null, 'pitch:seed'
from (values
  ('Avant-Garde Film', 'avant-garde-film'),
  ('Avant-Garde Video', 'avant-garde-video'),
  ('Avant-Garde Sound', 'avant-garde-sound'),
  ('Sound Poetry', 'sound-poetry'),
  ('Avant-Garde Poetry', 'avant-garde-poetry'),
  ('Concrete Poetry', 'concrete-poetry')
) as v(name, slug)
where not exists (select 1 from public.subgroups s where s.slug = v.slug);
