# Supabase + Better Auth Setup Guide

## 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vqlsoyteuywpuuytmnbz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbHNveXRldXl3cHV1eXRtbmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTY4MjQsImV4cCI6MjA3MDEzMjgyNH0.LsCXN-5Sq_oYwN5uO86nZrU1oMVF8gaS5fedgXZVGEw

# Database URL for Better Auth
# You need to get your database password from Supabase dashboard
DATABASE_URL=postgresql://postgres.vqlsoyteuywpuuytmnbz:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Better Auth Configuration
# Generate a random secret key (you can use: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secret-key-here-change-in-production
```

## 2. Get Your Database Password

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/vqlsoyteuywpuuytmnbz
2. Navigate to Settings > Database
3. Find your database password
4. Replace `[YOUR_PASSWORD]` in the DATABASE_URL with your actual password

## 3. Generate a Secret Key

Run this command to generate a secure secret key:
```bash
openssl rand -base64 32
```

Replace `your-secret-key-here-change-in-production` with the generated key.

## 4. Database Schema

Better Auth will automatically create the necessary tables when you first run the application. The tables include:
- `users` - User accounts
- `sessions` - User sessions
- `verification_tokens` - Email verification tokens

## 5. Test the Setup

1. Start your development server: `npm run dev`
2. Try to sign up with a new account
3. Check your Supabase dashboard to see if the user was created

## 6. Production Considerations

- Set `requireEmailVerification: true` in production
- Use environment-specific trusted origins
- Generate a new secret key for production
- Set up proper CORS settings in Supabase

## Current Status

✅ Supabase project created and active
✅ Better Auth configured with Supabase
✅ Client-side auth utilities set up
⏳ Need database password and secret key
⏳ Need to test authentication flow 

## 1. Environment Variables

Create a `.env.local` file in your project root with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://vqlsoyteuywpuuytmnbz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbHNveXRldXl3cHV1eXRtbmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NTY4MjQsImV4cCI6MjA3MDEzMjgyNH0.LsCXN-5Sq_oYwN5uO86nZrU1oMVF8gaS5fedgXZVGEw

# Database URL for Better Auth
# You need to get your database password from Supabase dashboard
DATABASE_URL=postgresql://postgres.vqlsoyteuywpuuytmnbz:[YOUR_PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Better Auth Configuration
# Generate a random secret key (you can use: openssl rand -base64 32)
BETTER_AUTH_SECRET=your-secret-key-here-change-in-production
```

## 2. Get Your Database Password

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/vqlsoyteuywpuuytmnbz
2. Navigate to Settings > Database
3. Find your database password
4. Replace `[YOUR_PASSWORD]` in the DATABASE_URL with your actual password

## 3. Generate a Secret Key

Run this command to generate a secure secret key:
```bash
openssl rand -base64 32
```

Replace `your-secret-key-here-change-in-production` with the generated key.

## 4. Database Schema

Better Auth will automatically create the necessary tables when you first run the application. The tables include:
- `users` - User accounts
- `sessions` - User sessions
- `verification_tokens` - Email verification tokens

## 5. Test the Setup

1. Start your development server: `npm run dev`
2. Try to sign up with a new account
3. Check your Supabase dashboard to see if the user was created

## 6. Production Considerations

- Set `requireEmailVerification: true` in production
- Use environment-specific trusted origins
- Generate a new secret key for production
- Set up proper CORS settings in Supabase

## Current Status

✅ Supabase project created and active
✅ Better Auth configured with Supabase
✅ Client-side auth utilities set up
⏳ Need database password and secret key
⏳ Need to test authentication flow 