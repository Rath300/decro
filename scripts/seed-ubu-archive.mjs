#!/usr/bin/env node
/**
 * Seed Avant-Garde Archive niches with interactive UbuWeb link posts.
 *
 * Text posts only (no PNG covers). Real "Open on UbuWeb" is rendered in the UI
 * from the URL in the description.
 *
 * Usage:
 *   npm run seed:ubu-archive
 *   npm run seed:ubu-archive -- --limit=400
 *   npm run seed:ubu-archive -- --limit=20 --dry-run
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildUbuCatalog } from './data/ubu-archive-catalog.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = resolve(__dirname, '.seed-ubu-archive-state.json')
const TARGET = 400

const NICHE_SLUGS = [
  'avant-garde-film',
  'avant-garde-video',
  'avant-garde-sound',
  'sound-poetry',
  'avant-garde-poetry',
  'concrete-poetry',
]

const NICHE_META = {
  'avant-garde-film': {
    name: 'Avant-Garde Film',
    description: null,
  },
  'avant-garde-video': {
    name: 'Avant-Garde Video',
    description: null,
  },
  'avant-garde-sound': {
    name: 'Avant-Garde Sound',
    description: null,
  },
  'sound-poetry': {
    name: 'Sound Poetry',
    description: null,
  },
  'avant-garde-poetry': {
    name: 'Avant-Garde Poetry',
    description: null,
  },
  'concrete-poetry': {
    name: 'Concrete Poetry',
    description: null,
  },
}

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

function parseArgs(argv) {
  const out = { limit: TARGET, dryRun: false, resetState: false }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--reset-state') out.resetState = true
    else if (arg.startsWith('--limit=')) {
      out.limit = Math.max(1, Number(arg.slice(8)) || TARGET)
    }
  }
  return out
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { posted: {} }
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  } catch {
    return { posted: {} }
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function hubForEntry(entry) {
  if (entry.hubSlug && NICHE_SLUGS.includes(entry.hubSlug)) return entry.hubSlug
  if (entry.section === 'sound') return 'avant-garde-sound'
  if (entry.section === 'vp') return 'avant-garde-poetry'
  return 'avant-garde-film'
}

async function ensureSubgroup(admin, externalId, slug) {
  const { data, error } = await admin
    .from('subgroups')
    .select('id,name,slug')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  const meta = NICHE_META[slug] || {
    name: slug,
    description: null,
  }
  const { data: created, error: createErr } = await admin.rpc('create_subgroup_ext', {
    external_id_param: externalId,
    name_param: meta.name,
    slug_param: slug,
    description_param: meta.description,
    cover_image_url_param: null,
  })
  if (createErr) throw createErr
  if (!created?.success) throw new Error(created?.error || `create subgroup failed: ${slug}`)
  return { id: created.id, name: meta.name, slug }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const seedExternalId = 'pitch:ubu-archive'
  const { error: profileErr } = await admin.rpc('upsert_profile_from_external', {
    external_id_param: seedExternalId,
    username_param: 'ubuweb_archive',
    full_name_param: 'UbuWeb Archive',
  })
  if (profileErr) {
    console.error('Profile upsert failed:', profileErr.message)
    process.exit(1)
  }

  if (args.resetState && existsSync(STATE_PATH)) {
    writeFileSync(STATE_PATH, JSON.stringify({ posted: {} }, null, 2) + '\n')
  }

  const state = loadState()
  state.posted = state.posted || {}

  /** @type {Record<string, {id:string,name:string,slug:string}>} */
  const subgroups = {}
  for (const slug of NICHE_SLUGS) {
    subgroups[slug] = await ensureSubgroup(admin, seedExternalId, slug)
  }

  const catalog = buildUbuCatalog()
  console.log(
    `Avant-Garde niches seed — catalog=${catalog.length} target=${args.limit}${args.dryRun ? ' dry-run' : ''}`
  )

  let created = 0
  let skipped = 0
  let failed = 0

  for (const entry of catalog) {
    if (created >= args.limit) break
    if (state.posted[entry.key]) {
      skipped += 1
      continue
    }

    const hubSlug = hubForEntry(entry)
    const subgroup = subgroups[hubSlug]
    if (!subgroup) {
      failed += 1
      console.error(`  x missing subgroup ${hubSlug}`)
      continue
    }

    try {
      if (args.dryRun) {
        console.log(`  [dry] ${hubSlug} · ${entry.artist}`)
        created += 1
        continue
      }

      const description = [
        entry.blurb,
        '',
        `Artist: ${entry.artist}`,
        `Medium: ${entry.medium}`,
        `Open on UbuWeb: ${entry.ubuUrl}`,
        '',
        'Decro does not host this work. The link opens the external archive.',
      ].join('\n')

      const { data: postId, error: postErr } = await admin.rpc('create_post_ext', {
        external_id_param: seedExternalId,
        title_param: entry.artist.slice(0, 120),
        description_param: description.slice(0, 2000),
        content_type_param: 'text',
        media_url_param: null,
        audio_url_param: null,
        video_url_param: null,
        is_curated_param: true,
        subgroup_id_param: subgroup.id,
        tags_param: ['ubuweb', 'archive-link', hubSlug, entry.section],
      })

      if (postErr || !postId) throw new Error(postErr?.message || 'create_post_ext failed')

      state.posted[entry.key] = {
        postId,
        title: entry.artist,
        hubSlug,
        ubuUrl: entry.ubuUrl,
        at: new Date().toISOString(),
      }
      saveState(state)
      created += 1
      console.log(`  + [${hubSlug}] ${entry.artist} → ${postId}`)
      await sleep(40)
    } catch (e) {
      failed += 1
      console.error(`  x ${entry.key}:`, e.message || e)
    }
  }

  console.log(
    `\nDone. created=${created} skipped=${skipped} failed=${failed} posted_total=${Object.keys(state.posted).length}`
  )
  console.log(`State: ${STATE_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
