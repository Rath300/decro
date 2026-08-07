/**
 * Curated parent hubs for the pitch-mode community web.
 * Maps to existing genre subgroup slugs from scripts/seed-pitch-genres.mjs
 * (no DB parent_id hierarchy yet).
 */

export type PitchParent = {
  id: string
  label: string
  /** Genre names as seeded; slugs are derived the same way as the seed script. */
  genres: string[]
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export const PITCH_PARENTS: PitchParent[] = [
  {
    id: 'visual-art',
    label: 'Visual Art',
    genres: [
      'Collage',
      'Assemblage',
      'Oil Painting',
      'Acrylic',
      'Watercolor',
      'Ink Drawing',
      'Charcoal',
      'Graphite',
      'Pastel',
      'Printmaking',
      'Linocut',
      'Screen Print',
      'Risograph',
      'Illustration',
      'Character Design',
      'Concept Art',
      'Street Art',
      'Graffiti',
      'Mural',
      'Installation',
      'Performance Art',
      'Glitch',
      'Generative',
      'Code Art',
      'Photogram',
      'Scanography',
    ],
  },
  {
    id: 'photography',
    label: 'Photography',
    genres: [
      'Street Photo',
      'Portraiture',
      'Analog Film',
      'Cyanotype',
      'Darkroom Prints',
      'Documentary Photo',
      'Architectural Photo',
      'Landscape',
      'Still Life Photo',
      'Fashion Editorial',
      'Night Photography',
      'Polaroid',
      'Macro',
      'Aerial',
      'Astrophotography',
      'Product Shot',
      'Food Photo',
      'Archival',
    ],
  },
  {
    id: 'music',
    label: 'Music',
    genres: [
      'Sound Design',
      'Field Recording',
      'Ambient',
      'Electronic',
      'Modular Synth',
      'Jazz',
      'Hip Hop',
      'Punk',
      'Folk',
      'Classical',
      'Choir',
      'Score',
      'Live Set',
      'DJ Mix',
    ],
  },
  {
    id: 'film',
    label: 'Film & Moving Image',
    genres: [
      'Video Art',
      'Experimental Film',
      'Short Film',
      'Documentary Film',
      'Animation',
      'Stop Motion',
      'Motion Graphics',
      'Found Footage',
      'Dance',
      'Choreography',
      'Theater',
      'Puppetry',
      'VR Experience',
    ],
  },
  {
    id: 'writing',
    label: 'Writing',
    genres: [
      'Spoken Word',
      'Poetry',
      'Essay',
      'Fiction',
      'Comics',
      'Graphic Novel',
      'Zine',
      'Book Arts',
    ],
  },
  {
    id: 'design',
    label: 'Design',
    genres: [
      'Typography',
      'Poster Design',
      'Letterpress',
      'Fashion Design',
      'Costume',
      'Jewelry',
      'UI Specimens',
      'Brutalist Web',
      'Packaging',
      'Data Viz',
      '3D Render',
      'CGI',
      'Game Art',
      'Pixel Art',
      'Calligraphy',
      'Hand Lettering',
    ],
  },
  {
    id: 'craft',
    label: 'Craft',
    genres: [
      'Sculpture',
      'Ceramics',
      'Glass',
      'Metalwork',
      'Woodworking',
      'Textile Art',
      'Weaving',
      'Embroidery',
      'Quilt',
    ],
  },
]

export function getPitchParent(id: string): PitchParent | undefined {
  return PITCH_PARENTS.find((p) => p.id === id)
}

export function parentGenreSlugs(parent: PitchParent): string[] {
  return parent.genres.map(slugify)
}

export function parentNodeId(parentId: string): string {
  return `parent:${parentId}`
}

export function parseParentNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith('parent:')) return null
  return nodeId.slice('parent:'.length) || null
}
