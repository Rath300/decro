# 🚨 URGENT: Vercel Environment Variables Setup

## Critical Auth 500 Error Fix

Your site is getting 500 errors on auth endpoints because Vercel environment variables need to be configured correctly.

---

## Required Actions in Vercel Dashboard

### Step 1: Go to Vercel Project Settings
1. Visit https://vercel.com
2. Select your "decro" project
3. Click **Settings** (top menu)
4. Click **Environment Variables** (left sidebar)

### Step 2: Update/Add These Variables

**CRITICAL - Add Protocol to Site URL:**

| Variable Name | Current Value | Required Value |
|--------------|---------------|----------------|
| `NEXT_PUBLIC_SITE_URL` | `decro.net` ❌ | `https://decro.net` ✅ |

**All Required Environment Variables:**

```env
# Site Configuration (CRITICAL - Must have https://)
NEXT_PUBLIC_SITE_URL=https://decro.net

# Database (Should already be set)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Supabase (Should already be set)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Node Environment
NODE_ENV=production
```

### Step 3: Apply to All Environments
Make sure to select:
- ✅ Production
- ✅ Preview
- ✅ Development

### Step 4: Redeploy
After updating environment variables:
1. Go to **Deployments** tab
2. Click the three dots (**...**) on the latest deployment
3. Click **Redeploy**
4. OR just push a new commit (we'll do this)

---

## Why This Matters

### The Problem
```
Error: Invalid base URL: decro.net
GET /api/auth/get-session 500 (Internal Server Error)
GET /api/auth/sign-in/email 500 (Internal Server Error)
```

### The Cause
BetterAuth requires a **full URL with protocol**:
- ❌ `decro.net` (missing protocol)
- ✅ `https://decro.net` (correct format)

### What Happens Without Fix
- ❌ Cannot sign in
- ❌ Cannot sign up
- ❌ Sessions don't work
- ❌ All auth endpoints return 500

---

## Vercel-Specific Note

Vercel has a built-in `VERCEL_URL` variable, but:
- It changes with each preview deployment
- Our code falls back to it if `NEXT_PUBLIC_SITE_URL` is not set
- **You MUST set `NEXT_PUBLIC_SITE_URL` explicitly for production**

---

## Quick Fix Commands

If you have Vercel CLI installed:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Set environment variable
vercel env add NEXT_PUBLIC_SITE_URL production
# When prompted, enter: https://decro.net

# Redeploy
vercel --prod
```

---

## After Setting Environment Variables

### Verify in Vercel Dashboard
1. Go to Settings → Environment Variables
2. Check that `NEXT_PUBLIC_SITE_URL` shows `https://decro.net`
3. Make sure it's enabled for Production

### Test the Site
1. Visit https://decro.net
2. Try to sign in
3. Check browser console - should have no 500 errors
4. Auth endpoints should return 200 OK

---

## Alternative: Use Vercel System Variables

If you don't want to hardcode the domain, you can use:

```env
NEXT_PUBLIC_SITE_URL=https://$VERCEL_PROJECT_PRODUCTION_URL
```

But this is less reliable. **Recommended: Use explicit `https://decro.net`**

---

## Status Check

After fixing environment variables, verify:
- [ ] `NEXT_PUBLIC_SITE_URL=https://decro.net` (with https://)
- [ ] Database variables are set correctly
- [ ] Supabase variables are set correctly
- [ ] Redeployed after changes
- [ ] Sign in works on decro.net
- [ ] No 500 errors in console

---

## Important Notes

1. **Environment variables require a redeploy to take effect**
2. **Production variables are separate from Preview/Development**
3. **Always include protocol (https://) in URLs**
4. **Clear browser cache after redeploying**

---

**Next Step:** Update the environment variable in Vercel, then we'll push a new commit to trigger a redeploy.

