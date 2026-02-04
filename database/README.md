# Database Migrations

This folder contains SQL migration scripts for the BowlUp database.

## Essential Files

### `schema.sql`
**Main database schema** - Run this first when setting up a new database.
- Creates all tables (teams, players, games, debts, etc.)
- Sets up RLS policies
- Creates functions and triggers

### `add_game_session_id.sql`
**Adds game session tracking** - Run this to enable team game tracking.
- Adds `game_session_id` column to `games` table
- Creates index for performance
- Allows grouping games from the same team game session

## Utility Scripts

### `enable_bet_tracker.sql`
**Enable Bet Tracker feature** - Run this to enable the Bet Tracker tab for your team.
- Updates your team's `features` JSONB to enable `betTracker`
- See the file for instructions on how to use it

## Migration Order

1. **First time setup**: Run `schema.sql`
2. **Add game sessions**: Run `add_game_session_id.sql`
3. **Enable features** (optional): Run `enable_bet_tracker.sql` if needed

## Notes

- All migrations are idempotent (safe to run multiple times)
- Use `IF NOT EXISTS` and `IF EXISTS` clauses to prevent errors
- Always backup your database before running migrations in production
