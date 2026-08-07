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
  | 'guest'
  | 'done'

export const PITCH_TOUR_COPY: Record<
  Exclude<PitchTourStage, 'done'>,
  { title: string; body: string; cta?: string }
> = {
  welcome: {
    title: 'Welcome to Decro',
    body: 'A connected web of creative communities. Click a group to expand its niches — or enter it to post and interact.',
    cta: 'Start tour',
  },
  'click-main': {
    title: 'Expand a group',
    body: 'Click any main label near the center. Linked niches bloom around it — including bridges that belong to two crafts.',
  },
  'click-niche': {
    title: 'Go deeper or go inside',
    body: 'Click again to zoom into more linked subgroups (like Video Games → Indie / Triple-A). Double-click or hit Enter group to open the page and post.',
  },
  guest: {
    title: 'No account required',
    body: 'Upload and comment as a guest anytime. Log in is optional if you want a saved name later.',
    cta: 'Open the group',
  },
}

export const PITCH_ENTER_CTA = 'Enter the groups'

export const PITCH_HINT =
  'click to expand · double-click or Enter to go inside · bridges link two crafts · scroll to pan'

export const PITCH_EMAIL = 'helpdecro.net@gmail.com'
export const PITCH_DISCORD_HANDLES = ['rath6053', 'existsneel'] as const

/** Suggested first main group for the tour highlight. */
export const PITCH_TOUR_PARENT_ID = 'games'
