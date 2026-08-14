/**
 * External archive link helpers for UbuWeb catalog posts.
 */

const UBU_URL_RE = /https?:\/\/(?:www\.)?ubu(?:web)?\.com\/[^\s)\]"'<>]+/i

export function extractUbuArchiveUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(UBU_URL_RE)
  return m ? m[0].replace(/[.,;:]+$/, '') : null
}

/** Strip the raw URL line from body copy once we render a real button. */
export function stripArchiveUrlLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => {
      const t = line.trim()
      if (!t) return true
      if (/^open on ubuweb:/i.test(t)) return false
      if (UBU_URL_RE.test(t) && t.replace(UBU_URL_RE, '').trim().length < 8) return false
      return true
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function isArchiveLinkPost(opts: {
  contentType?: string | null
  description?: string | null
  mediaUrl?: string | null
}): boolean {
  if (extractUbuArchiveUrl(opts.description)) return true
  if (opts.contentType === 'text' && /ubuweb|external archive/i.test(opts.description || '')) {
    return true
  }
  return false
}
