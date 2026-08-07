/**
 * Backfill placement — run via: npm run place:subgroups
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { placeSubgroupOnWeb, taxonomySlugs } from '../src/lib/pitch-place'

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

const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')

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

  const curated = taxonomySlugs()
  const { data: rows, error } = await admin
    .from('subgroups')
    .select('id,name,slug,description,placed_at')
    .order('created_at', { ascending: true })
    .limit(2000)

  if (error) {
    console.error('Load subgroups failed:', error.message)
    process.exit(1)
  }

  let placed = 0
  let skipped = 0
  for (const row of rows || []) {
    if (row.slug && curated.has(row.slug)) {
      skipped++
      continue
    }
    if (row.placed_at && !force) {
      skipped++
      continue
    }
    console.log(`${dryRun ? '[dry] ' : ''}place ${row.slug} (${row.name})`)
    if (dryRun) {
      placed++
      continue
    }
    try {
      const result = await placeSubgroupOnWeb(admin, {
        id: row.id,
        name: row.name,
        description: row.description,
        slug: row.slug,
      })
      if (result) {
        console.log(
          `  -> ${result.labels.join(' + ')} depth=${result.depth}` +
            (result.lowConfidence ? ' (low confidence)' : '')
        )
        placed++
      } else {
        skipped++
      }
    } catch (e: any) {
      console.error(`  failed: ${e?.message || e}`)
    }
  }

  console.log(`Done. placed=${placed} skipped=${skipped}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
