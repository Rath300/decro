#!/usr/bin/env node
/**
 * Idempotent seed of pitch-mode subgroup rooms.
 *
 * Seeds the classic genre list plus every curated taxonomy hub id (bridges,
 * mains, niches) so Enter/Upload works on every connection on the web.
 *
 * Usage:
 *   node scripts/seed-pitch-genres.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), name)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq < 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (!(key in process.env)) process.env[key] = val
    }
  }
}

loadEnv()

const GENRES = [
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
  'Letterpress',
  'Typography',
  'Poster Design',
  'Zine',
  'Book Arts',
  'Sculpture',
  'Ceramics',
  'Glass',
  'Metalwork',
  'Woodworking',
  'Textile Art',
  'Weaving',
  'Embroidery',
  'Quilt',
  'Fashion Design',
  'Costume',
  'Jewelry',
  'Installation',
  'Performance Art',
  'Video Art',
  'Experimental Film',
  'Short Film',
  'Documentary Film',
  'Animation',
  'Stop Motion',
  'Motion Graphics',
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
  'Spoken Word',
  'Poetry',
  'Essay',
  'Fiction',
  'Comics',
  'Graphic Novel',
  'Illustration',
  'Character Design',
  'Concept Art',
  '3D Render',
  'CGI',
  'Game Art',
  'Pixel Art',
  'Glitch',
  'Generative',
  'Code Art',
  'Data Viz',
  'UI Specimens',
  'Brutalist Web',
  'Archival',
  'Found Footage',
  'Photogram',
  'Scanography',
  'Macro',
  'Aerial',
  'Astrophotography',
  'Street Art',
  'Graffiti',
  'Mural',
  'Calligraphy',
  'Hand Lettering',
  'Packaging',
  'Product Shot',
  'Food Photo',
  'Dance',
  'Choreography',
  'Theater',
  'Puppetry',
  'VR Experience',
]

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const seedExternalId = 'pitch:seed'
  const { error: profileErr } = await admin.rpc('upsert_profile_from_external', {
    external_id_param: seedExternalId,
    username_param: 'decro_seed',
    full_name_param: 'Decro Seed',
  })
  if (profileErr) {
    console.error('Failed to upsert seed profile:', profileErr.message)
    process.exit(1)
  }

  // Taxonomy hub ids (bridges/mains/niches) — unique rooms for every connection.
  const TAXONOMY_HUBS = [
    ['Visual Art', 'visual-art'],
    ['Photography', 'photography'],
    ['Music', 'music'],
    ['Film', 'film'],
    ['Writing', 'writing'],
    ['Design', 'design'],
    ['Craft', 'craft'],
    ['Games', 'games'],
    ['Street Photo', 'street-photo'],
    ['Portraiture', 'portraiture'],
    ['Analog Film', 'analog-film'],
    ['Documentary Photo', 'documentary-photo'],
    ['Night Photography', 'night-photography'],
    ['Night Street', 'night-street'],
    ['Oil Painting', 'oil-painting'],
    ['Watercolor', 'watercolor'],
    ['Collage', 'collage'],
    ['Illustration', 'illustration'],
    ['Street Art', 'street-art'],
    ['Glitch', 'glitch'],
    ['Generative', 'generative'],
    ['Electronic', 'electronic'],
    ['Hip Hop', 'hip-hop'],
    ['Ambient', 'ambient'],
    ['Jazz', 'jazz'],
    ['Score', 'score'],
    ['Sound Design', 'sound-design'],
    ['Short Film', 'short-film'],
    ['Experimental Film', 'experimental-film'],
    ['Animation', 'animation'],
    ['Video Art', 'video-art'],
    ['Documentary Film', 'documentary-film'],
    ['Poetry', 'poetry'],
    ['Fiction', 'fiction'],
    ['Essay', 'essay'],
    ['Comics', 'comics'],
    ['Zine', 'zine'],
    ['Typography', 'typography'],
    ['Poster Design', 'poster-design'],
    ['Brutalist Web', 'brutalist-web'],
    ['UI Specimens', 'ui-specimens'],
    ['3D Render', '3d-render'],
    ['Ceramics', 'ceramics'],
    ['Textile Art', 'textile-art'],
    ['Sculpture', 'sculpture'],
    ['Woodworking', 'woodworking'],
    ['Video Games', 'video-games'],
    ['Indie Games', 'indie-games'],
    ['Triple-A', 'triple-a'],
    ['Game Art', 'game-art'],
    ['Pixel Art', 'pixel-art'],
    ['Character Design', 'character-design'],
    ['Album Cover', 'album-cover'],
    ['Music Video', 'music-video'],
    ['Photo Essay', 'photo-essay'],
    ['Fashion Film', 'fashion-film'],
    ['Sound Sculpture', 'sound-sculpture'],
    ['Game Soundtrack', 'game-soundtrack'],
    ['Graphic Novel', 'graphic-novel'],
  ]

  const toSeed = new Map()
  for (const name of GENRES) {
    toSeed.set(slugify(name), name)
  }
  for (const [name, slug] of TAXONOMY_HUBS) {
    if (!toSeed.has(slug)) toSeed.set(slug, name)
  }

  let created = 0
  let skipped = 0
  let failed = 0

  for (const [slug, name] of toSeed) {
    const { data: existing } = await admin
      .from('subgroups')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      skipped += 1
      continue
    }

    const { data, error } = await admin.rpc('create_subgroup_ext', {
      external_id_param: seedExternalId,
      name_param: name,
      slug_param: slug,
      description_param: null,
      cover_image_url_param: null,
    })

    if (error) {
      console.error(`Fail ${name}:`, error.message)
      failed += 1
      continue
    }
    const result = data
    if (!result?.success) {
      if (String(result?.error || '').toLowerCase().includes('taken')) {
        skipped += 1
      } else {
        console.error(`Fail ${name}:`, result?.error)
        failed += 1
      }
      continue
    }
    created += 1
    process.stdout.write('.')
  }

  console.log('')
  console.log(
    `Done. created=${created} skipped=${skipped} failed=${failed} total=${toSeed.size}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
