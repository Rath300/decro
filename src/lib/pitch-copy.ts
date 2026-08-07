export const PITCH_HEADLINE = 'DECRO'

export const PITCH_PARAGRAPHS = [
  'Decro is a place for artists, musicians, photographers, writers, and makers to find each other through shared creative communities — not just another feed of posts.',
  'Start with a few main groups, open a niche that fits your work, then leave art or a comment. The goal is tight multidisciplinary circles and real collaboration.',
  'We run the site ourselves and it isn\'t for profit. We want honest feedback on what would make this useful for you — especially things missing from Tumblr, Instagram, and similar places.',
  'You can email me at helpdecro.net@gmail.com or send a message on discord at rath6053 or existsneel. Thanks so much.',
]

export type PitchOnboardingStep = {
  title: string
  body: string
}

export const PITCH_ONBOARDING_STEPS: PitchOnboardingStep[] = [
  {
    title: 'Welcome to Decro',
    body: 'A small web of creative communities — not another algorithm feed. Find people through shared niches and collaborate.',
  },
  {
    title: 'How the groups work',
    body: 'You\'ll see a few main groups first. Click one to zoom into its niches. Click a niche to open the art in that community.',
  },
  {
    title: 'Everything works without an account',
    body: 'Upload and comment as a guest. Login is optional if you want a saved identity later — nothing here requires it.',
  },
]

export const PITCH_ENTER_CTA = 'Enter the groups'

export const PITCH_HINT =
  'click a main group to open its niches · click a niche for the art · two-finger scroll to pan · pinch or +/− to zoom'

export const PITCH_EMAIL = 'helpdecro.net@gmail.com'
export const PITCH_DISCORD_HANDLES = ['rath6053', 'existsneel'] as const
