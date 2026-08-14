-- Remove boilerplate descriptions from avant-garde archive rooms.

update public.subgroups
set description = null
where slug in (
  'avant-garde-archive',
  'avant-garde-film',
  'avant-garde-video',
  'avant-garde-sound',
  'sound-poetry',
  'avant-garde-poetry',
  'concrete-poetry'
);
