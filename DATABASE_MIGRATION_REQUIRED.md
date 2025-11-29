# 🚨 Database Migration Required (alpha 0.05)

## Critical: You must apply this migration for likes and comments to work!

The like button and comment reply functionality requires new database functions. You need to apply the migration file to your Supabase database.

---

## Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **"+ New query"**
4. Copy the contents of `supabase/migrations/020_fix_like_and_comment_functions.sql`
5. Paste into the SQL editor
6. Click **"Run"** or press `Ctrl/Cmd + Enter`
7. Verify success message appears

---

## Option 2: Using Supabase CLI

If you have Supabase CLI installed and linked to your project:

```bash
# From project root
supabase db push
```

Or manually:

```bash
supabase db execute --file supabase/migrations/020_fix_like_and_comment_functions.sql
```

---

## What This Migration Does:

### 1. **toggle_like_ext** function
- Allows liking/unliking posts using your external auth ID
- Automatically maps your NextAuth ID to Supabase profile ID
- Fixes: Like button not working on feed and feedback pages

### 2. **add_reply_ext** function
- Allows adding replies to comments using external auth ID
- Properly sets username on replies
- Fixes: Anonymous comment bug and reply hierarchy issues

### 3. **get_comment_replies_with_nesting** function
- Fetches comment replies with proper nesting
- Includes username, avatar, like count, and reply count
- Shows "replying to [username]" correctly

---

## After Applying Migration:

✅ **Like buttons will work** on feed and feedback pages
✅ **Comments will display username** instead of "anonymous"
✅ **Replies will nest properly** under parent comments
✅ **Liked posts tab will work** on profile page

---

## Verification:

After applying the migration, test:
1. Click a like button on the feed page
2. Add a comment or reply
3. Visit your profile → Liked tab
4. All should work correctly!

---

## Need Help?

If you encounter errors:
1. Check Supabase logs in the dashboard
2. Ensure your database has the `profiles`, `likes`, and `comments` tables
3. Verify your Supabase project is connected correctly

---

## Current Deployment Status:

- ✅ Code pushed to GitHub
- ✅ Vercel will auto-deploy (~5 minutes)
- ⚠️ Database migration must be applied manually
- 🎯 Once migration is applied, all features will work!

