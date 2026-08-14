#!/usr/bin/env node
/**
 * Seed Avant-Garde Archive with curated UbuWeb link posts (text cards only).
 *
 * Does NOT scrape covers or media from UbuWeb. Generates Decro SVG text cards
 * and stores outbound links in the post description.
 *
 * Usage:
 *   npm run seed:ubu-archive
 *   npm run seed:ubu-archive -- --limit=400
 *   npm run seed:ubu-archive -- --limit=50 --dry-run
 *   npm run seed:ubu-archive -- --no-verify   # skip HTTP checks (not recommended)
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env / .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'
import { buildUbuCatalog } from './data/ubu-archive-catalog.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATE_PATH = resolve(__dirname, '.seed-ubu-archive-state.json')
const BUCKET = 'media'
const HUB_SLUG = 'avant-garde-archive'
const TARGET = 400

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
  // Index-derived URLs are already live; verify is optional (slow).
  const out = { limit: TARGET, dryRun: false, verify: false }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--no-verify') out.verify = false
    else if (arg === '--verify') out.verify = true
    else if (arg.startsWith('--limit=')) {
      out.limit = Math.max(1, Number(arg.slice(8)) || TARGET)
    }
  }
  return out
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { posted: {}, failedUrls: {} }
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'))
  } catch {
    return { posted: {}, failedUrls: {} }
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

function wrapLines(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let cur = ''
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w
    if (next.length > maxChars && cur) {
      lines.push(cur)
      cur = w
      if (lines.length >= maxLines) return lines
    } else {
      cur = next
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur)
  return lines
}

/** Decro-native text card — no third-party cover art. */
function buildTextCardSvg(entry) {
  const title = escapeXml(entry.artist.toUpperCase().slice(0, 42))
  const medium = escapeXml(entry.medium.toUpperCase())
  const blurbLines = wrapLines(entry.blurb, 36, 4).map(escapeXml)
  const blurbSvg = blurbLines
    .map(
      (line, i) =>
        `<text x="48" y="${340 + i * 28}" fill="#111" font-family="ui-monospace, Space Mono, monospace" font-size="18">${line}</text>`
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
  <rect width="800" height="1000" fill="#f7f7f5"/>
  <rect x="24" y="24" width="752" height="952" fill="none" stroke="#111" stroke-width="3"/>
  <text x="48" y="80" fill="#111" font-family="ui-monospace, Space Mono, monospace" font-size="14" letter-spacing="0.12em">AVANT-GARDE ARCHIVE</text>
  <text x="48" y="120" fill="#666" font-family="ui-monospace, Space Mono, monospace" font-size="13" letter-spacing="0.08em">DECRO · TEXT CARD · EXTERNAL LINK</text>
  <line x1="48" y1="148" x2="752" y2="148" stroke="#111" stroke-width="2"/>
  <text x="48" y="220" fill="#111" font-family="ui-monospace, Space Mono, monospace" font-size="36" font-weight="700">${title}</text>
  <text x="48" y="270" fill="#111" font-family="ui-monospace, Space Mono, monospace" font-size="18">${medium}</text>
  ${blurbSvg}
  <rect x="48" y="860" width="280" height="48" fill="#111"/>
  <text x="68" y="890" fill="#fff" font-family="ui-monospace, Space Mono, monospace" font-size="16">OPEN ON UBUWEB →</text>
  <text x="48" y="940" fill="#666" font-family="ui-monospace, Space Mono, monospace" font-size="12">Decro does not host this work</text>
</svg>`
}

async function urlLooksLive(url) {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      headers: {
        'User-Agent': 'DecroArchiveCatalog/1.0 (link-check; helpdecro.net@gmail.com)',
      },
      signal: AbortSignal.timeout(12_000),
    })
    if (res.ok) return true
    // Some hosts dislike HEAD — try GET range-less lightly
    if (res.status === 405 || res.status === 403) {
      const get = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'User-Agent': 'DecroArchiveCatalog/1.0 (link-check; helpdecro.net@gmail.com)',
        },
        signal: AbortSignal.timeout(12_000),
      })
      return get.ok
    }
    return false
  } catch {
    return false
  }
}

async function ensureSubgroup(admin, externalId) {
  const { data, error } = await admin
    .from('subgroups')
    .select('id,name,slug')
    .eq('slug', HUB_SLUG)
    .maybeSingle()
  if (error) throw error
  if (data) return data

  const { data: created, error: createErr } = await admin.rpc('create_subgroup_ext', {
    external_id_param: externalId,
    name_param: 'Avant-Garde Archive',
    slug_param: HUB_SLUG,
    description_param:
      'Curated text-card index of avant-garde film, sound, and poetry. Links out to UbuWeb. Decro does not host the works.',
    cover_image_url_param: null,
  })
  if (createErr) throw createErr
  if (!created?.success) throw new Error(created?.error || 'create subgroup failed')
  return { id: created.id, name: 'Avant-Garde Archive', slug: HUB_SLUG }
}

async function uploadTextCard(admin, svg) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  const path = `pitch/ubu-archive/${Date.now()}-${randomUUID()}.png`
  const { error } = await admin.storage.from(BUCKET).upload(path, png, {
    contentType: 'image/png',
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

  const state = loadState()
  state.posted = state.posted || {}
  state.failedUrls = state.failedUrls || {}

  let subgroup
  try {
    subgroup = await ensureSubgroup(admin, seedExternalId)
  } catch (e) {
    console.error('Subgroup error:', e.message || e)
    process.exit(1)
  }

  const catalog = buildUbuCatalog()
  console.log(
    `Avant-Garde Archive seed — catalog=${catalog.length} target=${args.limit} verify=${args.verify}${args.dryRun ? ' dry-run' : ''}`
  )
  console.log(`Subgroup: ${subgroup.slug} (${subgroup.id})`)

  let created = 0
  let skipped = 0
  let failed = 0
  let dead = 0

  for (const entry of catalog) {
    if (created >= args.limit) break
    if (state.posted[entry.key]) {
      skipped += 1
      continue
    }
    if (state.failedUrls[entry.ubuUrl]) {
      dead += 1
      continue
    }

    try {
      if (args.verify) {
        const live = await urlLooksLive(entry.ubuUrl)
        if (!live) {
          state.failedUrls[entry.ubuUrl] = new Date().toISOString()
          saveState(state)
          dead += 1
          process.stdout.write('·')
          await sleep(80)
          continue
        }
      }

      if (args.dryRun) {
        console.log(`\n  [dry] ${entry.key} — ${entry.artist}`)
        created += 1
        continue
      }

      const svg = buildTextCardSvg(entry)
      const mediaUrl = await uploadTextCard(admin, svg)
      const description = [
        entry.blurb,
        '',
        `Artist: ${entry.artist}`,
        `Medium: ${entry.medium}`,
        `Open on UbuWeb: ${entry.ubuUrl}`,
        '',
        'Text-card catalog entry. Decro does not host this work. The link opens the external archive.',
      ].join('\n')

      const { data: postId, error: postErr } = await admin.rpc('create_post_ext', {
        external_id_param: seedExternalId,
        title_param: entry.artist.slice(0, 120),
        description_param: description.slice(0, 2000),
        content_type_param: 'image',
        media_url_param: mediaUrl,
        audio_url_param: null,
        video_url_param: null,
        is_curated_param: true,
        subgroup_id_param: subgroup.id,
        tags_param: ['ubuweb', 'archive-link', entry.tag, entry.section],
      })

      if (postErr || !postId) throw new Error(postErr?.message || 'create_post_ext failed')

      state.posted[entry.key] = {
        postId,
        title: entry.artist,
        ubuUrl: entry.ubuUrl,
        at: new Date().toISOString(),
      }
      saveState(state)
      created += 1
      console.log(`\n  + ${entry.artist} → ${postId}`)
      await sleep(150)
    } catch (e) {
      failed += 1
      console.error(`\n  x ${entry.key}:`, e.message || e)
    }
  }

  console.log(
    `\nDone. created=${created} skipped=${skipped} dead_links=${dead} failed=${failed} posted_total=${Object.keys(state.posted).length}`
  )
  if (created < args.limit && !args.dryRun) {
    console.log(
      `Note: only ${created}/${args.limit} live links landed. Re-run after expanding the catalog, or use --no-verify (not recommended).`
    )
  }
  console.log(`State: ${STATE_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
