// Prompts for the Postgres password, writes it into DATABASE_URL in .env, and
// verifies it actually connects before keeping the change.
//
// Reads the password from a TTY prompt rather than argv or an env var so it does
// not land in shell history or the process list, and percent-encodes it because
// Supabase-generated passwords contain characters that would otherwise terminate
// the connection URL early.
//
// Usage: node scripts/set-db-password.mjs

import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import pg from 'pg'

const ENV_FILE = '.env'

function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  // Suppress echo so the password is not visible on screen or in a screenshot.
  const stdout = process.stdout
  let muted = false
  const write = stdout.write.bind(stdout)
  stdout.write = (chunk, ...rest) =>
    muted ? true : write(chunk, ...rest)

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      stdout.write = write
      stdout.write('\n')
      rl.close()
      resolve(answer.trim())
    })
    muted = true
  })
}

const password = await prompt('New Postgres password: ')

if (!password) {
  console.error('No password entered; nothing changed.')
  process.exit(1)
}

const original = readFileSync(ENV_FILE, 'utf8')
const match = original.match(/^DATABASE_URL=(.*)$/m)

if (!match) {
  console.error(`No DATABASE_URL line found in ${ENV_FILE}.`)
  process.exit(1)
}

const url = new URL(match[1].trim())
url.password = encodeURIComponent(password)

const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

try {
  const { rows } = await pool.query(
    'select current_user, (select count(*) from "user") as users'
  )
  console.log(
    `connected as ${rows[0].current_user} (${rows[0].users} users) - writing ${ENV_FILE}`
  )
} catch (error) {
  console.error(`connection failed, ${ENV_FILE} left unchanged: ${error.message}`)
  await pool.end().catch(() => {})
  process.exit(1)
} finally {
  await pool.end().catch(() => {})
}

writeFileSync(
  ENV_FILE,
  original.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${url.toString()}`)
)

console.log('done')
