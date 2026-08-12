export const PITCH_HEADLINE = 'DECRO'

export const PITCH_PARAGRAPHS = [
  'Decro is a place for artists, musicians, photographers, writers, and makers to find each other through shared creative communities — not just another feed of posts.',
  'Start with a few main groups, open a niche that fits your work, then leave art or a comment. The goal is tight multidisciplinary circles and real collaboration.',
  'We run the site ourselves and it isn\'t for profit. We want honest feedback on what would make this useful for you — especially things missing from Tumblr, Instagram, and similar places.',
  'You can email me at helpdecro.net@gmail.com or send a message on discord at rath6053 or existsneel. Thanks so much.',
]

/** Interactive tour stages — driven by real UI targets + graph actions. */
export type PitchTourStage =
  | 'welcome'
  | 'click-main'
  | 'click-niche'
  | 'upload'
  | 'search'
  | 'create'
  | 'guest'
  | 'done'

/** CSS selector / data-tour id for spotlight stages */
export type PitchTourTarget =
  | 'graph'
  | 'upload'
  | 'search'
  | 'new-group'
  | 'duck'
  | null

export const PITCH_TOUR_COPY: Record<
  Exclude<PitchTourStage, 'done'>,
  { title: string; body: string; cta?: string; target?: PitchTourTarget }
> = {
  welcome: {
    title: 'This is Decro',
    body: 'A map of creative groups. We’ll walk through zooming, opening a room, uploading, and searching.',
    cta: 'Show me',
  },
  'click-main': {
    title: '1 · Zoom into a group',
    body: 'Tap a main label on the map (Photography, Music…). Niches bloom around it. Tap again later to close them.',
    cta: 'Next',
    target: 'graph',
  },
  'click-niche': {
    title: '2 · Open a room',
    body: 'Select a niche, then Enter group (or double-tap) to go inside — posts, comments, and room chat live there.',
    cta: 'Next',
    target: 'graph',
  },
  upload: {
    title: '3 · Upload work',
    body: 'This Upload button is how you post. Pick an existing group or create a new one and choose its parents.',
    cta: 'Next',
    target: 'upload',
  },
  search: {
    title: '4 · Find groups',
    body: 'Search here anytime — jump straight into a group or focus it on the map.',
    cta: 'Next',
    target: 'search',
  },
  create: {
    title: '5 · Start a subgroup',
    body: 'Logged in? New group lets you create a niche and pick which parents it hangs under. We suggest; you decide.',
    cta: 'Next',
    target: 'new-group',
  },
  guest: {
    title: 'You’re ready',
    body: 'Guests can upload, comment, and chat. Log in for a profile and creating groups. Duck resets the map to mains.',
    cta: 'Start exploring',
    target: 'duck',
  },
}

export const PITCH_TOUR_TOTAL = 7

export const PITCH_ENTER_CTA = 'Enter the groups'

export const PITCH_HINT =
  'search · tap to open · double-tap to enter · duck = mains · Tutorial for the walkthrough'

export const PITCH_EMAIL = 'helpdecro.net@gmail.com'
export const PITCH_DISCORD_HANDLES = ['rath6053', 'existsneel'] as const

/** Suggested first main group for the tour highlight. */
export const PITCH_TOUR_PARENT_ID = 'photography'
