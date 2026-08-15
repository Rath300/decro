#!/usr/bin/env node
/**
 * Post images from public/downloads (+ downloads 2) into matching subgroups
 * as the anonymous author (displays as the anonymous tag).
 *
 * Usage:
 *   npm run seed:downloads
 *   npm run seed:downloads -- --limit=20 --dry-run
 *   npm run seed:downloads -- --concurrency=4
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs'
import { resolve, dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const STATE_PATH = resolve(__dirname, '.seed-downloads-anonymous-state.json')
const BUCKET = 'media'
const IMG_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])

/** Folder name (lowercase) → subgroup display name when they differ */
const FOLDER_ALIAS = {
  'antique photos renniasance': 'Archival',
  'art & design': 'Design',
  bsgroup: 'Visual Art',
}

const SKIP_FOLDERS = new Set([
  'whimsicalgoth',
  'whimsicalgoths',
])

function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(ROOT, name)
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
  const out = { limit: Infinity, dryRun: false, concurrency: 4, resetState: false }
  for (const arg of argv) {
    if (arg === '--dry-run') out.dryRun = true
    else if (arg === '--reset-state') out.resetState = true
    else if (arg.startsWith('--limit='))
      out.limit = Math.max(1, Number(arg.slice(8)) || 1)
    else if (arg.startsWith('--concurrency='))
      out.concurrency = Math.min(8, Math.max(1, Number(arg.slice(14)) || 4))
  }
  return out
}

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
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

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = false
      } else cur += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      out.push(cur)
      cur = ''
    } else cur += c
  }
  out.push(cur)
  return out
}

function loadAttributions(dir) {
  const path = join(dir, '_attributions.csv')
  /** @type {Map<string, {title?:string, creator?:string, attribution?:string, license?:string, foreign?:string}>} */
  const map = new Map()
  if (!existsSync(path)) return map
  const text = readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return map
  const headers = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase())
  const idx = (name) => headers.indexOf(name)
  const iFile = idx('filename')
  const iTitle = idx('title')
  const iCreator = idx('creator')
  const iAttr = idx('attribution')
  const iLic = idx('license')
  const iForeign = idx('foreign_landing_url')
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i])
    const filename = cols[iFile]
    if (!filename) continue
    map.set(filename, {
      title: iTitle >= 0 ? cols[iTitle] : undefined,
      creator: iCreator >= 0 ? cols[iCreator] : undefined,
      attribution: iAttr >= 0 ? cols[iAttr] : undefined,
      license: iLic >= 0 ? cols[iLic] : undefined,
      foreign: iForeign >= 0 ? cols[iForeign] : undefined,
    })
  }
  return map
}

function titleFromFilename(filename) {
  return basename(filename, extname(filename))
    .replace(/_[a-f0-9]{8}$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120) || 'Untitled'
}

function collectJobs() {
  const roots = [
    join(ROOT, 'public', 'downloads'),
    join(ROOT, 'public', 'downloads 2'),
  ]
  /** @type {{key:string, filePath:string, folder:string, targetName:string, filename:string, attr:any}[]} */
  const jobs = []

  for (const root of roots) {
    if (!existsSync(root)) continue
    for (const folder of readdirSync(root)) {
      const dir = join(root, folder)
      if (!statSync(dir).isDirectory() || folder.startsWith('.')) continue
      if (SKIP_FOLDERS.has(folder.toLowerCase())) continue

      const targetName = FOLDER_ALIAS[folder.toLowerCase()] || folder
      const attrs = loadAttributions(dir)

      for (const filename of readdirSync(dir)) {
        const ext = extname(filename).toLowerCase()
        if (!IMG_EXT.has(ext)) continue
        const filePath = join(dir, filename)
        const key = `${slugify(targetName)}/${filename}`
        jobs.push({
          key,
          filePath,
          folder,
          targetName,
          filename,
          attr: attrs.get(filename) || null,
        })
      }
    }
  }
  return jobs
}

async function ensureSubgroup(admin, externalId, name) {
  const slug = slugify(name)
  const { data: existing } = await admin
    .from('subgroups')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) return existing

  const { data: byName } = await admin
    .from('subgroups')
    .select('id, name, slug')
    .ilike('name', name)
    .maybeSingle()
  if (byName) return byName

  const { data: created, error } = await admin.rpc('create_subgroup_ext', {
    external_id_param: externalId,
    name_param: name,
    slug_param: slug,
    description_param: null,
    cover_image_url_param: null,
  })
  if (error) throw error
  if (!created?.success) throw new Error(created?.error || `create subgroup failed: ${slug}`)
  return { id: created.id, name, slug: created.slug || slug }
}

async function prepareImage(filePath) {
  const input = readFileSync(filePath)
  const img = sharp(input, { failOn: 'none' }).rotate()
  const meta = await img.metadata()
  const maxEdge = 1800
  let pipeline = img
  if ((meta.width || 0) > maxEdge || (meta.height || 0) > maxEdge) {
    pipeline = pipeline.resize({
      width: maxEdge,
      height: maxEdge,
      fit: 'inside',
      withoutEnlargement: true,
    })
  }
  const hasAlpha = Boolean(meta.hasAlpha)
  if (hasAlpha) {
    const buf = await pipeline.png({ compressionLevel: 8 }).toBuffer()
    return { buf, contentType: 'image/png', ext: 'png' }
  }
  const buf = await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer()
  return { buf, contentType: 'image/jpeg', ext: 'jpg' }
}

async function upload(admin, buf, contentType, ext) {
  const path = `pitch/downloads/${Date.now()}-${randomUUID()}.${ext}`
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

async function mapPool(items, concurrency, fn) {
  let i = 0
  const workers = Array.from({ length: concurrency }, async () => {
    while (i < items.length) {
      const idx = i++
      await fn(items[idx], idx)
    }
  })
  await Promise.all(workers)
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

  // Username "anonymous" so the UI shows the anonymous tag (not a profile link).
  const seedExternalId = 'pitch:anonymous-downloads'
  const { error: profileErr } = await admin.rpc('upsert_profile_from_external', {
    external_id_param: seedExternalId,
    username_param: 'anonymous',
    full_name_param: 'anonymous',
  })
  if (profileErr) {
    console.error('Profile upsert failed:', profileErr.message)
    process.exit(1)
  }

  if (args.resetState) {
    writeFileSync(STATE_PATH, JSON.stringify({ posted: {} }, null, 2) + '\n')
  }

  const state = loadState()
  state.posted = state.posted || {}

  const allJobs = collectJobs()
  const pending = []
  for (const job of allJobs) {
    if (state.posted[job.key]) continue
    pending.push(job)
    if (pending.length >= args.limit) break
  }

  console.log(
    `Anonymous downloads seed — files=${allJobs.length} pending=${pending.length} concurrency=${args.concurrency}${args.dryRun ? ' dry-run' : ''}`
  )

  /** @type {Map<string, {id:string,name:string,slug:string}>} */
  const subgroupCache = new Map()
  async function subgroupFor(name) {
    if (subgroupCache.has(name)) return subgroupCache.get(name)
    const sg = await ensureSubgroup(admin, seedExternalId, name)
    subgroupCache.set(name, sg)
    return sg
  }

  let created = 0
  let failed = 0
  let skipped = allJobs.length - pending.length
  const saveEvery = 10

  await mapPool(pending, args.dryRun ? 1 : args.concurrency, async (job) => {
    try {
      const subgroup = await subgroupFor(job.targetName)

      if (args.dryRun) {
        console.log(`  [dry] ${subgroup.slug} ← ${job.filename}`)
        created += 1
        return
      }

      const { buf, contentType, ext } = await prepareImage(job.filePath)
      const mediaUrl = await upload(admin, buf, contentType, ext)

      const title = (job.attr?.title || titleFromFilename(job.filename)).slice(0, 200)
      const description = [
        job.attr?.creator ? `Creator: ${job.attr.creator}` : null,
        job.attr?.attribution || null,
        job.attr?.foreign ? `Source: ${job.attr.foreign}` : null,
      ]
        .filter(Boolean)
        .join('\n')
        .slice(0, 2000)

      const { data: postId, error: postErr } = await admin.rpc('create_post_ext', {
        external_id_param: seedExternalId,
        title_param: title,
        description_param: description || null,
        content_type_param: 'image',
        media_url_param: mediaUrl,
        audio_url_param: null,
        video_url_param: null,
        is_curated_param: false,
        subgroup_id_param: subgroup.id,
        tags_param: [subgroup.slug, 'open-image'],
      })

      if (postErr || !postId) throw new Error(postErr?.message || 'create_post_ext failed')

      state.posted[job.key] = {
        postId,
        subgroup: subgroup.slug,
        at: new Date().toISOString(),
      }
      created += 1
      if (created % saveEvery === 0) saveState(state)
      if (created % 25 === 0 || created === pending.length) {
        console.log(`  … ${created}/${pending.length} (+${failed} failed)`)
      }
    } catch (e) {
      failed += 1
      console.error(`  x ${job.key}:`, e.message || e)
    }
  })

  saveState(state)
  console.log(
    `\nDone. created=${created} skipped=${skipped} failed=${failed} posted_total=${Object.keys(state.posted).length}`
  )
  console.log(`State: ${STATE_PATH}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
