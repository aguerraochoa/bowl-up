# Game Session ID Setup Instructions

## Overview
This update adds `game_session_id` to properly track team games. When multiple players submit together, they'll all share the same session ID, allowing accurate team sum calculations.

## Migration Steps

### 1. Run Database Migration
Go to your Supabase SQL Editor and run:
```
database/add_game_session_id.sql
```

This will:
- Add the `game_session_id` column to the `games` table
- Create an index for better performance

### 2. Code Changes (Already Applied)
The following files have been updated:
- ✅ `src/types/index.ts` - Added `gameSessionId` to Game interface
- ✅ `src/utils/storage.ts` - Updated to save/retrieve `gameSessionId`
- ✅ `src/pages/AddGame.tsx` - Generates shared session ID for team games
- ✅ `src/utils/stats.ts` - Groups team games by `gameSessionId` instead of date

### 3. How It Works Now

**Before:**
- 4 players submit → 4 separate games stored
- Team sum calculated by grouping all games from same date
- ❌ Inaccurate if multiple games played same day

**After:**
- 4 players submit → 4 games with same `game_session_id`
- Team sum calculated by grouping games with same `game_session_id`
- ✅ Accurate team game tracking

### 4. Testing

After migration:
1. Submit a new team game with multiple players
2. Check the dashboard - team sum games should show correctly
3. Each team game session will be tracked separately

## Notes

- All new games will automatically get a `game_session_id`
- Team sum leaderboard now shows actual team games, not just date-based groupings
- Games without a `game_session_id` will be shown as individual games in the history