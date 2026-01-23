# Trello-Style Setlist Board Design

**Date:** 2026-01-23
**Status:** Approved
**Owner:** Goomba Portal Development

## Implementation Status

✅ **COMPLETED** - 2026-01-23

All planned features have been implemented:
- ✅ Visual enhancements (shadows, depth, Trello-style cards)
- ✅ Song drag-and-drop within columns (reorder)
- ✅ Song drag-and-drop between columns (copy)
- ✅ Column drag-and-drop (reorder)
- ✅ Copy behavior indicators (badge, cursor, visual feedback)
- ✅ First-time user tooltip
- ✅ Mobile-responsive design
- ✅ Error handling and optimistic updates

See implementation plan: `docs/plans/2026-01-23-trello-drag-drop-implementation.md`

## Overview

Transform the Goomba Portal setlist view into a fully interactive Trello-style board with drag-and-drop functionality for songs and columns, enhanced visual design, and clear user feedback. The redesign maintains the existing black/green Spotify-inspired aesthetic while adding depth, polish, and intuitive interactions.

## Goals

1. Enable drag-and-drop for songs within and between setlists (copy behavior)
2. Enable drag-and-drop for column reordering
3. Enhance visual design with Trello-inspired cards, shadows, and depth
4. Provide clear visual feedback for copy behavior
5. Maintain mobile responsiveness and touch support
6. Keep optimistic UI updates with proper error handling

## User Experience

### Core Interactions

**Song Dragging Within Column (Reorder)**:
- User clicks and drags song card
- Card lifts with shadow and slight rotation
- Original position shows dashed placeholder (faded)
- Drop updates song position in database
- Cursor: `grabbing`

**Song Dragging Between Columns (Copy)**:
- User drags song to different column
- Original card stays fully visible (not faded)
- Drag preview shows green "+" badge in top-right corner
- Cursor changes to `copy` (browser copy cursor)
- Drop adds song to target list (keeps in source list)
- Toast notification: "Added [song] to [list]"

**Column Dragging**:
- User drags column header horizontally
- Entire column lifts and repositions
- Drop updates column order in database
- Smooth slide animation for other columns

**Copy Behavior Indicators**:
- Plus badge on drag preview when over different column
- Cursor changes to copy symbol
- Original card remains fully visible (no placeholder)
- First-time tooltip: "Songs are copied to new lists"

## Technical Architecture

### Dependencies

**New Packages** (already installed):
- `vuedraggable@next` - Vue 3 drag-and-drop wrapper
- `sortablejs` - Core drag-and-drop library

### Database Schema

**Tables Updated**:

**`lists` table**:
- Added `position` column (integer, for column ordering)
- Default sorting: `ORDER BY position ASC`
- New lists get `position = MAX(position) + 1`

**`list_songs` table** (existing):
- Confirm `position` column exists
- Used for song ordering within lists

### Component Structure

```
SetlistsView.vue (container)
├─ VueDraggable (for columns)
│  └─ SetlistColumn.vue × N
│     ├─ Column header (drag handle)
│     └─ VueDraggable (for songs)
│        └─ SongCard.vue × N
│           └─ Drag handle indicator
```

### Composable Updates

**useSetlists.js**:
- Add `updateListPosition(listId, newPosition)` function
- Add `reorderLists(listOrder)` function for batch updates
- Fetch lists with `ORDER BY position ASC`
- Set position on createList

**useListSongs.js**:
- Update `reorderSong` to work with new drag behavior
- Handle position recalculation when copying to new list
- Add duplicate detection before API calls

### State Management

**Optimistic Updates**:
1. User action → immediate visual update
2. Background API call to Supabase
3. Success: UI already reflects change
4. Failure: Rollback + show error toast

**Real-time Sync**:
- Existing Supabase subscription handles remote updates
- Queue updates during active drag (prevent jarring repositioning)
- On conflict: Server state wins, show toast notification

**Error Handling**:
- Network failure: Revert position, show toast with "Retry" button
- Duplicate song: Skip API call, show "Song already in this list" toast
- Token expiration: Redirect to login with error message

## Visual Design

### Color Palette (Existing Theme)

- Background: `#000000` (solid black)
- Columns: `#0d0d0d` base, `#1a1a1a` border
- Cards: `#1a1a1a` base, `#222` hover
- Primary accent: `#1db954` (Spotify green)
- Hover accent: `#1ed760` (lighter green)
- Text primary: `#ffffff`
- Text secondary: `#999999`
- Text muted: `#666666`

### Enhanced Visual Elements

**Columns**:
- Background: `#0d0d0d`
- Border: `1px solid #1a1a1a`
- Shadow: `0 1px 3px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)`
- Hover: `translateY(-2px)` + enhanced shadow
- Border radius: `12px`

**Song Cards**:
- Background: `#1a1a1a` base
- Hover background: `#222222`
- Shadow: `0 1px 2px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.2)`
- Hover shadow: `0 4px 12px rgba(29, 185, 84, 0.15)` (green glow)
- Drag shadow: `0 8px 16px rgba(0,0,0,0.4)`
- Border radius: `8px`

**Typography**:
- Font family: `Circular` (Spotify font)
- Column titles: `1.5rem`, weight 700
- Song titles: `0.9rem`, weight 600
- Artist names: `0.8rem`, weight 400, color `#999`

**Drag Indicators**:
- Grip handle: `⋮⋮` icon, opacity 0 → 0.6 on hover
- Plus badge: 24px circle, `#1db954` background, white "+"
- Drop zone: `2px dashed #1db954` with pulse animation
- Placeholder: Dashed border, `opacity: 0.3`

### Animations

**Drag States**:
- Dragging: `scale(1.05) rotate(3deg)`, `opacity: 0.9`
- Ghost: `opacity: 0.5`
- Placeholder (same column): Dashed border, `opacity: 0.3`
- Original (different column): Full visibility, `opacity: 1.0`

**Transitions**:
- Card movements: `all 0.3s ease-out`
- Hover effects: `all 0.2s ease`
- Badge fade-in: `opacity 0.15s ease`
- Drop zone pulse: `2s ease-in-out infinite`

**Micro-interactions**:
- Card hover: Lift 2px + green glow
- Button hover: Scale + color shift
- Cursor: `grab` → `grabbing` → `copy`
- Auto-scroll: Smooth scroll when dragging near edges

**Performance**:
- `will-change: transform` on draggables
- GPU acceleration: `transform: translateZ(0)`
- Debounce position updates (max 1 per 100ms)

## Edge Cases

### Duplicate Prevention
- Check if song exists in target list before API call
- Show toast: "This song is already in [List Name]"
- Card snaps back to origin smoothly

### Network Issues
- Slow network: Show spinner after 500ms
- Failed save: Revert + error toast with "Retry"
- Concurrent edits: Server wins, show "List updated by another user"

### Empty States
- Empty column: Large drop zone with "Drop songs here"
- Last song removed: Smooth transition to empty state
- No columns: Show empty board state

### Mobile Specifics
- Long-press delay (150ms) to prevent scroll conflicts
- Larger touch targets (44px minimum)
- Haptic feedback on drag start: `navigator.vibrate(50)`
- Full-width columns, horizontal swipe

### Authentication
- Token expired: Catch 401, redirect to login
- Permission denied: Show clear error message

## Implementation Plan

### Phase 1: Visual Enhancement
1. Update column and card styling with new shadows and spacing
2. Add hover states and micro-animations
3. Add drag handle indicators
4. Test visual design on mobile

### Phase 2: Song Drag-and-Drop
1. Integrate VueDraggable for songs within columns
2. Add within-column reorder functionality
3. Add cross-column copy functionality
4. Implement copy behavior indicators (badge, cursor, visible original)
5. Add optimistic updates and error handling

### Phase 3: Column Drag-and-Drop
1. Integrate VueDraggable for columns
2. Add column reorder functionality
3. Update database with new positions
4. Test real-time sync with multiple tabs

### Phase 4: Polish & Testing
1. Add first-time user tooltip
2. Implement auto-scroll during drag
3. Add keyboard accessibility
4. Test on all target browsers and devices
5. Performance testing and optimization

## Success Criteria

- [ ] Songs can be reordered within columns via drag-and-drop
- [ ] Songs can be copied between columns via drag-and-drop
- [ ] Columns can be reordered via drag-and-drop
- [ ] Copy behavior is clearly indicated (badge, cursor, visible original)
- [ ] Drag completes in < 300ms
- [ ] Animations run at 60fps with no jank
- [ ] Works on mobile with touch gestures
- [ ] Error recovery works without page reload
- [ ] Real-time sync works with multiple users
- [ ] All visual enhancements match design specs

## Testing Checklist

**Functionality**:
- [ ] Drag song within same list (reorder)
- [ ] Drag song to different list (copy)
- [ ] Drag song to multiple lists sequentially
- [ ] Drag column to reorder
- [ ] Duplicate song detection
- [ ] Network error handling
- [ ] Token expiration handling

**Visual**:
- [ ] Copy indicators appear correctly
- [ ] Animations are smooth
- [ ] Hover states work
- [ ] Empty states display correctly
- [ ] Toast notifications appear

**Cross-browser**:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile Safari (iOS)
- [ ] Chrome Android

**Performance**:
- [ ] 60fps during drag
- [ ] < 300ms completion time
- [ ] Works with 50+ songs
- [ ] No memory leaks

## Future Enhancements (Out of Scope)

- Virtual scrolling for 100+ songs per list
- Offline mode with sync queue
- Undo/redo functionality
- Bulk operations (multi-select cards)
- Column grouping/categorization
- Advanced filtering and search within board
- Custom column colors or icons
- Keyboard shortcuts for power users

## References

- VueDraggable documentation: https://github.com/SortableJS/vue.draggable.next
- SortableJS options: https://github.com/SortableJS/Sortable
- Trello drag UX patterns: https://trello.com
- Current codebase structure: See CLAUDE.md
