export type UpdateBulletKind =
  | 'Added'
  | 'Fixed'
  | 'Changed'
  | 'Improved'
  | 'Removed'

export type UpdateBullet = {
  kind: UpdateBulletKind
  text: string
}

export type UpdateEntry = {
  id: number
  date: string
  intro?: string
  bullets: UpdateBullet[]
}

/**
 * Decro's changelog — drawn straight from real commits, one entry per
 * shipped sprint. Keep entries honest; this is a record, not marketing copy.
 */
export const UPDATES: UpdateEntry[] = [
  {
    id: 1,
    date: 'Sept 6, 2025',
    intro:
      'v0.01. The first commit. Everything else builds on what shipped today.',
    bullets: [
      { kind: 'Added', text: 'authentication' },
      {
        kind: 'Added',
        text: 'the first working feed, where people can post their stuff and more',
      },
      { kind: 'Added', text: 'first true working build of the app' },
    ],
  },
  {
    id: 2,
    date: 'Oct 10, 2025',
    bullets: [
      {
        kind: 'Added',
        text: 'global header and personalized navigation menu, replacing scattered per page headers',
      },
      { kind: 'Added', text: 'full text search with tag support' },
      { kind: 'Added', text: 'profile analytics' },
      { kind: 'Added', text: 'realtime notifications' },
      { kind: 'Added', text: 'Spotlight, our curated showcase feature' },
      {
        kind: 'Fixed',
        text: 'replies now show up instantly instead of waiting on the server',
      },
      { kind: 'Fixed', text: 'a bug that was corrupting cached media' },
    ],
  },
  {
    id: 3,
    date: 'Oct 11, 2025',
    intro:
      "A full day spent on one problem: your account wasn't always correctly linked to your own posts, likes, and comments.",
    bullets: [
      {
        kind: 'Fixed',
        text: 'uploads, likes, and comments failing because your account and your content were not always properly connected behind the scenes',
      },
    ],
  },
  {
    id: 4,
    date: 'Oct 12-13, 2025',
    bullets: [
      {
        kind: 'Changed',
        text: 'built one shared post view. Feed, subgroup, and profile grids now all open the same way, with the same like, comment, and reply behavior',
      },
      { kind: 'Added', text: 'descriptions and tags now show up everywhere a post does' },
      { kind: 'Added', text: 'auto-generated cover thumbnails for video posts' },
      { kind: 'Added', text: 'cover art support for music posts' },
      {
        kind: 'Added',
        text: 'owner-only delete button, available anywhere a post can be opened',
      },
      {
        kind: 'Added',
        text: "stylized preview cards for text posts, so they don't look broken sitting in an image grid",
      },
    ],
  },
  {
    id: 5,
    date: 'Oct 19, 2025',
    bullets: [
      { kind: 'Added', text: 'text posts with a forum-style detail view' },
      { kind: 'Added', text: 'comprehensive search across posts, users, and subgroups' },
      { kind: 'Added', text: 'full notification system' },
      { kind: 'Added', text: 'proper reply nesting with "replying to" labels' },
      { kind: 'Added', text: 'post and comment editing' },
      { kind: 'Fixed', text: 'post deletion silently failing for some users' },
      { kind: 'Fixed', text: 'a wide sweep of backend issues surfaced by the new features' },
    ],
  },
  {
    id: 6,
    date: 'Oct 20-21, 2025',
    bullets: [
      {
        kind: 'Fixed',
        text: 'Spotlight creation throwing an error on save, a stubborn column-mapping bug that took several tries to fully kill',
      },
      { kind: 'Fixed', text: 'Spotlight posts not loading, subgroup post counts not updating' },
      { kind: 'Changed', text: 'renamed subgroup URLs from r/ to d/ (Decro, not Reddit)' },
      { kind: 'Added', text: 'dual view modes and clickable posts in the Spotlight detail page' },
      { kind: 'Added', text: 'proper activity tracking on the menu and history page' },
      { kind: 'Fixed', text: 'comment like persistence, heart icon state, and a notifications bug' },
      { kind: 'Removed', text: 'anonymous replies, every reply now has an owner' },
    ],
  },
  {
    id: 7,
    date: 'Nov 15, 2025',
    bullets: [
      { kind: 'Added', text: 'Decro logo! (the duck)' },
      { kind: 'Improved', text: 'comment management tools for owners and moderators' },
    ],
  },
  {
    id: 8,
    date: 'Nov 16, 2025',
    bullets: [
      {
        kind: 'Changed',
        text: 'landing page now routes straight into the feed instead of a separate splash screen',
      },
      { kind: 'Improved', text: 'header logo placement and sizing' },
    ],
  },
  {
    id: 9,
    date: 'Nov 24, 2025',
    intro:
      'v0.02 to v0.04. Our original auth provider never fully worked with our setup, and session handling kept breaking in slightly different ways. Migrated to NextAuth entirely.',
    bullets: [
      { kind: 'Changed', text: 'migrated the whole app to NextAuth' },
      {
        kind: 'Fixed',
        text: 'a batch of login errors and request mismatches that came with the old provider',
      },
      { kind: 'Added', text: 'username uniqueness validation on signup' },
      { kind: 'Added', text: 'sign out button' },
      { kind: 'Added', text: 'version badges' },
      { kind: 'Fixed', text: 'favicon not appearing correctly across sizes and platforms' },
    ],
  },
  {
    id: 10,
    date: 'Nov 29, 2025',
    bullets: [
      { kind: 'Added', text: 'every authenticated user now automatically gets a profile set up' },
      { kind: 'Fixed', text: 'permission gaps left over from the auth migration' },
      { kind: 'Fixed', text: 'a like button bug where double clicking could throw an error' },
      { kind: 'Fixed', text: 'reply nesting and a loading error affecting some pages' },
    ],
  },
  {
    id: 11,
    date: 'Dec 1, 2025',
    intro:
      'First release! v0.1. The culmination of everything built so far, finally deployed.',
    bullets: [],
  },
  {
    id: 12,
    date: 'Dec 10, 2025',
    bullets: [
      { kind: 'Improved', text: 'one failed request no longer crashes the whole page' },
      {
        kind: 'Fixed',
        text: "a deployment issue caused by a feature that needed a paid plan we weren't on",
      },
    ],
  },
  {
    id: 13,
    date: 'Dec 11, 2025',
    intro: 'v0.1.2 to v0.1.7. Our longest patch day.',
    bullets: [
      { kind: 'Fixed', text: 'header layout' },
      { kind: 'Fixed', text: 'duplicate notifications and a like notification error' },
      { kind: 'Fixed', text: 'comment reply duplication' },
      { kind: 'Added', text: 'Spotlight post delete' },
      { kind: 'Fixed', text: 'comments not showing at all, plus a liked posts loading error' },
      { kind: 'Fixed', text: 'the actual root cause of the comments outage' },
    ],
  },
  {
    id: 14,
    date: 'Dec 20, 2025',
    bullets: [
      { kind: 'Added', text: 'a full pre-release testing checklist' },
      { kind: 'Added', text: 'documentation mapping out critical user flows before wider release' },
    ],
  },
  {
    id: 15,
    date: 'Dec 31, 2025',
    intro:
      "Found on New Year's Eve and fixed the same day: new accounts could fail to get set up correctly right after signing up.",
    bullets: [
      { kind: 'Fixed', text: 'new sign-ups not getting fully set up' },
      { kind: 'Fixed', text: 'a caching issue that was interacting badly with the fix' },
    ],
  },
  {
    id: 16,
    date: 'Jan 27-29, 2026',
    bullets: [
      { kind: 'Fixed', text: 'new user profile loading errors' },
      { kind: 'Fixed', text: 'a timing bug causing errors on profile pages' },
      {
        kind: 'Added',
        text: 'collaboration network with direct messaging, the first version of user to user DMs',
      },
    ],
  },
  {
    id: 17,
    date: 'Feb 5, 2026',
    bullets: [
      {
        kind: 'Added',
        text: 'Tumblr-style quick create, rebuilt as a clean popup after testing an earlier version',
      },
      { kind: 'Removed', text: 'the trending page' },
      { kind: 'Added', text: 'clickable creator names throughout' },
      { kind: 'Fixed', text: 'profile lookup bugs from name casing and unencoded URLs' },
      { kind: 'Fixed', text: 'a white text on white background bug in light mode' },
      {
        kind: 'Changed',
        text: 'cleaned up old duplicate backend functions that were colliding with newer ones',
      },
    ],
  },
  {
    id: 18,
    date: 'Feb 24, 2026',
    bullets: [
      { kind: 'Fixed', text: 'graphic design post handling and edit permission checks' },
      { kind: 'Added', text: 'animated GIF support and playback' },
    ],
  },
  {
    id: 19,
    date: 'Mar 8, 2026',
    bullets: [
      { kind: 'Fixed', text: 'group creation was using the wrong account reference behind the scenes' },
      { kind: 'Fixed', text: 'group covers uploading to the wrong storage location' },
      { kind: 'Fixed', text: 'permissions for creating groups were not set up correctly' },
    ],
  },
  {
    id: 20,
    date: 'Mar 11, 2026',
    bullets: [
      {
        kind: 'Improved',
        text: 'navigation, profile, post detail, create, settings, and subgroup pages for small screens',
      },
      {
        kind: 'Changed',
        text: 'mobile navigation now uses icons, with Create moved somewhere easier to reach',
      },
      { kind: 'Added', text: 'custom icon set, replacing emoji placeholders across the app' },
      { kind: 'Fixed', text: 'comment duplication and layout issues, most visible on mobile' },
      { kind: 'Fixed', text: 'a change that accidentally made certain screens inaccessible on mobile' },
    ],
  },
  {
    id: 21,
    date: 'Mar 17-24, 2026',
    bullets: [
      {
        kind: 'Fixed',
        text: 'delete button visibility, now checks the real account instead of the display name, closing an edge case where name changes broke it',
      },
      {
        kind: 'Fixed',
        text: 'reply duplication, replies now only attach to their actual parent comment',
      },
      { kind: 'Fixed', text: 'comment UI showing "0" instead of just hiding empty vote counts' },
      {
        kind: 'Added',
        text: 'clicking a notification now jumps straight to the relevant comment, plus comment delete on the standalone post page',
      },
      {
        kind: 'Fixed',
        text: 'a batch of leftover permission gaps from the old auth system, including view tracking',
      },
    ],
  },
  {
    id: 22,
    date: 'May 24-29, 2026',
    bullets: [
      { kind: 'Added', text: 'like, reply, and delete on comment replies, not just top-level comments' },
      {
        kind: 'Added',
        text: "a fair exposure algorithm so the same accounts don't dominate repeat views of the feed",
      },
      { kind: 'Added', text: 'basic protection against AI scraping' },
      { kind: 'Added', text: '"Add to Spotlight" button directly from posts' },
      { kind: 'Fixed', text: 'music playback inside Spotlight' },
      { kind: 'Fixed', text: 'a bug that could block posting certain physical art pieces' },
      { kind: 'Changed', text: 'Spotlight now uses a bigger 2 column grid with larger images' },
    ],
  },
  {
    id: 23,
    date: 'Jun 8-15, 2026',
    bullets: [
      { kind: 'Added', text: 'Google Analytics' },
      {
        kind: 'Fixed',
        text: 'logged in users could get bounced off protected pages before login finished loading',
      },
      { kind: 'Changed', text: 'group cover uploads moved server-side for reliability' },
    ],
  },
  {
    id: 24,
    date: 'Jul 24-25, 2026',
    bullets: [
      {
        kind: 'Changed',
        text: 'user identity is now fully verified by the server, not just trusted from the client',
      },
      { kind: 'Changed', text: '"Connect" is now a proper friend-request flow' },
      {
        kind: 'Fixed',
        text: 'a stale cached version of the site that was still serving old, pre-security code to returning visitors',
      },
    ],
  },
  {
    id: 25,
    date: 'Aug 1, 2026',
    intro:
      'Finally moved to our more complete creative vision, becoming a map of creative groups instead of a scrolling feed.',
    bullets: [{ kind: 'Added', text: 'guest upload, no account required to post' }],
  },
  {
    id: 26,
    date: 'Aug 2, 2026',
    bullets: [
      { kind: 'Added', text: 'post author and body preview directly on the map' },
      { kind: 'Added', text: 'media playback, audio and video, right on the web' },
      { kind: 'Added', text: "slow ambient motion so the map doesn't feel static" },
      { kind: 'Added', text: 'real trackpad panning and pinch to zoom' },
      { kind: 'Fixed', text: 'label font weight for better readability at a distance' },
      { kind: 'Fixed', text: 'several rounds of pan and zoom bugs on certain browsers' },
    ],
  },
  {
    id: 27,
    date: 'Aug 4-5, 2026',
    bullets: [
      { kind: 'Added', text: 'Vercel Analytics' },
      {
        kind: 'Added',
        text: 'real public domain museum art (Art Institute of Chicago, Cleveland Museum, the Met) seeded across the web, so new visitors have something to explore on day one',
      },
    ],
  },
  {
    id: 28,
    date: 'Aug 7, 2026',
    bullets: [
      { kind: 'Changed', text: 'groups can now belong to up to two parent groups, instead of just one' },
      {
        kind: 'Added',
        text: 'an onboarding tour that walks through zoom, enter, upload, and search',
      },
      { kind: 'Added', text: 'group search and a parent picker for new communities' },
      {
        kind: 'Added',
        text: 'smarter placement so new groups land near their closest neighbors automatically',
      },
      { kind: 'Fixed', text: 'navigation dead ends where you could get stuck with no way back out' },
      { kind: 'Added', text: 'guest replies inside group rooms' },
    ],
  },
  {
    id: 29,
    date: 'Aug 9-11, 2026',
    bullets: [
      { kind: 'Improved', text: 'camera motion when zooming into a group, less jumpy, easier to follow' },
      { kind: 'Fixed', text: 'broken links pointing at groups that no longer existed' },
      { kind: 'Fixed', text: 'comment duplication, display names, and mismatched group info' },
      { kind: 'Added', text: 'guest likes' },
      { kind: 'Changed', text: 'every group on the map is now a real, enterable room, no dead ends' },
      { kind: 'Improved', text: 'comment deletes now apply instantly' },
    ],
  },
  {
    id: 30,
    date: 'Aug 12, 2026',
    bullets: [
      {
        kind: 'Improved',
        text: 'hover response time on the map, labels react immediately instead of lagging',
      },
      { kind: 'Fixed', text: 'double tap to enter reliability on trackpads and touch' },
      { kind: 'Fixed', text: 'the interactive tutorial skipping steps or running out of order' },
      { kind: 'Fixed', text: 'the "Enter" prompt not showing during the tutorial' },
    ],
  },
  {
    id: 31,
    date: 'Aug 13-14, 2026',
    bullets: [
      {
        kind: 'Added',
        text: 'a new Avant-Garde Archive hub connecting film, music, writing, and visual art, split into six niches for experimental film, sound, and poetry',
      },
      {
        kind: 'Added',
        text: 'around 400 curated links into a real public archive, with a working "Open" link on each post',
      },
      {
        kind: 'Added',
        text: 'cover art actually matched to each artist, with a clean fallback when no good photo exists',
      },
      {
        kind: 'Removed',
        text: 'an earlier batch of random stock covers that had nothing to do with the actual work',
      },
      { kind: 'Added', text: 'a live counter showing total posts, groups, and users on the site' },
    ],
  },
  {
    id: 32,
    date: 'Aug 15, 2026',
    bullets: [
      {
        kind: 'Fixed',
        text: 'the main feed was loading in the background on every page, even where it is not shown',
      },
      {
        kind: 'Fixed',
        text: 'removed a bunch of redundant background requests that were slowing down grids of posts',
      },
      {
        kind: 'Changed',
        text: 'group pages now load 24 posts at a time with a "Load more" button, instead of loading around 100 images at once',
      },
      { kind: 'Improved', text: 'visitor counting no longer hits the database on every single page view' },
      { kind: 'Fixed', text: 'a hover animation on the map that broke during this same speed pass' },
    ],
  },
]
