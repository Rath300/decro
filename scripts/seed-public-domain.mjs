#!/usr/bin/env node
/**
 * Seed Decro subgroups with public-domain / open-access museum art.
 *
 * Sources (public domain / open access / CC0 only):
 *   - Art Institute of Chicago API (is_public_domain)
 *   - Cleveland Museum of Art Open Access (cc0)
 *   - Metropolitan Museum of Art Collection API (isPublicDomain)
 *
 * Usage:
 *   npm run seed:public-domain
 *   npm run seed:public-domain -- --limit=3 --dry-run
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 *
 * Idempotent: skips artworks already recorded in scripts/.seed-public-domain-state.json
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = resolve(__dirname, '.seed-public-domain-state.json')
const BUCKET = 'media'

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
  const out = { limit: 4, dryRun: false, source: 'all' }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg.startsWith('--limit=')) out.limit = Math.max(1, Number(arg.slice(8)) || 4)
    else if (arg.startsWith('--source=')) out.source = arg.slice(9)
  }
  return out
}

/** Map existing Decro genre hubs → museum search queries */
const HUB_QUERIES = [
  { slug: 'oil-painting', queries: ['oil painting', 'oil on canvas'] },
  { slug: 'watercolor', queries: ['watercolor', 'watercolour'] },
  { slug: 'ink-drawing', queries: ['ink drawing', 'pen and ink'] },
  { slug: 'charcoal', queries: ['charcoal drawing'] },
  { slug: 'printmaking', queries: ['etching', 'woodcut', 'engraving'] },
  { slug: 'sculpture', queries: ['sculpture bronze', 'marble sculpture'] },
  { slug: 'ceramics', queries: ['ceramic vase', 'porcelain'] },
  { slug: 'landscape', queries: ['landscape painting'] },
  { slug: 'portraiture', queries: ['portrait painting'] },
  { slug: 'still-life-photo', queries: ['still life painting'] },
  { slug: 'cyanotype', queries: ['cyanotype'] },
  { slug: 'collage', queries: ['collage'] },
  { slug: 'calligraphy', queries: ['calligraphy manuscript'] },
  { slug: 'textile-art', queries: ['textile', 'tapestry'] },
  { slug: 'glass', queries: ['stained glass', 'glass vase'] },
  { slug: 'metalwork', queries: ['metalwork', 'silverwork'] },
  { slug: 'woodworking', queries: ['wood carving furniture'] },
  { slug: 'book-arts', queries: ['illuminated manuscript'] },
  { slug: 'costume', queries: ['costume dress historical'] },
  { slug: 'archival', queries: ['photograph archival', 'daguerreotype'] },
  { slug: 'analog-film', queries: ['photograph gelatin silver'] },
  { slug: 'street-photo', queries: ['street scene painting'] },
]

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

async function fetchJson(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DecroPublicDomainSeeder/1.0 (helpdecro.net@gmail.com)',
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

async function downloadImage(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'DecroPublicDomainSeeder/1.0 (helpdecro.net@gmail.com)',
    },
  })
  if (!res.ok) throw new Error(`image ${res.status}`)
  const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0]
  if (!type.startsWith('image/')) throw new Error(`not an image: ${type}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 2000) throw new Error('image too small')
  if (buf.length > 12 * 1024 * 1024) throw new Error('image too large')
  const ext =
    type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : type.includes('gif') ? 'gif' : 'jpg'
  return { buf, contentType: type, ext }
}

async function searchMet(query, want) {
  const data = await fetchJson(
    `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(query)}`
  )
  const ids = data.objectIDs || []
  const out = []
  for (const id of ids.slice(0, Math.min(40, ids.length))) {
    if (out.length >= want) break
    await sleep(200)
    try {
      const obj = await fetchJson(
        `https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`
      )
      if (!obj.isPublicDomain) continue
      const imageUrl = obj.primaryImage || obj.primaryImageSmall
      if (!imageUrl) continue
      out.push({
        key: `met:${obj.objectID}`,
        title: (obj.title || 'Untitled').slice(0, 120),
        artist: obj.artistDisplayName || 'Unknown',
        date: obj.objectDate || '',
        imageUrl,
        credit: 'The Metropolitan Museum of Art (public domain)',
        sourceUrl: obj.objectURL || `https://www.metmuseum.org/art/collection/search/${obj.objectID}`,
        department: obj.department || '',
      })
    } catch {
      /* skip bad object */
    }
  }
  return out
}

async function searchAic(query, want) {
  const data = await fetchJson(
    `https://api.artic.edu/api/v1/artworks/search?q=${encodeURIComponent(query)}&query[term][is_public_domain]=true&fields=id,title,artist_display,date_display,image_id,is_public_domain,department_title&limit=${Math.min(24, want * 5)}`
  )
  const out = []
  for (const item of data.data || []) {
    if (out.length >= want) break
    if (!item.is_public_domain || !item.image_id) continue
    const imageUrl = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`
    out.push({
      key: `aic:${item.id}`,
      title: (item.title || 'Untitled').slice(0, 120),
      artist: (item.artist_display || 'Unknown').split('\n')[0],
      date: item.date_display || '',
      imageUrl,
      credit: 'Art Institute of Chicago (public domain)',
      sourceUrl: `https://www.artic.edu/artworks/${item.id}`,
      department: item.department_title || '',
    })
  }
  return out
}

async function searchCleveland(query, want) {
  const data = await fetchJson(
    `https://openaccess-api.clevelandart.org/api/artworks/?q=${encodeURIComponent(query)}&cc0=1&has_image=1&limit=${Math.min(20, want * 4)}`
  )
  const out = []
  for (const item of data.data || []) {
    if (out.length >= want) break
    const imageUrl = item.images?.web?.url || item.images?.print?.url || item.images?.full?.url
    if (!imageUrl) continue
    out.push({
      key: `cma:${item.id}`,
      title: (item.title || 'Untitled').slice(0, 120),
      artist: item.creators?.[0]?.description || item.artists?.[0] || 'Unknown',
      date: item.creation_date || '',
      imageUrl,
      credit: 'Cleveland Museum of Art (CC0)',
      sourceUrl: item.url || `https://www.clevelandart.org/art/${item.id}`,
      department: item.department || '',
    })
  }
  return out
}

async function gatherArt(query, want, source) {
  const pieces = []
  const trySource = async (name, fn) => {
    if (pieces.length >= want) return
    if (!(source === 'all' || source === name)) return
    try {
      const found = await fn(query, want - pieces.length)
      pieces.push(...found)
    } catch (e) {
      console.error(`  ${name} search failed (${query}):`, e.message || e)
    }
    await sleep(150)
  }

  // Prefer AIC + Cleveland (steadier); Met last (rate-limits hard).
  await trySource('aic', searchAic)
  await trySource('cleveland', searchCleveland)
  await trySource('met', searchMet)
  return pieces
}

async function ensureSubgroup(admin, externalId, slug) {
  const { data, error } = await admin
    .from('subgroups')
    .select('id,name,slug')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  // Create missing hub from slug
  const name = slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  const { data: created, error: createErr } = await admin.rpc('create_subgroup_ext', {
    external_id_param: externalId,
    name_param: name,
    slug_param: slug,
    description_param: `${name} — seeded public-domain hub`,
    cover_image_url_param: null,
  })
  if (createErr) throw createErr
  if (!created?.success) throw new Error(created?.error || 'create subgroup failed')
  return { id: created.id, name, slug: created.slug || slug }
}

async function uploadToStorage(admin, buf, contentType, ext) {
  const path = `pitch/public-domain/${Date.now()}-${randomUUID()}.${ext}`
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

  const seedExternalId = 'pitch:public-domain'
  const { error: profileErr } = await admin.rpc('upsert_profile_from_external', {
    external_id_param: seedExternalId,
    username_param: 'anonymous_pd',
    full_name_param: 'Public Domain',
  })
  if (profileErr) {
    console.error('Profile upsert failed:', profileErr.message)
    process.exit(1)
  }

  const state = loadState()
  state.posted = state.posted || {}

  let created = 0
  let skipped = 0
  let failed = 0

  console.log(
    `Seeding public-domain art (limit ${args.limit}/hub, source=${args.source}${args.dryRun ? ', dry-run' : ''})`
  )

  for (const hub of HUB_QUERIES) {
    let subgroup
    try {
      subgroup = await ensureSubgroup(admin, seedExternalId, hub.slug)
    } catch (e) {
      console.error(`\n[${hub.slug}] subgroup error:`, e.message || e)
      failed += 1
      continue
    }

    process.stdout.write(`\n# ${subgroup.name} (${hub.slug})\n`)

    const want = args.limit
    const pieces = []
    for (const q of hub.queries) {
      if (pieces.length >= want) break
      const found = await gatherArt(q, want - pieces.length, args.source)
      pieces.push(...found)
    }

    // Dedupe by key within this run
    const seen = new Set()
    const unique = []
    for (const p of pieces) {
      if (seen.has(p.key) || state.posted[p.key]) {
        skipped += 1
        continue
      }
      seen.add(p.key)
      unique.push(p)
      if (unique.length >= want) break
    }

    for (const art of unique) {
      try {
        if (args.dryRun) {
          console.log(`  [dry] ${art.key} — ${art.title}`)
          created += 1
          continue
        }

        const { buf, contentType, ext } = await downloadImage(art.imageUrl)
        const mediaUrl = await uploadToStorage(admin, buf, contentType, ext)

        const description = [
          art.artist && art.artist !== 'Unknown' ? `Artist: ${art.artist}` : null,
          art.date ? `Date: ${art.date}` : null,
          `${art.credit}.`,
          `Source: ${art.sourceUrl}`,
          'Seeded as public-domain / open-access reference for Decro pitch mode.',
        ]
          .filter(Boolean)
          .join('\n')

        const { data: postId, error: postErr } = await admin.rpc('create_post_ext', {
          external_id_param: seedExternalId,
          title_param: art.title,
          description_param: description,
          content_type_param: 'image',
          media_url_param: mediaUrl,
          audio_url_param: null,
          video_url_param: null,
          is_curated_param: false,
          subgroup_id_param: subgroup.id,
          tags_param: ['public-domain', hub.slug],
        })

        if (postErr || !postId) throw new Error(postErr?.message || 'create_post_ext failed')

        state.posted[art.key] = {
          postId,
          subgroup: hub.slug,
          title: art.title,
          at: new Date().toISOString(),
        }
        saveState(state)
        created += 1
        console.log(`  + ${art.key} → ${postId}`)
        await sleep(200)
      } catch (e) {
        failed += 1
        console.error(`  x ${art.key}:`, e.message || e)
      }
    }
  }

  console.log(`\nDone. created=${created} skipped=${skipped} failed=${failed}`)
  console.log(`State: ${STATE_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
