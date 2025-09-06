# Better Auth Setup Guide

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings > Database
3. Copy the connection string (it looks like: `postgresql://postgres:[password]@[host]:5432/postgres`)

## 2. Environment Variables

Create a `.env.local` file in your project root with:

```env
# Database URL for Supabase
DATABASE_URL="your-supabase-connection-string-here"

# Better Auth secret (generate a random string)
BETTER_AUTH_SECRET="your-secret-key-here"
```

## 3. Database Schema

Better Auth will automatically create the necessary database tables when you first run the app.

## 4. Update Trusted Origins

In `src/lib/auth.ts`, update the `trustedOrigins` array with your actual domain:

```typescript
trustedOrigins: [
  process.env.NODE_ENV === "production" 
    ? "https://your-actual-domain.vercel.app" 
    : "http://localhost:3000"
],
```

## 5. Run the App

```bash
npm run dev
```

The authentication system is now set up with:
- ✅ Email/password sign up and sign in
- ✅ Session management
- ✅ Protected routes
- ✅ Logout functionality
- ✅ Error handling and loading states

## Features Implemented

- **Login Form**: Real authentication with error handling
- **Signup Form**: User registration with validation
- **Session Management**: Automatic session checking
- **Protected Routes**: Users must be logged in to access feed
- **Logout**: Proper session cleanup

## Next Steps

1. Set up your Supabase project
2. Add the environment variables
3. Test the authentication flow
4. Deploy to Vercel with the environment variables 

## 1. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to Settings > Database
3. Copy the connection string (it looks like: `postgresql://postgres:[password]@[host]:5432/postgres`)

## 2. Environment Variables

Create a `.env.local` file in your project root with:

```env
# Database URL for Supabase
DATABASE_URL="your-supabase-connection-string-here"

# Better Auth secret (generate a random string)
BETTER_AUTH_SECRET="your-secret-key-here"
```

## 3. Database Schema

Better Auth will automatically create the necessary database tables when you first run the app.

## 4. Update Trusted Origins

In `src/lib/auth.ts`, update the `trustedOrigins` array with your actual domain:

```typescript
trustedOrigins: [
  process.env.NODE_ENV === "production" 
    ? "https://your-actual-domain.vercel.app" 
    : "http://localhost:3000"
],
```

## 5. Run the App

```bash
npm run dev
```

The authentication system is now set up with:
- ✅ Email/password sign up and sign in
- ✅ Session management
- ✅ Protected routes
- ✅ Logout functionality
- ✅ Error handling and loading states

## Features Implemented

- **Login Form**: Real authentication with error handling
- **Signup Form**: User registration with validation
- **Session Management**: Automatic session checking
- **Protected Routes**: Users must be logged in to access feed
- **Logout**: Proper session cleanup

## Next Steps

1. Set up your Supabase project
2. Add the environment variables
3. Test the authentication flow
4. Deploy to Vercel with the environment variables 