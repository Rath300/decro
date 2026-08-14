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

  { id: 'electronic', label: 'Electronic', depth: 2, parents: ['music'], genreName: 'Electronic' },
  { id: 'hip-hop', label: 'Hip Hop', depth: 2, parents: ['music'], genreName: 'Hip Hop' },
  { id: 'ambient', label: 'Ambient', depth: 2, parents: ['music'], genreName: 'Ambient' },
  { id: 'jazz', label: 'Jazz', depth: 2, parents: ['music'], genreName: 'Jazz' },
  { id: 'score', label: 'Score', depth: 2, parents: ['music'], genreName: 'Score' },
  { id: 'sound-design', label: 'Sound Design', depth: 2, parents: ['music'], genreName: 'Sound Design' },

  { id: 'short-film', label: 'Short Film', depth: 2, parents: ['film'], genreName: 'Short Film' },
  { id: 'experimental-film', label: 'Experimental Film', depth: 2, parents: ['film'], genreName: 'Experimental Film' },
  { id: 'animation', label: 'Animation', depth: 2, parents: ['film'], genreName: 'Animation' },
  { id: 'video-art', label: 'Video Art', depth: 2, parents: ['film', 'visual-art'], genreName: 'Video Art' },
  { id: 'documentary-film', label: 'Documentary Film', depth: 2, parents: ['film'], genreName: 'Documentary Film' },

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

  { id: 'ceramics', label: 'Ceramics', depth: 2, parents: ['craft'], genreName: 'Ceramics' },
  { id: 'textile-art', label: 'Textile Art', depth: 2, parents: ['craft'], genreName: 'Textile Art' },
  { id: 'sculpture', label: 'Sculpture', depth: 2, parents: ['craft'], genreName: 'Sculpture' },
  { id: 'woodworking', label: 'Woodworking', depth: 2, parents: ['craft'], genreName: 'Woodworking' },

  { id: 'video-games', label: 'Video Games', depth: 2, parents: ['games'], genreName: 'Game Art' },
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
