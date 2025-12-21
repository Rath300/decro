# Pre-Release Testing Checklist
**Date:** December 11, 2024  
**Version:** 0.1.7  
**Goal:** Zero errors, perfect user experience

---

## 🎯 Testing Philosophy

**Rules:**
- ✅ = Feature works perfectly, no errors
- ⚠️ = Works but has minor issues
- ❌ = Broken, needs immediate fix
- 🔍 = Needs investigation

**Test Environment:**
- Production URL (Vercel deployment)
- Browser: Chrome (primary), Safari, Firefox
- Clear cache before testing
- Test both logged in and logged out states

---

## 1️⃣ AUTHENTICATION FLOW

### Sign Up Flow
- [ ] Navigate to app while logged out
- [ ] Click sign up/login
- [ ] Complete sign up with valid email
- [ ] Verify email received
- [ ] Click verification link
- [ ] Redirected to app and logged in
- [ ] Profile created in database
- [ ] No console errors

### Login Flow
- [ ] Log out of app
- [ ] Click login
- [ ] Enter valid credentials
- [ ] Successfully logged in
- [ ] Redirected to feed
- [ ] User session persists on refresh
- [ ] No console errors

### Logout Flow
- [ ] Click profile dropdown
- [ ] Click logout
- [ ] Successfully logged out
- [ ] Redirected appropriately
- [ ] Can't access protected routes
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 2️⃣ FEED PAGE (Main Landing)

### Viewing Feed
- [ ] Feed page loads without errors
- [ ] Posts display in grid layout
- [ ] Images load correctly
- [ ] Post titles visible
- [ ] Creator names show
- [ ] View counts display
- [ ] Like counts display
- [ ] Infinite scroll works
- [ ] No console errors
- [ ] No layout shifts

### Feed Interactions
- [ ] Click post thumbnail → opens detail modal
- [ ] Modal displays correct post
- [ ] Modal closes properly
- [ ] Like button works (toggles on/off)
- [ ] Like count updates in real-time
- [ ] Optimistic UI updates work
- [ ] No duplicate requests
- [ ] No console errors

### Feed Filters/Sorting
- [ ] "For You" tab works
- [ ] "Trending" tab works
- [ ] "Following" tab works
- [ ] Switching tabs doesn't break layout
- [ ] Posts load correctly for each tab
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 3️⃣ POST DETAIL VIEW

### Text Posts (Reddit-style)
- [ ] Click text post → redirects to /post/[id]
- [ ] Post content displays fully
- [ ] Comments section loads
- [ ] Comments display correctly
- [ ] Add new comment works
- [ ] Comment appears immediately
- [ ] Reply to comment works
- [ ] Nested replies display
- [ ] Vote on comments works
- [ ] Delete own comment works
- [ ] No console errors

### Image Posts (Modal)
- [ ] Click image post → opens modal
- [ ] Image loads in full quality
- [ ] Post title displays
- [ ] Post description displays
- [ ] Creator info shows
- [ ] Stats (views, likes) show
- [ ] Like button works
- [ ] Comments load (if enabled)
- [ ] Modal closes properly
- [ ] No console errors

### Audio Posts (Modal)
- [ ] Click audio post → opens modal
- [ ] Audio player displays
- [ ] Play button works
- [ ] Pause button works
- [ ] Progress bar works
- [ ] Volume control works
- [ ] Double-click prevention works
- [ ] Post details display
- [ ] Like button works
- [ ] No console errors

### Video Posts (Modal)
- [ ] Click video post → opens modal
- [ ] Video loads and plays
- [ ] Play/pause works
- [ ] Volume control works
- [ ] Fullscreen works
- [ ] Video quality good
- [ ] Post details display
- [ ] Like button works
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 4️⃣ CREATE POST FLOW

### Navigation
- [ ] Click "+" button in header
- [ ] Redirects to /create
- [ ] Page loads without errors
- [ ] All form fields visible
- [ ] No console errors

### Image Post Creation
- [ ] Select "Image" type
- [ ] Upload image (< 5MB)
- [ ] Image preview displays
- [ ] Enter title (required)
- [ ] Enter description
- [ ] Select subgroup (optional)
- [ ] Add tags (optional)
- [ ] Click submit
- [ ] Post created successfully
- [ ] Redirected to feed or post
- [ ] New post visible
- [ ] No console errors

### Text Post Creation
- [ ] Select "Text" type
- [ ] Enter title (required)
- [ ] Enter content in text editor
- [ ] Select subgroup (optional)
- [ ] Add tags (optional)
- [ ] Click submit
- [ ] Post created successfully
- [ ] Redirected to post page
- [ ] New post visible
- [ ] No console errors

### Audio Post Creation
- [ ] Select "Audio" type
- [ ] Upload audio file
- [ ] Add cover image (optional)
- [ ] Enter title (required)
- [ ] Enter description
- [ ] Select subgroup (optional)
- [ ] Add tags (optional)
- [ ] Click submit
- [ ] Post created successfully
- [ ] Audio playable in feed
- [ ] No console errors

### Video Post Creation
- [ ] Select "Video" type
- [ ] Upload video file
- [ ] Add cover image (optional)
- [ ] Enter title (required)
- [ ] Enter description
- [ ] Select subgroup (optional)
- [ ] Add tags (optional)
- [ ] Click submit
- [ ] Post created successfully
- [ ] Video playable in feed
- [ ] No console errors

### Validation
- [ ] Can't submit without title
- [ ] Can't submit without content/media
- [ ] File size limits enforced
- [ ] File type validation works
- [ ] Error messages clear
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 5️⃣ SPOTLIGHT COLLECTIONS

### Viewing Spotlights
- [ ] Navigate to /spotlight
- [ ] Spotlight list loads
- [ ] All spotlights display
- [ ] Thumbnails load
- [ ] Titles visible
- [ ] Creator names show
- [ ] Item counts show
- [ ] No console errors

### Creating Spotlight
- [ ] Click "Create Spotlight"
- [ ] Form loads correctly
- [ ] Enter title (required)
- [ ] Enter description
- [ ] Add items (posts)
- [ ] Upload cover image (optional)
- [ ] Click submit
- [ ] Spotlight created successfully
- [ ] Redirected to spotlight page
- [ ] New spotlight visible
- [ ] No console errors

### Viewing Spotlight Detail
- [ ] Click spotlight → /spotlight/[id]
- [ ] Spotlight page loads
- [ ] Title displays
- [ ] Description displays
- [ ] Cover image shows
- [ ] All items load
- [ ] Items display in grid
- [ ] Click item → opens post
- [ ] No console errors

### Editing Spotlight (Owner)
- [ ] View own spotlight
- [ ] Edit button visible
- [ ] Click edit
- [ ] Form pre-populated
- [ ] Change title
- [ ] Change description
- [ ] Add/remove items
- [ ] Save changes
- [ ] Changes reflected
- [ ] No console errors

### Deleting Spotlight (Owner)
- [ ] View own spotlight
- [ ] Delete button visible (red)
- [ ] Click delete
- [ ] Confirmation dialog appears
- [ ] Confirm deletion
- [ ] Spotlight deleted
- [ ] Redirected to spotlight list
- [ ] Spotlight no longer visible
- [ ] No console errors

### Spotlight Permissions
- [ ] View other user's spotlight
- [ ] NO edit button visible
- [ ] NO delete button visible
- [ ] Can view all content
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 6️⃣ PROFILE PAGE

### Viewing Own Profile
- [ ] Navigate to /profile
- [ ] Profile loads correctly
- [ ] Avatar displays (or default)
- [ ] Username displays
- [ ] Stats show (posts, likes, followers)
- [ ] Posts tab shows your posts
- [ ] Liked tab shows liked posts
- [ ] Spotlights tab shows your spotlights
- [ ] No console errors

### Profile Tabs
- [ ] Click "Posts" tab → shows your posts
- [ ] Click "Liked" tab → shows liked posts
- [ ] Click "Spotlights" tab → shows your spotlights
- [ ] Tab switching smooth
- [ ] Content loads for each tab
- [ ] No console errors

### Profile Interactions
- [ ] Click own post → opens detail
- [ ] Click liked post → opens detail
- [ ] Click spotlight → opens spotlight page
- [ ] Sorting works (newest, oldest, most liked)
- [ ] Delete own post works
- [ ] No console errors

### Viewing Other User's Profile
- [ ] Click another user's name
- [ ] Their profile loads
- [ ] Can view their posts
- [ ] Can view their spotlights
- [ ] Can't see their liked posts (private)
- [ ] Follow button visible
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 7️⃣ NOTIFICATIONS

### Notification Icon
- [ ] Bell icon visible in header (when logged in)
- [ ] Unread count badge shows
- [ ] Click icon → dropdown opens
- [ ] Dropdown shows recent notifications
- [ ] No console errors

### Notification Types
- [ ] Like notification appears
- [ ] Comment notification appears
- [ ] Reply notification appears
- [ ] Follow notification appears
- [ ] Click notification → navigates to post/comment
- [ ] Notification marked as read
- [ ] Badge count decreases
- [ ] No console errors

### Notification Dropdown
- [ ] Shows last 10 notifications
- [ ] Timestamps display correctly
- [ ] Actor usernames show
- [ ] Clear UI for each type
- [ ] "Mark all as read" works
- [ ] "View all" link works
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 8️⃣ MESSAGES / DM (Future Feature)

### Messages Icon
- [ ] Envelope icon visible in header
- [ ] Icon is black (not white/gray)
- [ ] Click icon → "Coming Soon" dropdown
- [ ] Dropdown displays correctly
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 9️⃣ SUBGROUPS

### Viewing Subgroups
- [ ] Navigate to /subgroup
- [ ] Subgroup list loads
- [ ] All subgroups display
- [ ] Join button works
- [ ] Leave button works
- [ ] No console errors

### Subgroup Detail Page
- [ ] Click subgroup → /subgroup/[slug]
- [ ] Page loads correctly
- [ ] Description shows
- [ ] Member count shows
- [ ] Posts in subgroup load
- [ ] Can create post in subgroup
- [ ] Join/leave button works
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 🔟 SEARCH & DISCOVERY

### Search Bar
- [ ] Search bar visible
- [ ] Type query
- [ ] Results appear in real-time
- [ ] Can search posts
- [ ] Can search users
- [ ] Can search subgroups
- [ ] Click result → navigates correctly
- [ ] No console errors

### Trending Page
- [ ] Navigate to /trending
- [ ] Page loads correctly
- [ ] Trending posts display
- [ ] Sorting by engagement works
- [ ] Time filter works (24h, 7d, 30d)
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 1️⃣1️⃣ REAL-TIME FEATURES

### Like Real-time Updates
- [ ] Like a post in one tab
- [ ] Like count updates in other tabs
- [ ] Like button state syncs
- [ ] Optimistic updates work
- [ ] No console errors

### Comment Real-time Updates
- [ ] Add comment in one tab
- [ ] Comment appears in other tabs
- [ ] Reply appears in real-time
- [ ] No duplicates
- [ ] No console errors

### Notification Real-time
- [ ] Receive like → notification appears
- [ ] Badge count updates
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 1️⃣2️⃣ MOBILE RESPONSIVENESS

### Mobile Layout
- [ ] Resize to mobile width
- [ ] Layout adapts correctly
- [ ] Header responsive
- [ ] Grid adjusts (1-2 columns)
- [ ] Modals fit screen
- [ ] Forms usable on mobile
- [ ] No horizontal scroll
- [ ] Touch interactions work
- [ ] No console errors

### Mobile Navigation
- [ ] Hamburger menu (if applicable)
- [ ] Bottom nav (if applicable)
- [ ] Can navigate all pages
- [ ] Tap targets large enough
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 1️⃣3️⃣ PERFORMANCE & LOADING

### Page Load Times
- [ ] Feed loads in < 3 seconds
- [ ] Post detail loads in < 2 seconds
- [ ] Profile loads in < 2 seconds
- [ ] No loading spinners stuck
- [ ] Images lazy load
- [ ] Smooth scrolling
- [ ] No console errors

### Network Requests
- [ ] No duplicate API calls
- [ ] No unnecessary refetches
- [ ] Caching works
- [ ] Failed requests retry appropriately
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 1️⃣4️⃣ ERROR HANDLING

### Network Errors
- [ ] Turn off network
- [ ] App shows error message
- [ ] Retry button works
- [ ] App recovers when network back
- [ ] No console errors (expected ones ok)

### 404 Pages
- [ ] Navigate to /invalid-route
- [ ] 404 page displays
- [ ] Can navigate back
- [ ] No console errors

### Permission Errors
- [ ] Try to delete other's post
- [ ] Error message clear
- [ ] App doesn't break
- [ ] No console errors

**Status:** 🔍 **NOT TESTED YET**  
**Errors Found:** _None yet_

---

## 🐛 BUGS DISCOVERED

### Critical (Must Fix)
_None yet_

### High Priority
_None yet_

### Medium Priority
_None yet_

### Low Priority
_None yet_

---

## 📊 Testing Summary

**Total Tests:** 200+  
**Passed:** 0  
**Failed:** 0  
**In Progress:** All  

**Ready for User Testing:** ❌ Not yet  
**Ready for Release:** ❌ Not yet

---

## 🚀 Next Steps

1. [ ] Deploy latest changes to Vercel
2. [ ] Wait for deployment to complete
3. [ ] Begin systematic testing
4. [ ] Document all issues found
5. [ ] Fix critical/high priority issues
6. [ ] Re-test fixed issues
7. [ ] Complete full testing pass
8. [ ] Mark ready for user testing

---

## 📝 Notes

- Test with fresh eyes
- Don't rush through tests
- Document exact steps to reproduce bugs
- Take screenshots of errors
- Check browser console frequently
- Test happy path AND edge cases
- Think like a user, not a developer

**Goal: Zero errors, perfect UX** 🎯
