#!/usr/bin/env node
/**
 * Backfill pitch-web placement for existing subgroups that are not curated hubs.
 *
 * Usage:
 *   npm run place:subgroups
 *   npm run place:subgroups -- --dry-run
 *   npm run place:subgroups -- --force
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 * and migration 045 applied.
 */

import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const runner = resolve(__dirname, 'place-existing-subgroups.ts')
const args = process.argv.slice(2)

const result = spawnSync(
  'npx',
  ['--yes', 'tsx', runner, ...args],
  { stdio: 'inherit', cwd: resolve(__dirname, '..'), shell: process.platform === 'win32' }
)

process.exit(result.status ?? 1)
