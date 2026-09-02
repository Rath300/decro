/**
 * Nested multi-parent hub DAG for the pitch-mode creative web.
 * Leaves / enterable hubs map to seeded subgroup genre names when possible.
 */

export type PitchHub = {
  id: string
  label: string
  /** 0 = center, 1 = main, 2+ = nested */
  depth: number
  /** 0–2 parent hub ids */
  parents: string[]
  /** Seeded genre name → slugify for DB subgroup lookup */
  genreName?: string
  /** Show at start (center, mains, key bridges) */
  startVisible?: boolean
  /** Extra tokens for free local placement matching */
  aliases?: string[]
}

/** User-created hub id on the pitch web (`sg:<uuid>`). */
export function userHubId(subgroupId: string): string {
  return `sg:${subgroupId}`
}

export function isUserHubId(hubId: string): boolean {
  return hubId.startsWith('sg:')
}

export function parseUserHubId(hubId: string): string | null {
  if (!hubId.startsWith('sg:')) return null
  const id = hubId.slice(3)
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function hubSlug(hub: PitchHub): string | null {
  // Center is the web root, not a room. Every other hub is enterable.
  if (hub.depth === 0) return null
  // Prefer dedicated room slug from the hub id so bridges/mains are unique
  // even when genreName points at a shared seed genre.
  return slugify(hub.id || hub.genreName || hub.label)
}

/** Full curated DAG */
export const PITCH_HUBS: PitchHub[] = [
  { id: 'decro', label: 'Decro', depth: 0, parents: [], startVisible: true },

  {
    id: 'visual-art',
    label: 'Visual Art',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['painting', 'drawing', 'fine art', 'illustration', 'gallery', 'canvas', 'sketch'],
  },
  {
    id: 'photography',
    label: 'Photography',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['photo', 'camera', 'lens', 'darkroom', 'analog', 'digital photo', 'shoot'],
  },
  {
    id: 'music',
    label: 'Music',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['song', 'audio', 'beat', 'album', 'sound', 'producer', 'instrumental', 'track'],
  },
  {
    id: 'film',
    label: 'Film',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['cinema', 'movie', 'video', 'director', 'cinematography', 'short', 'motion'],
  },
  {
    id: 'writing',
    label: 'Writing',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['words', 'prose', 'poem', 'story', 'literature', 'text', 'author', 'writer'],
  },
  {
    id: 'design',
    label: 'Design',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['graphic', 'type', 'layout', 'ui', 'ux', 'brand', 'poster', 'web design'],
  },
  {
    id: 'craft',
    label: 'Craft',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['handmade', 'maker', 'pottery', 'fiber', 'wood', 'physical', 'object'],
  },
  {
    id: 'games',
    label: 'Games',
    depth: 1,
    parents: ['decro'],
    startVisible: true,
    aliases: ['game', 'gaming', 'indie', 'pixel', 'interactive', 'play', 'gamedev'],
  },

  { id: 'street-photo', label: 'Street Photo', depth: 2, parents: ['photography'], genreName: 'Street Photo' },
  { id: 'portraiture', label: 'Portraiture', depth: 2, parents: ['photography'], genreName: 'Portraiture' },
  { id: 'analog-film', label: 'Analog Film', depth: 2, parents: ['photography'], genreName: 'Analog Film' },
  { id: 'documentary-photo', label: 'Documentary Photo', depth: 2, parents: ['photography'], genreName: 'Documentary Photo' },
  { id: 'night-photography', label: 'Night Photography', depth: 2, parents: ['photography'], genreName: 'Night Photography' },
  { id: 'night-street', label: 'Night Street', depth: 3, parents: ['street-photo', 'night-photography'] },
  { id: 'landscape', label: 'Landscape', depth: 2, parents: ['photography'], genreName: 'Landscape' },
  { id: 'archival', label: 'Archival', depth: 2, parents: ['photography'], genreName: 'Archival' },
  { id: 'aerial', label: 'Aerial', depth: 2, parents: ['photography'], genreName: 'Aerial' },
  { id: 'macro', label: 'Macro', depth: 2, parents: ['photography'], genreName: 'Macro' },
  { id: 'scanography', label: 'Scanography', depth: 2, parents: ['photography'], genreName: 'Scanography' },
  {
    id: 'astrophotography',
    label: 'Astrophotography',
    depth: 2,
    parents: ['photography'],
    genreName: 'Astrophotography',
  },
  {
    id: 'architectural-photo',
    label: 'Architectural Photo',
    depth: 2,
    parents: ['photography'],
    genreName: 'Architectural Photo',
  },
  {
    id: 'still-life-photo',
    label: 'Still Life Photo',
    depth: 2,
    parents: ['photography'],
    genreName: 'Still Life Photo',
  },
  { id: 'food-photo', label: 'Food Photo', depth: 3, parents: ['still-life-photo'], genreName: 'Food Photo' },
  {
    id: 'product-shot',
    label: 'Product Shot',
    depth: 3,
    parents: ['still-life-photo', 'design'],
    genreName: 'Product Shot',
  },
  { id: 'polaroid', label: 'Polaroid', depth: 3, parents: ['analog-film'], genreName: 'Polaroid' },
  { id: 'photogram', label: 'Photogram', depth: 3, parents: ['analog-film'], genreName: 'Photogram' },
  {
    id: 'darkroom-prints',
    label: 'Darkroom Prints',
    depth: 3,
    parents: ['analog-film'],
    genreName: 'Darkroom Prints',
  },

  { id: 'oil-painting', label: 'Oil Painting', depth: 2, parents: ['visual-art'], genreName: 'Oil Painting' },
  { id: 'watercolor', label: 'Watercolor', depth: 2, parents: ['visual-art'], genreName: 'Watercolor' },
  { id: 'collage', label: 'Collage', depth: 2, parents: ['visual-art'], genreName: 'Collage' },
  {
    id: 'illustration',
    label: 'Illustration',
    depth: 2,
    parents: ['visual-art', 'design'],
    genreName: 'Illustration',
  },
  { id: 'street-art', label: 'Street Art', depth: 2, parents: ['visual-art'], genreName: 'Street Art' },
  { id: 'glitch', label: 'Glitch', depth: 2, parents: ['visual-art'], genreName: 'Glitch' },
  { id: 'generative', label: 'Generative', depth: 2, parents: ['visual-art', 'design'], genreName: 'Generative' },
  { id: 'acrylic', label: 'Acrylic', depth: 2, parents: ['visual-art'], genreName: 'Acrylic' },
  { id: 'charcoal', label: 'Charcoal', depth: 2, parents: ['visual-art'], genreName: 'Charcoal' },
  { id: 'graphite', label: 'Graphite', depth: 2, parents: ['visual-art'], genreName: 'Graphite' },
  { id: 'pastel', label: 'Pastel', depth: 2, parents: ['visual-art'], genreName: 'Pastel' },
  { id: 'ink-drawing', label: 'Ink Drawing', depth: 2, parents: ['visual-art'], genreName: 'Ink Drawing' },
  { id: 'mural', label: 'Mural', depth: 3, parents: ['street-art'], genreName: 'Mural' },
  { id: 'graffiti', label: 'Graffiti', depth: 3, parents: ['street-art'], genreName: 'Graffiti' },
  { id: 'code-art', label: 'Code Art', depth: 3, parents: ['generative'], genreName: 'Code Art' },
  { id: 'data-viz', label: 'Data Viz', depth: 3, parents: ['generative', 'design'], genreName: 'Data Viz' },
  {
    id: 'printmaking',
    label: 'Printmaking',
    depth: 2,
    parents: ['visual-art', 'craft'],
    genreName: 'Printmaking',
  },
  { id: 'linocut', label: 'Linocut', depth: 3, parents: ['printmaking'], genreName: 'Linocut' },
  { id: 'screen-print', label: 'Screen Print', depth: 3, parents: ['printmaking'], genreName: 'Screen Print' },
  {
    id: 'letterpress',
    label: 'Letterpress',
    depth: 3,
    parents: ['printmaking', 'typography'],
    genreName: 'Letterpress',
  },
  { id: 'risograph', label: 'Risograph', depth: 3, parents: ['printmaking', 'zine'], genreName: 'Risograph' },
  {
    id: 'cyanotype',
    label: 'Cyanotype',
    depth: 3,
    parents: ['analog-film', 'printmaking'],
    genreName: 'Cyanotype',
  },
  {
    id: 'installation',
    label: 'Installation',
    depth: 2,
    parents: ['visual-art', 'craft'],
    genreName: 'Installation',
  },
  {
    id: 'performance-art',
    label: 'Performance Art',
    depth: 2,
    parents: ['visual-art'],
    genreName: 'Performance Art',
    aliases: ['live art', 'happening', 'body art', 'stage'],
  },
  { id: 'dance', label: 'Dance', depth: 3, parents: ['performance-art'], genreName: 'Dance' },
  {
    id: 'choreography',
    label: 'Choreography',
    depth: 3,
    parents: ['performance-art', 'dance'],
    genreName: 'Choreography',
  },
  { id: 'theater', label: 'Theater', depth: 3, parents: ['performance-art'], genreName: 'Theater' },
  {
    id: 'puppetry',
    label: 'Puppetry',
    depth: 3,
    parents: ['performance-art', 'craft'],
    genreName: 'Puppetry',
  },

  { id: 'electronic', label: 'Electronic', depth: 2, parents: ['music'], genreName: 'Electronic' },
  { id: 'hip-hop', label: 'Hip Hop', depth: 2, parents: ['music'], genreName: 'Hip Hop' },
  { id: 'ambient', label: 'Ambient', depth: 2, parents: ['music'], genreName: 'Ambient' },
  { id: 'jazz', label: 'Jazz', depth: 2, parents: ['music'], genreName: 'Jazz' },
  { id: 'score', label: 'Score', depth: 2, parents: ['music'], genreName: 'Score' },
  { id: 'sound-design', label: 'Sound Design', depth: 2, parents: ['music'], genreName: 'Sound Design' },
  { id: 'classical', label: 'Classical', depth: 2, parents: ['music'], genreName: 'Classical' },
  { id: 'folk', label: 'Folk', depth: 2, parents: ['music'], genreName: 'Folk' },
  { id: 'punk', label: 'Punk', depth: 2, parents: ['music'], genreName: 'Punk' },
  { id: 'live-set', label: 'Live Set', depth: 2, parents: ['music'], genreName: 'Live Set' },
  { id: 'choir', label: 'Choir', depth: 3, parents: ['classical'], genreName: 'Choir' },
  { id: 'dj-mix', label: 'DJ Mix', depth: 3, parents: ['electronic'], genreName: 'DJ Mix' },
  {
    id: 'modular-synth',
    label: 'Modular Synth',
    depth: 3,
    parents: ['electronic', 'sound-design'],
    genreName: 'Modular Synth',
  },
  {
    id: 'field-recording',
    label: 'Field Recording',
    depth: 3,
    parents: ['sound-design'],
    genreName: 'Field Recording',
  },
  {
    id: 'spoken-word',
    label: 'Spoken Word',
    depth: 3,
    parents: ['poetry', 'sound-design'],
    genreName: 'Spoken Word',
  },

  { id: 'short-film', label: 'Short Film', depth: 2, parents: ['film'], genreName: 'Short Film' },
  { id: 'experimental-film', label: 'Experimental Film', depth: 2, parents: ['film'], genreName: 'Experimental Film' },
  { id: 'animation', label: 'Animation', depth: 2, parents: ['film'], genreName: 'Animation' },
  { id: 'video-art', label: 'Video Art', depth: 2, parents: ['film', 'visual-art'], genreName: 'Video Art' },
  { id: 'documentary-film', label: 'Documentary Film', depth: 2, parents: ['film'], genreName: 'Documentary Film' },
  { id: 'stop-motion', label: 'Stop Motion', depth: 3, parents: ['animation', 'craft'], genreName: 'Stop Motion' },
  {
    id: 'found-footage',
    label: 'Found Footage',
    depth: 3,
    parents: ['experimental-film', 'video-art'],
    genreName: 'Found Footage',
  },

  { id: 'poetry', label: 'Poetry', depth: 2, parents: ['writing'], genreName: 'Poetry' },
  { id: 'fiction', label: 'Fiction', depth: 2, parents: ['writing'], genreName: 'Fiction' },
  { id: 'essay', label: 'Essay', depth: 2, parents: ['writing'], genreName: 'Essay' },
  { id: 'comics', label: 'Comics', depth: 2, parents: ['writing', 'visual-art'], genreName: 'Comics' },
  {
    id: 'zine',
    label: 'Zine',
    depth: 2,
    parents: ['writing', 'design'],
    genreName: 'Zine',
  },

  { id: 'typography', label: 'Typography', depth: 2, parents: ['design'], genreName: 'Typography' },
  { id: 'poster-design', label: 'Poster Design', depth: 2, parents: ['design'], genreName: 'Poster Design' },
  { id: 'brutalist-web', label: 'Brutalist Web', depth: 2, parents: ['design'], genreName: 'Brutalist Web' },
  { id: 'ui-specimens', label: 'UI Specimens', depth: 2, parents: ['design'], genreName: 'UI Specimens' },
  { id: '3d-render', label: '3D Render', depth: 2, parents: ['design'], genreName: '3D Render' },
  { id: 'packaging', label: 'Packaging', depth: 2, parents: ['design'], genreName: 'Packaging' },
  {
    id: 'fashion-design',
    label: 'Fashion Design',
    depth: 2,
    parents: ['design', 'craft'],
    genreName: 'Fashion Design',
  },
  {
    id: 'fashion-editorial',
    label: 'Fashion Editorial',
    depth: 3,
    parents: ['fashion-design', 'photography'],
    genreName: 'Fashion Editorial',
  },
  { id: 'calligraphy', label: 'Calligraphy', depth: 3, parents: ['typography'], genreName: 'Calligraphy' },
  {
    id: 'hand-lettering',
    label: 'Hand Lettering',
    depth: 3,
    parents: ['typography'],
    genreName: 'Hand Lettering',
  },
  { id: 'cgi', label: 'CGI', depth: 3, parents: ['3d-render', 'animation'], genreName: 'CGI' },

  { id: 'ceramics', label: 'Ceramics', depth: 2, parents: ['craft'], genreName: 'Ceramics' },
  { id: 'textile-art', label: 'Textile Art', depth: 2, parents: ['craft'], genreName: 'Textile Art' },
  { id: 'sculpture', label: 'Sculpture', depth: 2, parents: ['craft'], genreName: 'Sculpture' },
  { id: 'woodworking', label: 'Woodworking', depth: 2, parents: ['craft'], genreName: 'Woodworking' },
  { id: 'glass', label: 'Glass', depth: 2, parents: ['craft'], genreName: 'Glass' },
  { id: 'metalwork', label: 'Metalwork', depth: 2, parents: ['craft'], genreName: 'Metalwork' },
  { id: 'jewelry', label: 'Jewelry', depth: 2, parents: ['craft', 'design'], genreName: 'Jewelry' },
  { id: 'book-arts', label: 'Book Arts', depth: 2, parents: ['craft', 'zine'], genreName: 'Book Arts' },
  { id: 'weaving', label: 'Weaving', depth: 3, parents: ['textile-art'], genreName: 'Weaving' },
  { id: 'embroidery', label: 'Embroidery', depth: 3, parents: ['textile-art'], genreName: 'Embroidery' },
  { id: 'quilt', label: 'Quilt', depth: 3, parents: ['textile-art'], genreName: 'Quilt' },
  {
    id: 'costume',
    label: 'Costume',
    depth: 3,
    parents: ['textile-art', 'fashion-design'],
    genreName: 'Costume',
  },
  {
    id: 'assemblage',
    label: 'Assemblage',
    depth: 3,
    parents: ['sculpture', 'collage'],
    genreName: 'Assemblage',
  },

  { id: 'video-games', label: 'Video Games', depth: 2, parents: ['games'], genreName: 'Game Art' },
  {
    id: 'vr-experience',
    label: 'VR Experience',
    depth: 2,
    parents: ['games'],
    genreName: 'VR Experience',
  },
  { id: 'indie-games', label: 'Indie Games', depth: 3, parents: ['video-games'] },
  { id: 'triple-a', label: 'Triple-A', depth: 3, parents: ['video-games'] },
  {
    id: 'game-art',
    label: 'Game Art',
    depth: 3,
    parents: ['video-games', 'design'],
    genreName: 'Game Art',
  },
  {
    id: 'pixel-art',
    label: 'Pixel Art',
    depth: 3,
    parents: ['indie-games', 'visual-art'],
    genreName: 'Pixel Art',
  },
  {
    id: 'character-design',
    label: 'Character Design',
    depth: 3,
    parents: ['game-art', 'illustration'],
    genreName: 'Character Design',
  },
  {
    id: 'concept-art',
    label: 'Concept Art',
    depth: 3,
    parents: ['game-art', 'illustration'],
    genreName: 'Concept Art',
  },

  {
    id: 'album-cover',
    label: 'Album Cover',
    depth: 2,
    parents: ['music', 'design'],
    genreName: 'Poster Design',
  },
  {
    id: 'music-video',
    label: 'Music Video',
    depth: 2,
    parents: ['music', 'film'],
    genreName: 'Motion Graphics',
  },
  {
    id: 'photo-essay',
    label: 'Photo Essay',
    depth: 2,
    parents: ['photography', 'writing'],
    genreName: 'Documentary Photo',
  },
  {
    id: 'fashion-film',
    label: 'Fashion Film',
    depth: 2,
    parents: ['film', 'design'],
    genreName: 'Fashion Editorial',
  },
  {
    id: 'sound-sculpture',
    label: 'Sound Sculpture',
    depth: 2,
    parents: ['music', 'craft'],
    genreName: 'Sound Design',
  },
  {
    id: 'game-soundtrack',
    label: 'Game Soundtrack',
    depth: 3,
    parents: ['video-games', 'music'],
    genreName: 'Score',
  },
  {
    id: 'graphic-novel',
    label: 'Graphic Novel',
    depth: 2,
    parents: ['writing', 'visual-art'],
    genreName: 'Graphic Novel',
  },
  {
    id: 'avant-garde-archive',
    label: 'Avant-Garde Archive',
    depth: 2,
    parents: ['film', 'music', 'writing', 'visual-art'],
    genreName: 'Avant-Garde Archive',
    aliases: [
      'ubu',
      'ubuweb',
      'experimental archive',
      'web history',
      'avant garde',
      'sound poetry',
      'concrete poetry',
    ],
  },
  {
    id: 'avant-garde-film',
    label: 'Avant-Garde Film',
    depth: 3,
    parents: ['avant-garde-archive', 'experimental-film'],
    genreName: 'Avant-Garde Film',
    aliases: ['ubu film', 'experimental cinema'],
  },
  {
    id: 'avant-garde-video',
    label: 'Avant-Garde Video',
    depth: 3,
    parents: ['avant-garde-archive', 'video-art'],
    genreName: 'Avant-Garde Video',
    aliases: ['ubu video', 'video art archive'],
  },
  {
    id: 'avant-garde-sound',
    label: 'Avant-Garde Sound',
    depth: 3,
    parents: ['avant-garde-archive', 'sound-design'],
    genreName: 'Avant-Garde Sound',
    aliases: ['ubu sound', 'experimental audio'],
  },
  {
    id: 'sound-poetry',
    label: 'Sound Poetry',
    depth: 3,
    parents: ['avant-garde-archive', 'poetry', 'sound-design'],
    genreName: 'Sound Poetry',
    aliases: ['poesie sonore', 'text sound'],
  },
  {
    id: 'avant-garde-poetry',
    label: 'Avant-Garde Poetry',
    depth: 3,
    parents: ['avant-garde-archive', 'poetry'],
    genreName: 'Avant-Garde Poetry',
    aliases: ['ubu poetry', 'experimental writing'],
  },
  {
    id: 'concrete-poetry',
    label: 'Concrete Poetry',
    depth: 3,
    parents: ['avant-garde-archive', 'poetry', 'visual-art'],
    genreName: 'Concrete Poetry',
    aliases: ['visual poetry', 'concrete poem'],
  },
]

const hubById = new Map(PITCH_HUBS.map((h) => [h.id, h]))

export function getPitchHub(id: string): PitchHub | undefined {
  return hubById.get(id)
}

export function childrenOf(id: string): PitchHub[] {
  return PITCH_HUBS.filter((h) => h.parents.includes(id))
}

export function hubNodeId(id: string): string {
  return `hub:${id}`
}

export function parseHubNodeId(nodeId: string): string | null {
  if (!nodeId.startsWith('hub:')) return null
  return nodeId.slice('hub:'.length) || null
}

/** Clean start: center + main groups only (no niches / bridges). */
export function startVisibleHubs(): PitchHub[] {
  return PITCH_HUBS.filter((h) => h.depth <= 1)
}

export function allParentChildLinks(): { parent: string; child: string }[] {
  const links: { parent: string; child: string }[] = []
  for (const h of PITCH_HUBS) {
    for (const p of h.parents) {
      links.push({ parent: p, child: h.id })
    }
  }
  return links
}

/** @deprecated use getPitchHub — kept for any lingering imports */
export function getPitchParent(id: string) {
  const h = getPitchHub(id)
  if (!h) return undefined
  return {
    id: h.id,
    label: h.label,
    genres: childrenOf(h.id).map((c) => c.genreName || c.label),
  }
}

export function parentNodeId(parentId: string): string {
  return hubNodeId(parentId)
}

export function parseParentNodeId(nodeId: string): string | null {
  return (
    parseHubNodeId(nodeId) ||
    (nodeId.startsWith('parent:') ? nodeId.slice(7) || null : null)
  )
}
