#!/usr/bin/env node
/**
 * Build scripts/data/ubu-archive-catalog.json from UbuWeb public indexes.
 *
 * Fetches film / sound / visual-poetry index pages and keeps only:
 *   artist/title display name + outbound URL
 * Does NOT download covers, video, audio, or page bodies for republishing.
 *
 * Usage:
 *   npm run build:ubu-catalog
 *   npm run build:ubu-catalog -- --limit=400
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, 'data/ubu-archive-catalog.json')

function parseArgs(argv) {
  const out = { limit: 400 }
  for (const arg of argv) {
    if (arg.startsWith('--limit=')) out.limit = Math.max(1, Number(arg.slice(8)) || 400)
  }
  return out
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ccedil;/g, 'ç')
    .replace(/&Ccedil;/g, 'Ç')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü')
    .replace(/&auml;/g, 'ä')
    .replace(/&iacute;/g, 'í')
    .replace(/&oacute;/g, 'ó')
    .replace(/&aacute;/g, 'á')
    .replace(/&ntilde;/g, 'ñ')
    .replace(/&hellip;/g, '…')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) =>
      String.fromCharCode(parseInt(n, 16))
    )
}

function parseIndex(html) {
  const re = /href="([a-z0-9_.-]+\.html)"[^>]*>([^<]{2,100})/gi
  const out = []
  const seen = new Set()
  let m
  while ((m = re.exec(html))) {
    const href = m[1]
    if (href === 'index.html') continue
    const slug = href.replace(/\.html$/i, '')
    if (seen.has(slug)) continue
    seen.add(slug)
    let name = decodeEntities(m[2]).replace(/\s+/g, ' ').trim()
    name = name.replace(/\s*\(\d{4}.*$/, '').trim()
    if (name.length < 2 || name.length > 80) continue
    if (/^(back|home|film|sound|ubuweb|resources)$/i.test(name)) continue
    out.push({ slug, name })
  }
  return out
}

function pickSpread(arr, n) {
  if (arr.length <= n) return arr.slice()
  const out = []
  const seen = new Set()
  for (let i = 0; i < n; i++) {
    const idx = Math.floor((i * arr.length) / n)
    const item = arr[idx]
    if (seen.has(item.slug)) continue
    seen.add(item.slug)
    out.push(item)
  }
  return out
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'DecroArchiveCatalog/1.0 (index titles+urls; helpdecro.net@gmail.com)',
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.text()
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  console.log('Fetching UbuWeb public indexes (titles + links only)…')

  const [filmHtml, soundHtml, vpHtml] = await Promise.all([
    fetchText('https://www.ubu.com/film/'),
    fetchText('https://www.ubu.com/sound/'),
    fetchText('https://www.ubu.com/vp/').catch(() => ''),
  ])

  const film = parseIndex(filmHtml)
  const sound = parseIndex(soundHtml)
  const vp = vpHtml ? parseIndex(vpHtml) : []

  const filmN = Math.min(200, args.limit)
  const soundN = Math.min(150, Math.max(0, args.limit - filmN))
  const vpN = Math.min(50, Math.max(0, args.limit - filmN - soundN))

  /** @type {any[]} */
  const entries = []
  for (const a of pickSpread(film, filmN)) {
    entries.push({
      key: `ubu:film:${a.slug}`,
      title: a.name,
      artist: a.name,
      medium: 'Film & Video',
      section: 'film',
      tag: 'experimental-film',
      ubuUrl: `https://www.ubu.com/film/${a.slug}.html`,
      blurb: `${a.name}. Film and video index on UbuWeb. Text-card catalog entry. Media opens on the external archive.`,
    })
  }
  for (const a of pickSpread(sound, soundN)) {
    entries.push({
      key: `ubu:sound:${a.slug}`,
      title: a.name,
      artist: a.name,
      medium: 'Sound',
      section: 'sound',
      tag: 'sound-design',
      ubuUrl: `https://www.ubu.com/sound/${a.slug}.html`,
      blurb: `${a.name}. Sound index on UbuWeb. Text-card catalog entry. Audio opens on the external archive.`,
    })
  }
  for (const a of pickSpread(vp, vpN)) {
    entries.push({
      key: `ubu:vp:${a.slug}`,
      title: a.name,
      artist: a.name,
      medium: 'Visual Poetry',
      section: 'vp',
      tag: 'poetry',
      ubuUrl: `https://www.ubu.com/vp/${a.slug}.html`,
      blurb: `${a.name}. Visual and concrete poetry on UbuWeb. Text-card catalog entry. Documents open on the external archive.`,
    })
  }

  // Top up from film pool if under limit
  let i = 0
  while (entries.length < args.limit && i < film.length) {
    const a = film[i++]
    const key = `ubu:film:${a.slug}`
    if (entries.some((e) => e.key === key)) continue
    entries.push({
      key,
      title: a.name,
      artist: a.name,
      medium: 'Film & Video',
      section: 'film',
      tag: 'experimental-film',
      ubuUrl: `https://www.ubu.com/film/${a.slug}.html`,
      blurb: `${a.name}. Film and video index on UbuWeb. Text-card catalog entry. Media opens on the external archive.`,
    })
  }

  const final = entries.slice(0, args.limit)
  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: 'ubu.com public indexes (artist titles + page URLs only; no media)',
        counts: { film: film.length, sound: sound.length, vp: vp.length },
        count: final.length,
        entries: final,
      },
      null,
      2
    ) + '\n'
  )
  console.log(
    `Wrote ${final.length} entries → ${OUT} (pool film=${film.length} sound=${sound.length} vp=${vp.length})`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
