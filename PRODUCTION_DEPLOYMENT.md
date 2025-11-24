# Production Deployment Guide for Decro.net

## Pre-Deployment Checklist

### 1. Environment Variables
Ensure all environment variables are set in your production environment (Vercel/Netlify/etc.):

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Site Configuration (CRITICAL)
NEXT_PUBLIC_SITE_URL=https://decro.net
NODE_ENV=production

# Optional: Vercel specific
VERCEL_URL=decro.net
```

---

## Deployment Steps

### Step 1: Build and Test Locally
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Test production build locally
npm start

# Visit http://localhost:3000 to verify
```

### Step 2: Commit Changes
```bash
# Check what changed
git status

# Add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Auth flow, grid layout, curated tags, image loading, reply functionality"

# Push to main branch
git push origin main
```

### Step 3: Deploy to Production
If using Vercel:
```bash
# Deploy to production
vercel --prod

# Or let automatic deployment handle it
# (if you have GitHub integration)
```

### Step 4: Verify Domain Configuration
1. Ensure `decro.net` points to your hosting provider
2. Ensure SSL certificate is active
3. Check both `www.decro.net` and `decro.net` work
4. Verify DNS propagation

---

## Post-Deployment Verification

### Critical Tests

#### 1. Authentication Flow
```
✓ Visit https://decro.net
✓ Should show login form (not redirect loop)
✓ Sign in with test account
✓ Should redirect to /feed after login
✓ Check that session persists on refresh
✓ Click "Sign In" link - should go to login/signup page
```

#### 2. Feed Display
```
✓ Feed shows 8-10 images (4 columns max)
✓ No "Curated" button visible
✓ Images load correctly
✓ Broken images show "Image unavailable"
✓ Scroll down - lazy loading works
```

#### 3. Navigation
```
✓ Header tabs align with Sign In link
✓ All text uses same font and size
✓ Menu button matches navigation style
```

#### 4. Comments & Replies
```
✓ Add a comment - should appear immediately
✓ Click reply on a comment
✓ Type reply and press Enter - should submit
✓ Empty reply button is disabled
✓ Vote on comments works
```

#### 5. Images & Media
```
✓ Upload new post with image
✓ Image appears in feed
✓ Click image - opens detail modal
✓ Video posts show play button
```

---

## Troubleshooting

### Issue: Auth Session 500 Errors
**Symptoms:** Can't log in, session errors in console

**Solutions:**
1. Verify `DATABASE_URL` is correct and accessible
2. Check SSL configuration in database connection string
3. Verify `NEXT_PUBLIC_SITE_URL=https://decro.net` is set
4. Check that `decro.net` is in trustedOrigins (already in code)
5. Clear cookies and try again

### Issue: Images Not Loading
**Symptoms:** Images show "Image unavailable"

**Solutions:**
1. Check Supabase Storage is set up correctly
2. Verify bucket permissions (should be public for 'media' bucket)
3. Check CORS settings in Supabase Storage:
   ```
   Allowed origins: https://decro.net, https://www.decro.net
   ```
4. Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
5. Check image URLs in database contain full Supabase CDN URLs

### Issue: Login Redirect Loop
**Symptoms:** Keeps redirecting between / and /feed

**Solution:**
This should be fixed now. If it still happens:
1. Clear browser cache and cookies
2. Verify the new `page.tsx` is deployed
3. Check middleware isn't blocking authenticated requests

### Issue: Curated Tags Still Showing
**Symptoms:** Yellow "CURATED" badges visible

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear Next.js build cache: `rm -rf .next && npm run build`
3. Verify feed-page.tsx changes are deployed

### Issue: Chrome LDB Error
**Symptoms:** `IO error: .../014341.ldb: Unable to create writable file`

**Solution:**
This is a Chrome browser issue, not a code issue:
1. Clear Chrome cache and cookies
2. Try incognito mode
3. Check available disk space
4. Restart Chrome
5. Try different browser to confirm issue is Chrome-specific

---

## Performance Monitoring

### Key Metrics to Watch

1. **Page Load Time**
   - Target: < 3 seconds
   - Check: https://pagespeed.web.dev/

2. **Auth Response Time**
   - Target: < 500ms for session check
   - Monitor: Network tab, /api/auth/get-session

3. **Image Load Time**
   - Target: < 2 seconds
   - Supabase CDN should be fast

4. **Database Query Performance**
   - Target: < 300ms for post fetching
   - Monitor slow query logs

### Recommended Monitoring Tools
- Vercel Analytics (if using Vercel)
- Sentry for error tracking
- LogRocket for user session replay
- Supabase Dashboard for database metrics

---

## Backup & Rollback Plan

### Backup Current Production
Before deploying:
```bash
# Tag current production version
git tag -a v1.0-pre-fixes -m "Production before optimization fixes"
git push origin v1.0-pre-fixes
```

### Rollback if Needed
```bash
# Rollback to previous version
git revert HEAD
git push origin main

# Or rollback to specific tag
git checkout v1.0-pre-fixes
git push origin main --force

# In Vercel: Go to Deployments > Previous deployment > Promote to Production
```

---

## Database Considerations

### No Migrations Needed
All changes are frontend/configuration only. No database schema changes required.

### Existing Data
- All existing posts, comments, users remain unchanged
- `is_curated` column can stay in database (just not displayed)
- No data cleanup needed

---

## SSL/TLS Certificate

Ensure your SSL certificate is valid:
```bash
# Check certificate
curl -vI https://decro.net

# Look for:
# - Valid certificate
# - Not expired
# - Issued to decro.net
```

If using Vercel/Netlify, SSL is automatic. Otherwise:
1. Use Let's Encrypt (free)
2. Configure in your hosting provider
3. Force HTTPS redirect

---

## Final Checklist

Before marking deployment as complete:

- [ ] All environment variables set
- [ ] Build completes without errors
- [ ] No linter errors
- [ ] Production URL accessible (decro.net)
- [ ] SSL certificate active
- [ ] Login/signup works
- [ ] Feed displays correctly (8-10 images)
- [ ] Images load properly
- [ ] Comments and replies work
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Cross-browser tested (Chrome, Safari, Firefox)
- [ ] Performance acceptable (<3s page load)
- [ ] Error monitoring setup (optional but recommended)

---

## Support & Maintenance

### Regular Maintenance Tasks
1. **Weekly:** Check error logs for issues
2. **Monthly:** Review performance metrics
3. **Quarterly:** Update dependencies
4. **As Needed:** Database backup verification

### Getting Help
If issues persist:
1. Check server logs
2. Review browser console errors
3. Test in incognito mode
4. Check Supabase dashboard for database issues
5. Verify all environment variables are correct

---

## Success Metrics

After deployment, these should be true:
- ✅ Zero authentication redirect loops
- ✅ Clean, uncluttered feed display
- ✅ Fast image loading with graceful errors
- ✅ Smooth comment/reply interactions
- ✅ Consistent navigation styling
- ✅ No curated tag clutter
- ✅ Happy users 🎉

---

## Next Steps After Launch

1. Monitor user feedback
2. Track error rates
3. Measure engagement metrics
4. Plan next feature iteration
5. Consider A/B testing new layouts

---

**Deployment Date:** November 24, 2025  
**Version:** 2.0 (Post-Optimization)  
**Status:** Ready for Production ✅

