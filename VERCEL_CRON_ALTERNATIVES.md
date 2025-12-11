# Vercel Cron Job Fix

## Issue
Vercel Cron Jobs are **only available on Pro plans** ($20/month). The cron configuration in `vercel.json` was blocking deployment on the free Hobby tier.

## What Was Removed
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-trending",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

## The Cron Endpoint Still Exists
The endpoint `/api/cron/refresh-trending` is still available and functional. It just won't run automatically.

## Alternative Solutions

### Option 1: External Cron Service (FREE)
Use a free external service to trigger the endpoint:

**Recommended: [cron-job.org](https://cron-job.org)** (Free, reliable)
1. Sign up at https://cron-job.org
2. Create a new cron job:
   - URL: `https://your-domain.vercel.app/api/cron/refresh-trending`
   - Schedule: `*/30 * * * *` (every 30 minutes)
   - Method: GET
   - Add header: `Authorization: Bearer YOUR_CRON_SECRET`

**Alternative: [EasyCron](https://www.easycron.com/)** (Free tier: 1 job)
**Alternative: [GitHub Actions](https://github.com/features/actions)** (Free for public repos)

### Option 2: Upgrade to Vercel Pro
- Cost: $20/month
- Includes: Native cron jobs, priority support, more resources
- Just restore the `vercel.json` config

### Option 3: Manual Refresh
Manually trigger trending refresh:
```bash
curl -X POST https://your-domain.vercel.app/api/cron/refresh-trending \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Option 4: Client-Side Trigger (Not Recommended)
Add a button in your admin panel to manually refresh trending. Not ideal for production.

## Environment Variable Needed
Make sure you have this in your Vercel environment variables:
```
CRON_SECRET=your-random-secret-here
```

## Current Status
✅ **Deployment is now working** - The cron config has been removed
🔄 Trending posts won't auto-refresh until you implement one of the alternatives above
📍 The endpoint is fully functional and ready to be called

## Recommendation
**Use cron-job.org** - It's free, reliable, and takes 2 minutes to set up!
