export const PITCH_HEADLINE = 'DECRO'

export const PITCH_PARAGRAPHS = [
  'Decro is a place for artists, musicians, photographers, writers, and makers to find each other through shared creative communities — not just another feed of posts.',
  'Start with a few main groups, open a niche that fits your work, then leave art or a comment. The goal is tight multidisciplinary circles and real collaboration.',
  'We run the site ourselves and it isn\'t for profit. We want honest feedback on what would make this useful for you — especially things missing from Tumblr, Instagram, and similar places.',
  'You can email me at helpdecro.net@gmail.com or send a message on discord at rath6053 or existsneel. Thanks so much.',
]

/** Interactive tour stages — driven by real graph actions. */
export type PitchTourStage =
  | 'welcome'
  | 'click-main'
  | 'click-niche'
  | 'create'
  | 'guest'
  | 'done'

export const PITCH_TOUR_COPY: Record<
  Exclude<PitchTourStage, 'done'>,
  { title: string; body: string; cta?: string }
> = {
  welcome: {
    title: 'This is Decro',
    body: 'Creative groups linked together. Zoom in, open a room, post work, or start your own niche.',
    cta: 'Show me',
  },
  'click-main': {
    title: '1 · Zoom into a group',
    body: 'Tap Photography, Music, Games… The camera zooms in and related niches appear around it.',
    cta: 'Next',
  },
  'click-niche': {
    title: '2 · Open a group',
    body: 'Use Enter group (or double-tap a niche) to go inside — that’s where you post, comment, and chat.',
    cta: 'Next',
  },
  create: {
    title: '3 · Create & post',
    body: 'Upload puts work in a group. Logged-in users can create a new subgroup and choose which parent groups it hangs under (we suggest, you confirm).',
    cta: 'Next',
  },
  guest: {
    title: 'No login needed',
    body: 'Guests can upload, comment, and chat. Log in if you want a profile and to create groups.',
    cta: 'Start exploring',
  },
}

export const PITCH_TOUR_TOTAL = 5

export const PITCH_ENTER_CTA = 'Enter the groups'

export const PITCH_HINT =
  'search · tap to zoom · tap again to close niches · Decro / duck = mains · Tutorial for the walkthrough'

export const PITCH_EMAIL = 'helpdecro.net@gmail.com'
export const PITCH_DISCORD_HANDLES = ['rath6053', 'existsneel'] as const

/** Suggested first main group for the tour highlight. */
export const PITCH_TOUR_PARENT_ID = 'photography'
