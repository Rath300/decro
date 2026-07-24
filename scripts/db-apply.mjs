#!/usr/bin/env node
// Applies SQL migration files to the database in DATABASE_URL.
//
// This exists because the production schema had drifted well ahead of
// supabase/migrations/ — tables and functions the app calls every day had been
// created by hand in the dashboard and never written down. Applying migrations
// through this script keeps the repo as the source of truth.
//
// Usage:
//   node scripts/db-apply.mjs supabase/migrations/036_security_hardening.sql
//   node scripts/db-apply.mjs --all
//
// Each file runs inside a single transaction and is recorded in
// public.schema_migrations, so re-running is a no-op.

import { readFileSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import pg from 'pg'

const MIGRATIONS_DIR = 'supabase/migrations'

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
        if (match && !process.env[match[1]]) {
          process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
        }
      }
    } catch {
      // File is optional.
    }
  }
}

function filesToApply(args) {
  if (args.includes('--all')) {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort()
      .map((f) => join(MIGRATIONS_DIR, f))
  }
  return args.filter((a) => a.endsWith('.sql'))
}

async function main() {
  loadEnv()

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Add it to .env.local.')
    process.exit(1)
  }

  const files = filesToApply(process.argv.slice(2))
  if (files.length === 0) {
    console.error('Usage: node scripts/db-apply.mjs <file.sql> [...] | --all')
    process.exit(1)
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  let applied = 0
  for (const file of files) {
    const name = basename(file)
    const { rowCount } = await client.query(
      'select 1 from public.schema_migrations where name = $1',
      [name]
    )
    if (rowCount > 0) {
      console.log(`skip   ${name} (already applied)`)
      continue
    }

    const sql = readFileSync(file, 'utf8')
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query(
        'insert into public.schema_migrations (name) values ($1)',
        [name]
      )
      await client.query('commit')
      console.log(`applied ${name}`)
      applied += 1
    } catch (error) {
      await client.query('rollback')
      console.error(`FAILED ${name}`)
      console.error(`  ${error.message}`)
      if (error.position) console.error(`  at character ${error.position}`)
      if (error.hint) console.error(`  hint: ${error.hint}`)
      await client.end()
      process.exit(1)
    }
  }

  await client.end()
  console.log(`\n${applied} migration(s) applied.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
