# Environment Setup for Decro

## Required Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Database Connection
DATABASE_URL=your_database_connection_string_here

# Better Auth Configuration
BETTER_AUTH_SECRET=your_secret_key_here
BETTER_AUTH_URL=http://localhost:3000

# Supabase (if using for file storage)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Database Setup

1. **PostgreSQL Database**: You need a PostgreSQL database for Better Auth
2. **Connection String**: Format: `postgresql://username:password@host:port/database`
3. **Tables**: Better Auth will automatically create the required tables

## Better Auth Configuration

1. **Secret Key**: Generate a secure random string for `BETTER_AUTH_SECRET`
2. **URL**: Set `BETTER_AUTH_URL` to your domain (localhost:3000 for development)

## Supabase Setup (Optional)

If you want to use Supabase for file storage:

1. Create a Supabase project
2. Get your project URL and anon key from the Supabase dashboard
3. Add the service role key for server-side operations

## Testing Authentication

After setting up the environment variables:

1. Run `npm run dev`
2. Navigate to `http://localhost:3000`
3. Try signing up with a new account
4. Try signing in with existing credentials
5. Verify redirect to `/feed` after successful authentication
