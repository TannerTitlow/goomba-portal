# Song Assignments Feature - Production Ready Design

**Date:** 2026-02-09
**Status:** Ready for Implementation

## Overview

Complete the song assignments feature to production-ready state with full CRUD functionality, mobile-responsive UI, and inline editing. Band members can assign instruments to songs, track learning progress, and manage assignments through a clean modal interface.

## Goals

1. **Complete CRUD Operations** - Add, edit, delete assignments with proper validation
2. **Mobile-First Responsive Design** - Touch-friendly UI that works on all screen sizes
3. **Inline Editing UX** - Click-to-edit cards without nested modals
4. **Bug Fixes** - Resolve issues in composables and improve real-time sync

## Architecture

### Component Structure

**SongAssignmentsModal.vue** - Main modal container
- Displays list of assignments for a song
- Manages edit state (which assignment is being edited)
- Contains add assignment form at bottom (always visible)
- Handles all CRUD operations via composable

**AssignmentCard.vue** - Individual assignment display/edit
- Two states: collapsed (view) and expanded (edit)
- Collapsed: Shows avatar with progress ring, name, instrument, status
- Expanded: Inline edit form with status/instrument/difficulty controls
- Emits events for save, cancel, delete actions

**DifficultyRating.vue** - 5-dot difficulty selector (NEW)
- Visual: 5 clickable dots, filled based on rating (1-5 or null)
- Click selected rating to clear (nullable)
- Mobile: Larger touch targets (w-8 h-8)
- Optional: Color scaling (1-2=green, 3=yellow, 4-5=orange/red)

### State Management

**Modal state:**
```javascript
const editingAssignmentId = ref(null)  // Which assignment is being edited
const editForm = ref({                  // Edit form data
  status: '',
  instrument_id: null,
  difficulty_rating: null
})
const addForm = ref({                   // Add form data
  user_id: null,
  instrument_id: null
})
const submitting = ref(false)           // Prevent double-submit
```

### Data Flow

1. Modal fetches assignments on mount: `fetchSongAssignments(songId)`
2. Real-time subscription keeps data synced across users
3. CRUD operations update Supabase, subscription reflects changes automatically
4. Loading states during operations prevent duplicate actions

## UI/UX Design

### Mobile-First Layout

**Modal Structure:**
```
┌─────────────────────────────────┐
│ Header (fixed)                  │
│ - Song title + icon             │
│ - Close button                  │
├─────────────────────────────────┤
│ Content Area (scrollable)       │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ AssignmentCard (collapsed)  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ AssignmentCard (expanded)   │ │
│ │ ┌─ Edit Form ─────────────┐ │ │
│ │ │ Status: [dropdown]      │ │ │
│ │ │ Instrument: [dropdown]  │ │ │
│ │ │ Difficulty: ●●●○○       │ │ │
│ │ │ [Save] [Cancel] [Del]   │ │ │
│ │ └─────────────────────────┘ │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│ Footer (sticky)                 │
│ Add Assignment Form             │
│ - User dropdown                 │
│ - Instrument dropdown           │
│ - Add button                    │
└─────────────────────────────────┘
```

### Responsive Breakpoints

**Mobile (< 640px):**
- Modal: `w-full max-w-2xl`
- Header: `px-4 py-3`, title `text-lg`
- Cards: Full-width, `p-3`, vertical stack
- Edit form: Fields stack vertically `flex-col`
- Buttons: `w-full` on mobile
- Add form: Fields stack vertically

**Tablet/Desktop (640px+):**
- Header: `px-6 py-4`, title `text-xl sm:text-2xl`
- Cards: `p-4`, more spacing
- Edit form: Fields side-by-side `flex-row`
- Buttons: `w-auto`, inline layout
- Add form: Horizontal layout with gap

### Touch Targets

All interactive elements: `min-h-[44px]` minimum tap area
- Buttons: `min-h-[44px]`
- Dropdowns: Native select on mobile for better UX
- Cards: Full card clickable for edit
- Difficulty dots: `w-8 h-8` on mobile, `w-6 h-6` on desktop

### Assignment Card States

**Collapsed (View Mode):**
- Layout: Horizontal flex - Avatar (left) | Info (right)
- Avatar: Circular with progress ring (conic gradient)
- Info: Name, instrument, status label stacked vertically
- Hover: Subtle bg change, cursor pointer
- Full card clickable to enter edit mode

**Expanded (Edit Mode):**
- Collapsed view remains visible (non-interactive)
- Edit form expands below with smooth transition
- Form fields:
  - **Status dropdown:** All 6 status options (not_started → performance_ready)
  - **Instrument dropdown:** All available instruments
  - **Difficulty rating:** 5-dot selector (nullable)
- Actions: "Save" (primary), "Cancel" (ghost), "Delete" (error/corner)

### Add Assignment Form

**Location:** Sticky footer of modal, always visible
**Layout:**
- Mobile: Vertical stack with `gap-3`, `p-4`
- Desktop: Horizontal row with `gap-4`, `p-5`
**Fields:**
- User dropdown: Shows `display_name` (or `full_name` fallback)
- Instrument dropdown: Shows all instruments
- Add button: Disabled when incomplete, full-width on mobile
**Styling:** Subtle border-top, slight bg color differentiation from content area

## Composable Updates

### Bug Fixes in `useSongAssignments.js`

**Line 106:** `assignments.value` doesn't exist
```javascript
// BEFORE (broken):
assignments.value = assignments.value.filter(...)

// AFTER (fixed):
songAssignments.value = songAssignments.value.filter(...)
```

**Line 94:** `assignmentId` undefined in function signature
```javascript
// BEFORE (broken):
async function deleteSongAssignment(songAssignmentId) {
  log('[useSongAssignments] Deleting assignment:', { assignmentId })

// AFTER (fixed):
async function deleteSongAssignment(songAssignmentId) {
  log('[useSongAssignments] Deleting assignment:', { songAssignmentId })
```

### New Function: `updateSongAssignment`

```javascript
async function updateSongAssignment(assignmentId, updates) {
  error.value = null

  try {
    // Update in database
    const { data, error: updateError } = await supabase
      .from('song_assignments')
      .update(updates)
      .eq('id', assignmentId)
      .select(`
        id,
        user: profiles (display_name, full_name, avatar_path),
        instrument: instruments (name),
        status,
        difficulty_rating
      `)
      .single()

    if (updateError) throw updateError

    // Update local state
    const index = songAssignments.value.findIndex(a => a.id === assignmentId)
    if (index !== -1) {
      songAssignments.value[index] = data
    }

    return data
  } catch (err) {
    error.value = err.message
    logError('[useSongAssignments] updateSongAssignment error:', err)
    throw err
  }
}
```

### Fix `addSongAssignment` to Return Joined Data

```javascript
async function addSongAssignment(assignmentData) {
  try {
    // First upsert the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from('song_assignments')
      .upsert(
        {
          song_id: assignmentData.song_id,
          user_id: assignmentData.user_id,
          instrument_id: assignmentData.instrument_id,
        },
        { onConflict: 'song_id, user_id, instrument_id' }
      )
      .select()
      .single()

    if (assignmentError) throw assignmentError

    // Fetch with joined data
    const { data: fullAssignment, error: fetchError } = await supabase
      .from('song_assignments')
      .select(`
        id,
        user: profiles (display_name, full_name, avatar_path),
        instrument: instruments (name),
        status,
        difficulty_rating
      `)
      .eq('id', assignment.id)
      .single()

    if (fetchError) throw fetchError

    // Update local state
    songAssignments.value.push(fullAssignment)

    return fullAssignment
  } catch (err) {
    error.value = err.message
    logError('[useSongAssignments] addSongAssignment error:', err)
    throw err
  } finally {
    loading.value = false
  }
}
```

## Validation & Error Handling

### Form Validation

**Add Assignment:**
- Both user and instrument required
- Button disabled: `:disabled="!addForm.user_id || !addForm.instrument_id || submitting"`
- Duplicate error: "This person is already assigned to this instrument for this song"
- Don't clear form on error (let user pick different instrument)

**Edit Assignment:**
- At least one field changed to enable save
- Status: Valid enum (dropdown enforces)
- Difficulty: 1-5 or null (component enforces)
- Instrument: Must exist (dropdown enforces)

### Error Handling

**Unique constraint violations:**
```javascript
if (err.code === '23505') {
  throw new Error('This assignment already exists')
}
```

**UI error states:**
- Toast notifications for errors (reuse SetlistsView pattern)
- Failed operations don't close edit mode (user can retry)
- Loading state prevents double-submit: `submitting.value = true`

**Edge cases:**
- User deleted while editing: Show "User not found" in dropdown
- Instrument deleted: Fall back to ID or "Unknown instrument"
- Song deleted: Close modal gracefully
- Concurrent edits: Last write wins, real-time syncs

## Testing Checklist

### Functional Testing

**Add Assignment:**
- [ ] User dropdown shows display_name
- [ ] Instrument dropdown shows all options
- [ ] Button disabled when incomplete
- [ ] Successful add shows in list
- [ ] Form clears after add
- [ ] Duplicate shows error toast
- [ ] Real-time sync to other users

**Edit Assignment:**
- [ ] Click card enters edit mode
- [ ] Form shows current values
- [ ] Can change status, instrument, difficulty
- [ ] Can clear difficulty (null)
- [ ] Save updates immediately
- [ ] Cancel discards changes
- [ ] Only one card editable at a time
- [ ] Real-time sync to other users

**Delete Assignment:**
- [ ] Shows confirmation dialog
- [ ] Cancel keeps assignment
- [ ] Confirm removes assignment
- [ ] Real-time sync to other users

### Mobile Responsiveness

- [ ] Modal scales on 375px screen
- [ ] Touch targets ≥ 44x44px
- [ ] Dropdowns work on mobile
- [ ] Cards stack vertically
- [ ] Edit form stacks on mobile
- [ ] No text overflow
- [ ] Smooth scrolling

### Edge Cases

- [ ] Empty state renders
- [ ] Loading state shows
- [ ] Error state shows retry
- [ ] Esc closes modal
- [ ] Backdrop click closes
- [ ] No double-submit

## Implementation Order

1. **Fix composable bugs** - `useSongAssignments.js` variable names and add `updateSongAssignment`
2. **Create DifficultyRating component** - 5-dot selector with nullable support
3. **Update AssignmentCard** - Add expanded state with edit form
4. **Update SongAssignmentsModal** - Wire up edit state management and add form
5. **Test CRUD operations** - All add/edit/delete flows
6. **Responsive testing** - Mobile, tablet, desktop breakpoints
7. **Polish** - Error handling, loading states, transitions

## Success Criteria

- ✅ Can add assignments (user + instrument selection)
- ✅ Can edit assignments (status, instrument, difficulty)
- ✅ Can delete assignments (with confirmation)
- ✅ Mobile-friendly UI (touch targets, responsive layout)
- ✅ Real-time sync across users
- ✅ Proper error handling and validation
- ✅ Clean inline editing UX (no nested modals)
- ✅ All existing bugs fixed
