# 🚨 IMMEDIATE FIX for Sign-In Issues

## You're Getting This Error:
```
GET /api/auth/sign-up/email 500 (Internal Server Error)
Sign in failed
```

## 🔍 Diagnosis Steps

### Step 1: Check Environment Variables in Vercel

**CRITICAL:** Go to your Vercel dashboard RIGHT NOW:

1. **Visit:** https://vercel.com/dashboard
2. **Select** your "decro" project
3. **Click:** Settings (top menu)
4. **Click:** Environment Variables (left sidebar)

### Step 2: Verify These Variables Exist

You need ALL of these:

| Variable Name | Should Be Set To | Status |
|--------------|------------------|---------|
| `NEXT_PUBLIC_SITE_URL` | `https://decro.net` | ⚠️ CRITICAL |
| `DATABASE_URL` | `postgresql://...` | ⚠️ CRITICAL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | ⚠️ CRITICAL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | ⚠️ CRITICAL |

### Step 3: Check `NEXT_PUBLIC_SITE_URL` Specifically

**It MUST be exactly:**
```
https://decro.net
```

**NOT:**
- ❌ `decro.net` (missing https://)
- ❌ `http://decro.net` (wrong protocol)
- ❌ `https://www.decro.net` (don't use www)
- ❌ `https://decro.net/` (no trailing slash)

---

## 🔧 How to Fix RIGHT NOW

### Option 1: Add Missing Environment Variable

If `NEXT_PUBLIC_SITE_URL` is missing:

1. In Vercel Environment Variables page
2. Click **Add New**
3. Name: `NEXT_PUBLIC_SITE_URL`
4. Value: `https://decro.net`
5. Select environments: ✅ Production, ✅ Preview, ✅ Development
6. Click **Save**
7. **IMPORTANT:** Go to Deployments tab
8. Click **...** on latest deployment
9. Click **Redeploy**
10. Wait 5 minutes

### Option 2: Fix Existing Variable

If `NEXT_PUBLIC_SITE_URL` exists but is wrong:

1. Find it in the list
2. Click **Edit** (pencil icon)
3. Change value to: `https://decro.net`
4. Click **Save**
5. **IMPORTANT:** Go to Deployments tab
6. Click **...** on latest deployment
7. Click **Redeploy**
8. Wait 5 minutes

---

## 📊 Use Diagnostic Endpoint

After I push the next commit, visit this URL to check your environment:

```
https://decro.net/api/debug/env
```

This will show:
- ✅ Which environment variables are set
- ⚠️ Which ones are missing
- 🔍 What values they have (without showing secrets)

**Note:** This diagnostic endpoint only works if you set `DEBUG_MODE=true` in Vercel environment variables (for security).

---

## 🎯 Quick Checklist

Before redeploying, verify in Vercel:

- [ ] `NEXT_PUBLIC_SITE_URL` = `https://decro.net` (with https://)
- [ ] `DATABASE_URL` is set and starts with `postgresql://`
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set and starts with `https://`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- [ ] All variables enabled for **Production** environment
- [ ] Clicked **Save** on all changes
- [ ] Triggered a **Redeploy** from Deployments tab
- [ ] Waited 5-10 minutes for deployment to complete

---

## 🚫 About the Chrome LDB Errors

Those repeated errors:
```
IO error: .../014341.ldb: Unable to create writable file
```

These are **Chrome browser cache issues on YOUR computer**, not server errors. They're annoying but harmless.

**To fix them:**
1. Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Select "All time"
3. Check "Cached images and files" and "Cookies"
4. Click "Clear data"
5. Restart Chrome
6. Visit decro.net again

---

## ⚡ Fast Track Solution

**Copy-paste this command in your terminal:**

```bash
cd /Users/shreyansh/Downloads/decro
git commit --allow-empty -m "Trigger redeploy after env var update"
git push origin main
```

This will trigger a redeploy in Vercel, which will pick up any environment variable changes you made.

---

## 🔴 Still Not Working?

If after redeploying it still shows 500 errors:

1. **Check Vercel Deployment Logs:**
   - Go to Vercel Dashboard
   - Click **Deployments**
   - Click on the latest deployment
   - Click **View Function Logs**
   - Look for errors mentioning "DATABASE_URL" or "NEXT_PUBLIC_SITE_URL"

2. **Check Database Connection:**
   - Your `DATABASE_URL` might be wrong
   - Make sure it includes `?sslmode=require` at the end
   - Example: `postgresql://user:pass@host:5432/db?sslmode=require`

3. **Verify Domain:**
   - Make sure decro.net is actually pointing to Vercel
   - Check DNS settings
   - Vercel should show "Production" domain as decro.net

---

## 📞 What to Report Back

After trying the fixes, tell me:

1. What does the diagnostic endpoint show? (visit `/api/debug/env`)
2. What's in your Vercel Function Logs? (any error messages)
3. Screenshot of your Environment Variables page in Vercel
4. Does sign-in work after redeploying?

---

**The #1 issue right now is environment variables not being set in Vercel.** Once those are correct and you redeploy, everything should work!

