# Supabase Setup Instructions

## Step 1: Install Dependencies

Run this command in your terminal:
```bash
npm install @supabase/supabase-js
```

## Step 2: Set Up Database Schema

1. Go to your Supabase project dashboard: https://zetnludhohdsxqlfnjsd.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** to execute the SQL

This will create:
- All necessary tables (teams, players, games, debts, etc.)
- Row Level Security (RLS) policies
- Database functions for team name login
- Triggers for automatic team creation on signup

## Step 3: Configure Email Authentication

1. In Supabase dashboard, go to **Authentication** > **Settings**
2. Enable **Email** as an authentication provider
3. Configure email templates if desired
4. Set up email confirmation (currently enabled)

## Step 4: Test the Application

1. Start your dev server: `npm run dev`
2. Navigate to `/signup` to create a new account
3. Check your email for confirmation (if email verification is enabled)
4. Sign in with either your email or team name

## Important Notes

- **Team names are NOT unique** - multiple teams can have the same name
- **Email addresses ARE unique** - Supabase enforces this
- **Email verification is enabled** - users must confirm their email
- **Users can change team name** - this will be implemented in the storage utilities

## Next Steps

After setting up the database, you'll need to:
1. Update all storage utilities (`src/utils/storage.ts`) to use Supabase instead of LocalStorage
2. Test all functionality to ensure data syncs properly
3. Remove LocalStorage fallbacks once Supabase is fully integrated

## Database Schema Overview

- **teams**: One team per user (linked via user_id)
- **players**: Linked to teams
- **games**: Linked to teams and players
- **debt_tags**: Linked to teams
- **debts**: Linked to teams, with many-to-many relationship to players via `debt_split_between`
- **bet_tallies**: For teams with betTracker feature enabled

All tables have Row Level Security (RLS) enabled, so users can only access their own team's data.
