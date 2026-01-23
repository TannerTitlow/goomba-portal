# Setlist Manager Feature

## Overview

A collaborative setlist management feature for organizing and tracking band song repertoire. Built around a Trello-style interface where band members can organize songs into lists, assign instruments/parts to members, and track learning progress.

## Core Concepts

### Lists (Lists)
Flexible containers for organizing songs. Can represent:
- Active setlists for specific gigs
- Learning pools ("songs we're working on")
- Archive lists ("retired songs")
- Master repertoire
- Rehearsal session plans

### Songs (Cards)
Individual songs pulled from Spotify search, containing:
- Spotify metadata (title, artist, album, duration)
- Musical properties (key, tempo)
- Band-specific info (difficulty, notes, who suggested it)

### Assignments
Track who plays what instrument on each song, including:
- Progress status (0% to 100% in 20% increments)
- Individual difficulty rating
- Practice notes
- Last practice date

## User Stories

1. **As a band member**, I can create lists to organize songs for different purposes (upcoming gig, learning queue, etc.)

2. **As a band member**, I can search Spotify and add songs to lists, with songs appearing in multiple lists when needed

3. **As a band member**, I can assign instrument parts to myself or other members for any song

4. **As a band member**, I can update my progress on learning a part (not started → barely started → in progress → mostly learned → almost ready → performance ready)

5. **As a band member**, I can see at a glance which parts of which songs are ready and which need more work

6. **As a band member**, I can reorder songs within a list to build out setlist sequences

7. **As a band member**, I can add notes and difficulty ratings to my assignments to track tricky sections

8. **As a band member**, I can see overall progress across all members to help plan rehearsals effectively

## Database Schema

### Tables

#### `instruments`
Predefined instrument types for consistent assignment tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Instrument name |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

---

#### `songs`
Song catalog with Spotify integration and band-specific metadata.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| spotify_id | VARCHAR(255) | NOT NULL, UNIQUE | Spotify track ID |
| title | VARCHAR(255) | NOT NULL | Song title |
| artist | VARCHAR(255) | NOT NULL | Artist name |
| album | VARCHAR(255) | | Album name |
| duration_ms | INTEGER | | Song duration in milliseconds |
| key | VARCHAR(10) | | Musical key (e.g., "C", "F# minor") |
| tempo | DECIMAL(6,2) | | BPM |
| difficulty_rating | INTEGER | 1-5 | Overall song difficulty |
| notes | TEXT | | Band-specific arrangement notes |
| suggested_by_user_id | UUID | FK → auth.users | Who added the song |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes**: `spotify_id`, `suggested_by_user_id`

---

#### `lists`
Organizational containers for songs (setlists, learning queues, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| name | VARCHAR(255) | NOT NULL | List name |
| description | TEXT | | List description/purpose |
| list_type | VARCHAR(50) | | Type hint (e.g., "setlist", "learning", "archive") |
| created_by_user_id | UUID | FK → auth.users | List creator |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

---

#### `list_songs`
Many-to-many join table connecting songs to lists with ordering.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| list_id | UUID | FK → lists | Parent list |
| song_id | UUID | FK → songs | Referenced song |
| position | INTEGER | NOT NULL | Sort order in list |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Unique Constraints**: 
- `(list_id, song_id)` - No duplicate songs in a list
- `(list_id, position)` - No duplicate positions in a list

**Indexes**: `list_id`, `song_id`, `(list_id, position)`

---

#### `song_assignments`
Tracks which band members play which instruments on songs, with progress tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Auto-generated |
| song_id | UUID | FK → songs | The song |
| user_id | UUID | FK → auth.users | The band member |
| instrument_id | UUID | FK → instruments | The instrument/part |
| status | assignment_status | DEFAULT 'not_started' | Learning progress (see enum below) |
| difficulty_rating | INTEGER | 1-5 | Personal difficulty rating |
| notes | TEXT | | Practice notes, tricky sections |
| last_practiced_at | TIMESTAMPTZ | | Last practice session |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Unique Constraint**: `(song_id, user_id, instrument_id)` - One assignment per user/instrument/song combo

**Indexes**: `song_id`, `user_id`, `instrument_id`, `status`

---

### Enums

#### `assignment_status`
Progress states with associated percentage values:

| Value | Percentage | Description |
|-------|-----------|-------------|
| `not_started` | 0% | Haven't begun learning |
| `barely_started` | 20% | Initial familiarization |
| `in_progress` | 40% | Actively learning |
| `mostly_learned` | 60% | Most parts down |
| `almost_ready` | 80% | Fine-tuning |
| `performance_ready` | 100% | Ready to perform |

---

### Utility Functions

#### `update_updated_at_column()`
Trigger function that automatically updates `updated_at` timestamp on row modifications. Applied to `songs`, `lists`, and `song_assignments` tables.

---

## Row Level Security (RLS)

All tables have RLS enabled with policies designed for collaborative band environments:

### General Philosophy
- All authenticated users can read all data
- Most editing is collaborative (any band member can update)
- Deletion is restricted to creators/owners where appropriate

### Policy Details

**Instruments**: Read-all, authenticated users can insert

**Songs**: Read-all, insert by authenticated, update by all, delete only by suggester

**Lists**: Read-all, insert by authenticated, update by all, delete only by creator

**List_songs**: Read-all, full CRUD by authenticated (collaborative reordering)

**Song_assignments**: Read-all, full CRUD by authenticated (collaborative progress tracking)

---

## UI/UX Considerations

### Trello-Style Board View
- Scrollable lists
- Drag-and-drop reordering within lists
- Expandable master list that contains all songs for quickly dragging and dropping into lists
- Visual progress indicators on cards

### Song Card Display
Should show at minimum:
- Song title and artist
- Album artwork (from Spotify)
- Assignment progress overview (e.g., "3/4 parts ready")
- Quick-view of who's assigned to what

### Assignment Detail View
When expanding a song card:
- List all instrument assignments
- Show each member's progress status
- Display difficulty ratings and notes
- Show last practiced dates
- Allow inline editing of status/notes

### Progress Visualization
Consider:
- Color-coded status badges based on calculation from all assignments (red (0-19%) → orange (20-49%) → yellow (50-79%) → blue (80-99%) → green (100%))
- Progress bars showing percentage learned
- "Ready to perform" badge when all assignments at 100%
- Filter/sort by status or member

### Spotify Integration
- Search modal for adding songs
- Pull metadata automatically (key, tempo, duration)
- Option to preview track
- Link to open in Spotify

---

## Technical Implementation Notes

### Adding Songs
1. User searches Spotify API
2. Select track from results
3. Create `songs` record with Spotify ID and metadata
4. Create `list_songs` entry linking to target list
5. Optionally create initial `song_assignments`

### Reordering Songs
1. Update `position` values in `list_songs`
2. Handle position conflicts (shift other songs)
3. Consider optimistic UI updates with rollback on error

### Progress Tracking
1. User updates `status` on their `song_assignment`
2. `updated_at` triggers automatically
3. Set `last_practiced_at` to NOW() when status changes
4. Aggregate assignment statuses to show overall song readiness

### Multi-list Song Management
- Same song can exist in multiple lists
- Each list_songs entry maintains independent position
- Deleting from one list doesn't affect others
- Assignments are song-level, not list-level (shared across all instances)

---

## Future Enhancement Ideas

- Spotify playlist generation from lists
- Rehearsal scheduling tied to assignment readiness
- Song similarity recommendations