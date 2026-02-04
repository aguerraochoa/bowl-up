-- Enable Bet Tracker for your team
-- 
-- Step 1: Find your team ID (replace 'your-email@example.com' with your email)
-- Or use your user ID if you know it
SELECT t.id, t.name, t.features, u.email 
FROM teams t
JOIN auth.users u ON t.user_id = u.id
WHERE u.email = 'your-email@example.com';

-- Step 2: Enable bet tracker for your team
-- Replace 'YOUR_TEAM_ID_HERE' with the id from Step 1
UPDATE teams
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{betTracker}',
  'true'::jsonb
)
WHERE id = 'YOUR_TEAM_ID_HERE';

-- OR if you know your email, you can do it in one query:
UPDATE teams
SET features = jsonb_set(
  COALESCE(features, '{}'::jsonb),
  '{betTracker}',
  'true'::jsonb
)
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- To disable bet tracker (if needed):
-- UPDATE teams
-- SET features = jsonb_set(
--   COALESCE(features, '{}'::jsonb),
--   '{betTracker}',
--   'false'::jsonb
-- )
-- WHERE id = 'YOUR_TEAM_ID_HERE';
