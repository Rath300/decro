#!/usr/bin/env node
/**
 * Attach niche CC0/PDM cover photos to UbuWeb archive posts via Openverse.
 *
 * Strategy: Flickr-first, CC0/PDM only, obscure material/texture queries —
 * NOT artist portraits, museum paintings, or famous artworks.
 *
 * Usage:
 *   npm run seed:ubu-covers
 *   npm run seed:ubu-covers -- --limit=20 --dry-run
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID, createHash } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = resolve(__dirname, '.seed-ubu-covers-state.json')
const BUCKET = 'media'

/** Prefer indie photo dumps over institutional collections */
const SOURCE = 'flickr'
const LICENSE = 'cc0,pdm'

/** Niche / lowkey queries — textures, tools, ephemera (not famous works) */
const QUERIES = {
  'avant-garde-film': [
    'super 8 film',
    '16mm film reel',
    'film sprocket',
    'broken projector',
    'film strip',
    'dirty film',
    'old movie camera',
    'film leader',
    'darkroom negatives',
    'celluloid',
    '8mm camera',
    'projector bulb',
    'film canister',
    'editing splicer',
    'light leak film',
  ],
  'avant-garde-video': [
    'crt television',
    'vhs tape',
    'camcorder',
    'glitch screen',
    'broken tv',
    'video cassette',
    'scan lines',
    'old monitor',
    'analog mixer',
    'tracking error',
    'static noise tv',
    'portable tv',
    'video head',
    'rf modulator',
    'closed circuit camera',
  ],
  'avant-garde-sound': [
    'reel to reel',
    'cassette tape',
    'modular synth',
    'oscilloscope',
    'contact mic',
    'tape loop',
    'field recorder',
    'patch cables',
    'speaker cone',
    'magnetic tape',
    'minidisc',
    'guitar pedalboard',
    'mixing desk knobs',
    'ribbon microphone',
    'shortwave radio',
  ],
  'sound-poetry': [
    'microphone closeup',
    'dictaphone',
    'sound booth',
    'megaphone',
    'mic stand',
    'handheld recorder',
    'loudspeaker',
    'pa system',
    'voice memo',
    'throat mic',
    'studio pop filter',
    'broadcast mic',
    'cassette walkman',
    'answering machine',
    'telephone handset',
  ],
  'avant-garde-poetry': [
    'typewriter keys',
    'manuscript page',
    'notebook scribble',
    'carbon paper',
    'mimeograph',
    'handwritten draft',
    'ink blot',
    'old notebook',
    'pencil shavings',
    'stapled pages',
    'fountain pen',
    'index cards',
    'legal pad',
    'erased writing',
    'desk clutter papers',
  ],
  'concrete-poetry': [
    'letterpress',
    'scattered letters',
    'xerox texture',
    'typography scraps',
    'rubber stamp',
    'cut newspaper',
    'stencil letters',
    'printer trash',
    'paper scraps',
    'movable type',
    'linotype',
    'ink roller',
    'proof sheet',
    'wood type',
    'screen print mesh',
  ],
}

const FAMOUS_BLOCK =
  /\b(mona lisa|van gogh|picasso|warhol|rembrandt|monet|met museum|louvre|tate|guggenheim|moma|smithsonian|rijksmuseum|starry night|guernica|marilyn)\b/i

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
  const out = { limit: 400, dryRun: false }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg.startsWith('--limit=')) {
      out.limit = Math.max(1, Number(arg.slice(8)) || 400)
    }
  }
  return out
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { covered: {}, usedIds: {} }
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  } catch {
    return { covered: {}, usedIds: {} }
  }
}

function saveState(state) {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function hashPick(key, n) {
  if (n <= 0) return 0
  const h = createHash('sha256').update(String(key)).digest()
  return h.readUInt32BE(0) % n
}

async function openverseSearch(q, page = 1) {
  const params = new URLSearchParams({
    q,
    license: LICENSE,
    source: SOURCE,
    page_size: '20',
    page: String(page),
    mature: 'false',
  })
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DecroCoverSeeder/1.0 (niche CC0 covers; helpdecro.net@gmail.com)',
    },
  })
  if (!res.ok) throw new Error(`Openverse ${res.status} for ${q}`)
  return res.json()
}

function acceptResult(r) {
  if (!r?.id || !r?.url) return false
  if (!['cc0', 'pdm'].includes(String(r.license || '').toLowerCase())) return false
  if (String(r.source || '').toLowerCase() !== 'flickr') return false
  const blob = `${r.title || ''} ${r.creator || ''} ${r.attribution || ''}`
  if (FAMOUS_BLOCK.test(blob)) return false
  // Skip huge panoramic / tiny icons
  if (r.width && r.width < 400) return false
  return true
}

async function gatherPool(slug, want) {
  const queries = QUERIES[slug] || QUERIES['avant-garde-film']
  const pool = []
  const seen = new Set()

  for (const q of queries) {
    if (pool.length >= want) break
    for (const page of [1, 2, 3]) {
      if (pool.length >= want) break
      try {
        const data = await openverseSearch(q, page)
        for (const r of data.results || []) {
          if (!acceptResult(r) || seen.has(r.id)) continue
          seen.add(r.id)
          pool.push({
            id: r.id,
            url: r.url,
            title: r.title || 'Untitled',
            creator: r.creator || 'Unknown',
            license: r.license,
            foreign: r.foreign_landing_url || r.url,
            query: q,
          })
          if (pool.length >= want) break
        }
      } catch (e) {
        console.error(`  search fail [${slug}] ${q}:`, e.message || e)
      }
      await sleep(350)
    }
  }
  return pool
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'DecroCoverSeeder/1.0 (helpdecro.net@gmail.com)',
    },
  })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]
  let ext = 'jpg'
  if (ct.includes('png')) ext = 'png'
  else if (ct.includes('webp')) ext = 'webp'
  else if (ct.includes('gif')) ext = 'gif'
  return { buf, contentType: ct.startsWith('image/') ? ct : 'image/jpeg', ext }
}

async function upload(admin, buf, contentType, ext) {
  const path = `pitch/ubu-covers/${Date.now()}-${randomUUID()}.${ext}`
  const { error } = await admin.storage.from(BUCKET).upload(path, buf, {
    contentType,
    upsert: false,
    cacheControl: '31536000',
  })
  if (error) throw error
  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET).getPublicUrl(path)
  return publicUrl
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

  const state = loadState()
  state.covered = state.covered || {}
  state.usedIds = state.usedIds || {}

  const { data: posts, error } = await admin
    .from('posts')
    .select(
      'id, title, media_url, content_type, subgroup_id, subgroups!inner(slug), profiles!inner(username)'
    )
    .eq('profiles.username', 'ubuweb_archive')
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const list = (posts || []).filter((p) => {
    const slug = p.subgroups?.slug
    return slug && QUERIES[slug]
  })

  console.log(
    `Ubu covers — candidates=${list.length} target=${args.limit}${args.dryRun ? ' dry-run' : ''}`
  )

  /** @type {Record<string, any[]>} */
  const pools = {}
  for (const slug of Object.keys(QUERIES)) {
    const need = list.filter((p) => p.subgroups?.slug === slug).length + 20
    console.log(`\n# pool ${slug} (need ~${need})`)
    pools[slug] = await gatherPool(slug, Math.min(Math.max(need, 40), 180))
    console.log(`  got ${pools[slug].length}`)
  }

  let created = 0
  let skipped = 0
  let failed = 0

  for (const post of list) {
    if (created >= args.limit) break
    if (state.covered[post.id]) {
      skipped += 1
      continue
    }
    if (post.media_url) {
      skipped += 1
      continue
    }

    const slug = post.subgroups.slug
    const pool = (pools[slug] || []).filter((img) => !state.usedIds[img.id])
    if (!pool.length) {
      failed += 1
      console.error(`  x ${post.title}: empty pool for ${slug}`)
      continue
    }

    const img = pool[hashPick(post.id, pool.length)]
    try {
      if (args.dryRun) {
        console.log(`  [dry] ${slug} · ${post.title} ← ${img.title} (${img.query})`)
        state.usedIds[img.id] = true
        created += 1
        continue
      }

      const { buf, contentType, ext } = await downloadImage(img.url)
      const mediaUrl = await upload(admin, buf, contentType, ext)

      const credit = `Cover: ${img.title} by ${img.creator} (${String(img.license).toUpperCase()}). ${img.foreign}`

      // Keep archive body; append credit quietly
      const { data: full } = await admin
        .from('posts')
        .select('description')
        .eq('id', post.id)
        .maybeSingle()

      let description = full?.description || ''
      if (!/Cover:/i.test(description)) {
        description = `${description}\n\n${credit}`.slice(0, 2000)
      }

      const { error: upErr } = await admin
        .from('posts')
        .update({
          media_url: mediaUrl,
          content_type: 'image',
          description,
        })
        .eq('id', post.id)

      if (upErr) throw upErr

      state.covered[post.id] = {
        openverseId: img.id,
        mediaUrl,
        query: img.query,
        at: new Date().toISOString(),
      }
      state.usedIds[img.id] = true
      saveState(state)
      created += 1
      console.log(`  + ${post.title} ← ${img.query}`)
      await sleep(120)
    } catch (e) {
      failed += 1
      console.error(`  x ${post.title}:`, e.message || e)
    }
  }

  console.log(
    `\nDone. covered=${created} skipped=${skipped} failed=${failed} total_state=${Object.keys(state.covered).length}`
  )
  console.log(`State: ${STATE_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
