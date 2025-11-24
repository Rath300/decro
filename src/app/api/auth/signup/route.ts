import { NextResponse } from "next/server"
import { Pool } from "pg"
import bcrypt from "bcryptjs"
import { nanoid } from "nanoid"

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name } = body
    
    // Username is passed as 'name' from the form
    const username = name

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, password, and username are required" },
        { status: 400 }
      )
    }

    // Validate username format (alphanumeric, underscores, hyphens only)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: "Username can only contain letters, numbers, underscores, and hyphens" },
        { status: 400 }
      )
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be between 3 and 20 characters" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await pool.query(
      'SELECT * FROM "user" WHERE email = $1',
      [email]
    )

    if (existingEmail.rows.length > 0) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      )
    }

    // Check if username is taken (case-insensitive)
    const existingUsername = await pool.query(
      'SELECT * FROM "user" WHERE LOWER(name) = LOWER($1)',
      [username]
    )

    if (existingUsername.rows.length > 0) {
      return NextResponse.json(
        { error: "Username taken" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user with username as name
    const userId = nanoid()
    await pool.query(
      'INSERT INTO "user" (id, email, name, "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, email, username, false, new Date(), new Date()]
    )

    // Create account with hashed password
    const accountId = nanoid()
    await pool.query(
      'INSERT INTO "account" (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [accountId, userId, 'credential', userId, hashedPassword, new Date(), new Date()]
    )

    return NextResponse.json(
      { 
        success: true,
        message: "User created successfully",
        user: { id: userId, email, name: username }
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    )
  }
}

