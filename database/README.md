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

## Migration Order

1. **First time setup**: Run `schema.sql`
2. **Add leagues/admin**: Run `add_leagues_and_admin.sql`
3. **Add seasons**: Run `add_seasons.sql`
4. **Add game sessions**: Run `add_game_session_id.sql`
5. **Add username login**: Run `add_username_login.sql`
6. **Launch hardening**: Run `launch_hardening_musts.sql`
7. **Remove features column** (optional): Run `remove_features_column.sql` to clean up the unused `features` column from teams table

## Notes

- All migrations are idempotent (safe to run multiple times)
- Use `IF NOT EXISTS` and `IF EXISTS` clauses to prevent errors
- Always backup your database before running migrations in production
