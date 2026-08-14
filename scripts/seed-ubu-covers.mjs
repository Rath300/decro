#!/usr/bin/env node
/**
 * Attach work-related covers to Ubu archive posts.
 *
 * 1) Openverse search for the artist name (CC0/PDM/BY/BY-SA)
 *    — require the surname in the result title
 *    — exclude museums / insects / celebrity / news junk
 * 2) If nothing usable: generate a plain name+medium cover (no fake buttons)
 *
 * Usage:
 *   npm run seed:ubu-covers
 *   npm run seed:ubu-covers -- --limit=50 --dry-run
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = resolve(__dirname, '.seed-ubu-covers-state.json')
const BUCKET = 'media'

const LICENSE = 'cc0,pdm,by,by-sa'

const EXCLUDED_SOURCES = [
  'metropolitan_museum_of_art',
  'museum_of_new_zealand_te_papa_tongarewa',
  'smithsonian_institution',
  'smithsonian_cooper_hewitt_national_design_museum',
  'smithsonian_freer_gallery_of_art_and_arthur_m_sackler_gallery',
  'smithsonian_national_museum_of_african_art',
  'smithsonian_national_museum_of_american_history',
  'smithsonian_national_museum_of_natural_history',
  'cleveland_museum_of_art',
  'rijksmuseum',
  'art_institute_of_chicago',
  'brooklyn_museum',
  'walters_art_museum',
  'national_gallery_of_art',
].join(',')

const BLOCK =
  /\b(bug|bugs|insect|beetle|spider|mosquito|wasp|hornet|ant|ants|moth|butterfly|worm|larva|cockroach|cicada|dragonfly|grasshopper|bee|caterpillar|aphid|cricket|bioblitz|christina[\s-]?aguilera|celebrity|wall drug|windows 7|metro train|lego|bambi|nara|internment|kennedy|nguyen van thieu|maga|picket|sailor|hike|timetable|oer18|slumming|schwinn|sprocket day|bondage|scepter|drug|smoking)\b/i

const MEDIUM_LABEL = {
  'avant-garde-film': 'Film',
  'avant-garde-video': 'Video',
  'avant-garde-sound': 'Sound',
  'sound-poetry': 'Sound poetry',
  'avant-garde-poetry': 'Poetry',
  'concrete-poetry': 'Concrete poetry',
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
  const out = { limit: 400, dryRun: false, resetState: false }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--reset-state') out.resetState = true
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

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function surnames(artist) {
  const cleaned = String(artist || '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/[^a-zA-Z\s'-]/g, ' ')
    .trim()
  const parts = cleaned.split(/\s+/).filter((p) => p.length > 2)
  if (!parts.length) return []
  // Prefer last token(s); keep multi-word last names
  return [parts[parts.length - 1], parts.slice(-2).join(' ')].filter(
    (v, i, a) => a.indexOf(v) === i
  )
}

function nameMatches(artist, title) {
  const t = String(title || '').toLowerCase()
  return surnames(artist).some((s) => t.includes(s.toLowerCase()))
}

async function openverseArtist(artist) {
  const params = new URLSearchParams({
    q: artist.replace(/&[a-z]+;/gi, ' ').slice(0, 80),
    license: LICENSE,
    excluded_source: EXCLUDED_SOURCES,
    page_size: '12',
    mature: 'false',
  })
  const res = await fetch(`https://api.openverse.org/v1/images/?${params}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DecroCoverSeeder/1.1 (work-related covers; helpdecro.net@gmail.com)',
    },
  })
  if (!res.ok) throw new Error(`Openverse ${res.status}`)
  return res.json()
}

function pickArtistImage(artist, results, usedIds) {
  for (const r of results || []) {
    if (!r?.id || !r?.url || usedIds[r.id]) continue
    if (!nameMatches(artist, r.title)) continue
    const blob = `${r.title || ''} ${r.creator || ''} ${r.attribution || ''}`
    if (BLOCK.test(blob)) continue
    if (/\bmuseum\b/i.test(blob) && !nameMatches(artist, r.title)) continue
    if (r.width && r.width < 350) continue
    const url = String(r.url || '')
    if (/\.svg(\?|$)/i.test(url) || /image\/svg/i.test(r.filetype || '')) continue
    if (/\.(tiff?|tif)(\?|$)/i.test(url) || /image\/tiff/i.test(r.filetype || '')) continue
    return {
      id: r.id,
      url: r.url,
      title: r.title || 'Untitled',
      creator: r.creator || 'Unknown',
      license: r.license,
      foreign: r.foreign_landing_url || r.url,
      kind: 'photo',
    }
  }
  return null
}

async function buildNameCoverPng(artist, medium) {
  const title = escapeXml(String(artist).toUpperCase().slice(0, 48))
  const med = escapeXml(String(medium || 'Archive').toUpperCase())
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <rect width="1200" height="900" fill="#111"/>
  <rect x="36" y="36" width="1128" height="828" fill="none" stroke="#f5f5f5" stroke-width="2"/>
  <text x="80" y="140" fill="#888" font-family="ui-monospace, Space Mono, monospace" font-size="22" letter-spacing="0.16em">${med}</text>
  <text x="80" y="420" fill="#f5f5f5" font-family="ui-monospace, Space Mono, monospace" font-size="54" font-weight="700">${title}</text>
  <text x="80" y="820" fill="#666" font-family="ui-monospace, Space Mono, monospace" font-size="18" letter-spacing="0.1em">DECRO ARCHIVE LINK</text>
</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DecroCoverSeeder/1.1 (helpdecro.net@gmail.com)' },
  })
  if (!res.ok) throw new Error(`download ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  const ct = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]
  let ext = 'jpg'
  if (ct.includes('png')) ext = 'png'
  else if (ct.includes('webp')) ext = 'webp'
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

function stripOldCredit(description) {
  return String(description || '')
    .replace(/\n\nCover:[\s\S]*$/i, '')
    .trim()
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

  if (args.resetState) {
    writeFileSync(STATE_PATH, JSON.stringify({ covered: {}, usedIds: {} }, null, 2) + '\n')
  }

  const state = loadState()
  state.covered = state.covered || {}
  state.usedIds = state.usedIds || {}

  const { data: posts, error } = await admin
    .from('posts')
    .select(
      'id, title, description, media_url, content_type, subgroups!inner(slug), profiles!inner(username)'
    )
    .eq('profiles.username', 'ubuweb_archive')
    .order('created_at', { ascending: true })

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  const list = posts || []
  console.log(
    `Work-related covers — posts=${list.length} target=${args.limit}${args.dryRun ? ' dry-run' : ''}`
  )

  let photoHits = 0
  let generated = 0
  let skipped = 0
  let failed = 0
  let done = 0

  for (const post of list) {
    if (done >= args.limit) break
    if (state.covered[post.id] && post.media_url) {
      skipped += 1
      continue
    }

    const artist = post.title || 'Untitled'
    const slug = post.subgroups?.slug || 'avant-garde-film'
    const medium = MEDIUM_LABEL[slug] || 'Archive'

    try {
      let img = null
      try {
        const data = await openverseArtist(artist)
        img = pickArtistImage(artist, data.results || [], state.usedIds)
        await sleep(280)
      } catch (e) {
        console.error(`  search fail ${artist}:`, e.message || e)
      }

      if (args.dryRun) {
        console.log(
          `  [dry] ${artist} ← ${img ? `photo:${img.title}` : `generated:${medium}`}`
        )
        if (img) state.usedIds[img.id] = true
        done += 1
        if (img) photoHits += 1
        else generated += 1
        continue
      }

      let mediaUrl
      let credit
      if (img) {
        try {
          const { buf, contentType, ext } = await downloadImage(img.url)
          mediaUrl = await upload(admin, buf, contentType, ext)
          credit = `Cover: ${img.title} by ${img.creator} (${String(img.license).toUpperCase()}). ${img.foreign}`
          state.usedIds[img.id] = true
          photoHits += 1
        } catch (dlErr) {
          console.error(`  photo fail ${artist}:`, dlErr.message || dlErr)
          img = null
        }
      }
      if (!img) {
        const png = await buildNameCoverPng(artist, medium)
        mediaUrl = await upload(admin, png, 'image/png', 'png')
        credit = `Cover: Decro name card for ${artist}.`
        generated += 1
      }

      const description = `${stripOldCredit(post.description)}\n\n${credit}`.slice(0, 2000)
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
        kind: img ? 'photo' : 'generated',
        openverseId: img?.id || null,
        mediaUrl,
        at: new Date().toISOString(),
      }
      saveState(state)
      done += 1
      console.log(`  + ${artist} ← ${img ? 'photo' : 'name-card'}`)
      await sleep(80)
    } catch (e) {
      failed += 1
      console.error(`  x ${artist}:`, e.message || e)
    }
  }

  console.log(
    `\nDone. assigned=${done} photos=${photoHits} name-cards=${generated} skipped=${skipped} failed=${failed}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
