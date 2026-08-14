-- Split Avant-Garde Archive into niche rooms under the bridge hub.

insert into public.subgroups (name, slug, description, created_by)
select v.name, v.slug, v.description, 'pitch:seed'
from (values
  (
    'Avant-Garde Film',
    'avant-garde-film',
    'Experimental and underground film indexes. Text posts link out to UbuWeb. Decro does not host the works.'
  ),
  (
    'Avant-Garde Video',
    'avant-garde-video',
    'Video art and early video indexes. Text posts link out to UbuWeb. Decro does not host the works.'
  ),
  (
    'Avant-Garde Sound',
    'avant-garde-sound',
    'Experimental sound and audio indexes. Text posts link out to UbuWeb. Decro does not host the works.'
  ),
  (
    'Sound Poetry',
    'sound-poetry',
    'Sound poetry and text-sound works. Text posts link out to UbuWeb. Decro does not host the works.'
  ),
  (
    'Avant-Garde Poetry',
    'avant-garde-poetry',
    'Experimental poetry and writing indexes. Text posts link out to UbuWeb. Decro does not host the works.'
  ),
  (
    'Concrete Poetry',
    'concrete-poetry',
    'Visual and concrete poetry indexes. Text posts link out to UbuWeb. Decro does not host the works.'
  )
) as v(name, slug, description)
where not exists (select 1 from public.subgroups s where s.slug = v.slug);

-- Keep the parent archive room as a map / overview.
update public.subgroups
set description = 'Bridge into Decro avant-garde niches. Enter a child room for film, video, sound, sound poetry, poetry, or concrete poetry. Catalog posts link out to UbuWeb.'
where slug = 'avant-garde-archive';
