/**
 * Zero-cost sparse token vectors for pitch-web placement.
 * Unigrams + bigrams + light stemming — no external APIs.
 */

const STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'of',
  'for',
  'in',
  'on',
  'to',
  'with',
  'by',
  'from',
  'at',
  'as',
  'is',
  'are',
  'be',
  'this',
  'that',
  'it',
  'its',
  'into',
  'new',
  'group',
  'community',
  'art',
  'arts',
  'work',
  'works',
  'made',
  'make',
  'making',
])

/** Cheap stem so photograph/photography/photos collapse. */
export function stemToken(raw: string): string {
  let t = raw.toLowerCase()
  if (t.length <= 3) return t
  if (t.endsWith('ies') && t.length > 5) t = t.slice(0, -3) + 'y'
  else if (t.endsWith('ing') && t.length > 6) t = t.slice(0, -3)
  else if (t.endsWith('ers') && t.length > 5) t = t.slice(0, -1)
  else if (t.endsWith('er') && t.length > 5) t = t.slice(0, -2)
  else if (t.endsWith('ions') && t.length > 6) t = t.slice(0, -4)
  else if (t.endsWith('ion') && t.length > 5) t = t.slice(0, -3)
  else if (t.endsWith('ies')) t = t.slice(0, -3) + 'y'
  else if (t.endsWith('es') && t.length > 4) t = t.slice(0, -2)
  else if (t.endsWith('s') && t.length > 3 && !t.endsWith('ss')) t = t.slice(0, -1)
  if (t.endsWith('y') && t.length > 4) {
    /* keep */
  }
  // photo / photograph family
  if (t.startsWith('photograph')) return 'photo'
  if (t === 'photos' || t === 'photo') return 'photo'
  return t
}

export function tokenize(text: string): string[] {
  const parts = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .split(/[\s-]+/)
    .map((p) => stemToken(p))
    .filter((p) => p.length >= 2 && !STOP.has(p))

  const out: string[] = []
  for (let i = 0; i < parts.length; i++) {
    out.push(parts[i])
    if (i + 1 < parts.length) out.push(`${parts[i]}_${parts[i + 1]}`)
  }
  return out
}

export type SparseVec = Map<string, number>

export function vectorize(text: string, extraTokens: string[] = []): SparseVec {
  const vec: SparseVec = new Map()
  const bump = (t: string, w = 1) => vec.set(t, (vec.get(t) || 0) + w)
  for (const t of tokenize(text)) bump(t, 1)
  for (const t of extraTokens) {
    for (const tok of tokenize(t)) bump(tok, 1.35)
  }
  return vec
}

export function cosine(a: SparseVec, b: SparseVec): number {
  if (!a.size || !b.size) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (const [, v] of a) na += v * v
  for (const [, v] of b) nb += v * v
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  if (!denom) return 0
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]
  for (const [k, v] of smaller) {
    const u = larger.get(k)
    if (u) dot += v * u
  }
  return dot / denom
}
