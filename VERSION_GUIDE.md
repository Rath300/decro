# Version Guide

## Current Version: **alpha 0.02**

---

## How to Update the Version

Every time you make a change and deploy, update the version number:

### Quick Steps:
1. Open `version.json` in the root directory
2. Increment the version number
3. Update the `lastUpdated` date
4. Commit and push

### Example:

**Before:**
```json
{
  "version": "alpha 0.02",
  "lastUpdated": "2025-11-24"
}
```

**After:**
```json
{
  "version": "alpha 0.03",
  "lastUpdated": "2025-11-24"
}
```

---

## Version Numbering

### Alpha Phase (Current):
- `alpha 0.01` → `alpha 0.02` → `alpha 0.03` ... → `alpha 0.99`

### Beta Phase (Later):
- `beta 0.01` → `beta 0.02` → `beta 0.03` ... → `beta 0.99`

### Release Phase (Production):
- `v1.0` → `v1.1` → `v1.2` → `v2.0`

---

## Where Version Shows

The version number appears in the **bottom-right corner** of the site on all pages (except login/signup pages).

**Appearance:**
```
┌─────────────────────┐
│                     │
│     [Content]       │
│                     │
│          alpha 0.02 │ ← Bottom-right corner
└─────────────────────┘
```

---

## Changelog

### alpha 0.02 (2025-11-24)
- ✅ Added sign-out button (dropdown menu)
- ✅ Added version indicator
- ✅ Username uniqueness validation
- ✅ Fixed NextAuth integration
- ✅ Set favicon to decky.png

### alpha 0.01 (2025-11-24)
- Initial deployment
- NextAuth.js migration
- Basic authentication working

---

## When to Increment

**Major Features** (0.1 → 0.2):
- New authentication system
- New major feature (e.g., messaging, groups)
- Complete redesign

**Minor Features** (0.01 → 0.02):
- Sign-out button added
- New settings page
- Bug fixes
- UI improvements

**Patches** (can skip if minor):
- Typo fixes
- CSS tweaks
- Small bug fixes

---

## Auto-Update on Deploy

The version number updates automatically when:
1. You change `version.json`
2. Commit and push to GitHub
3. Vercel deploys
4. Users refresh the page

No need to restart the server - it reads from the API endpoint dynamically!

