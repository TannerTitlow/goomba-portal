# How to Test the Drag-and-Drop Feature

**Time Required:** 30-45 minutes
**Browsers Needed:** Chrome, Firefox, Safari (if on Mac)
**Mobile Device:** Optional but recommended

---

## Quick Start

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open in browser:** http://localhost:5173

3. **Log in with your Spotify account**

4. **Navigate to:** Setlists view

---

## What to Test (5 Core Scenarios)

### ✅ Test 1: Drag to Reorder Songs (2 minutes)

**What to do:**
1. Hover over any song card
2. Click and drag the grip dots (⋮⋮) up or down
3. Drop it in a new position

**What should happen:**
- Song moves smoothly to new position
- Other songs shift to make space
- After refreshing the page, the order is still changed

**What to look for:**
- ❌ Song jumps or flickers
- ❌ Wrong song gets moved
- ❌ Order resets after refresh

---

### ✅ Test 2: Copy Songs Between Lists (3 minutes)

**What to do:**
1. Hold down **Ctrl** (Windows/Linux) or **Cmd** (Mac)
2. Drag a song from one setlist to another
3. Release the mouse, then release Ctrl/Cmd

**What should happen:**
- A green "Copy" badge appears on the card while dragging
- A tooltip appears (first time only) explaining the feature
- Song gets copied to the new list
- Original song stays in place
- After refresh, both copies exist

**What to look for:**
- ❌ No copy badge appears
- ❌ Song moves instead of copying
- ❌ Tooltip doesn't appear
- ❌ Copy disappears after refresh

---

### ✅ Test 3: Move Songs Between Lists (2 minutes)

**What to do:**
1. Drag a song from one setlist to another (WITHOUT holding Ctrl/Cmd)
2. Release the mouse

**What should happen:**
- NO copy badge appears
- Song is removed from the original list
- Song appears in the new list
- After refresh, song is only in the new list

**What to look for:**
- ❌ Copy badge appears (should only show when Ctrl/Cmd is held)
- ❌ Song gets copied instead of moved
- ❌ Song disappears completely

---

### ✅ Test 4: Reorder Setlist Columns (2 minutes)

**What to do:**
1. Click and drag a setlist header (the title area)
2. Move it left or right
3. Release

**What should happen:**
- Entire column (including all songs) moves
- Other columns shift to make space
- After refresh, columns stay in new order

**What to look for:**
- ❌ Only header moves, songs stay behind
- ❌ Columns overlap or stack incorrectly
- ❌ Order resets after refresh

---

### ✅ Test 5: Mobile Touch (3 minutes)

**What to do:**
1. Open DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select "iPhone 12 Pro" or similar
4. Try dragging songs with mouse (simulates touch)

**Or on real mobile device:**
1. Open the site on your phone
2. Navigate to Setlists
3. Try touch-dragging songs

**What should happen:**
- Drag works smoothly
- Buttons are easy to tap (not too small)
- Layout fits the screen
- No horizontal scrolling issues

**What to look for:**
- ❌ Drag doesn't work on touch
- ❌ Buttons too small to tap
- ❌ Layout breaks on small screen
- ❌ Content cuts off

---

## Quick Checks (5 minutes)

### Real-time Sync
1. Open the site in two browser tabs
2. Drag a song in Tab 1
3. Watch Tab 2 → should update within 1-2 seconds

### Tooltip Dismissal
1. Clear browser data (or open incognito)
2. Hold Ctrl/Cmd → tooltip should appear
3. Click "Got it!" → tooltip disappears
4. Hold Ctrl/Cmd again → tooltip should NOT reappear

### Visual Polish
- Cards have rounded corners ✅
- Shadows appear on hover ✅
- Smooth animations (not jerky) ✅
- Colors match the site theme ✅

---

## How to Report Issues

If something doesn't work:

1. **Note what happened:**
   - What did you do?
   - What did you expect?
   - What actually happened?

2. **Check browser console:**
   - Press F12 to open DevTools
   - Click "Console" tab
   - Screenshot any red error messages

3. **Note your environment:**
   - Browser name and version
   - Operating system
   - Mobile device (if testing on phone)

4. **Create a GitHub issue or send me the details**

---

## Success Criteria

The feature is ready to ship if:

- ✅ All 5 core tests pass
- ✅ No console errors
- ✅ Works in Chrome + at least one other browser
- ✅ Mobile layout looks good (doesn't have to be tested on real device)
- ✅ Changes persist after page refresh

---

## Questions?

**Q: The tooltip won't go away!**
A: Click the "Got it!" button. If it still appears, try clearing localStorage:
```javascript
// In browser console:
localStorage.removeItem('dragTooltipDismissed')
```

**Q: Drag isn't working at all**
A: Make sure you're clicking and holding on the grip dots (⋮⋮), not the song text.

**Q: Songs jump to wrong positions**
A: This is a bug! Please report it with details about what you were doing.

**Q: Changes aren't saving**
A: Check that you're logged in to Spotify and the dev server is running.

---

## Want to Test More Thoroughly?

See the full test report with 10+ detailed scenarios:
📄 **`docs/testing/INTEGRATION_TEST_REPORT.md`**

---

## After Testing

Once you've completed testing:

1. Update the sign-off checklist in `INTEGRATION_TEST_REPORT.md`
2. If everything passes: Feature is ready to merge to main!
3. If issues found: Create bug reports and we'll fix them

---

**Happy Testing!** 🎸
