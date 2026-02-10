# Future Feature Backlog

This file tracks features intentionally postponed from the current implementation sprint.

## 1) Trend Charts

### Goal
Provide visual performance trends over time at team and player levels.

### Scope Ideas
- Team-level line charts for:
  - Average score over time
  - Strike percentage over time
  - Spare percentage over time
- Player-level trend charts:
  - Last 5 / 10 / 20 games rolling average
  - Strike and spare trend by game date
  - Consistency band (floor/ceiling vs average)
- Filters:
  - Current season
  - All seasons
  - Custom date range

### Notes
- Reuse existing stats helpers where possible.
- Ensure mobile-first readable chart UI.
- Consider charting library only if needed; keep bundle size in mind.

## 2) Announcements Board

### Goal
Allow league admins to publish updates that teams can see inside the app.

### Scope Ideas
- Admin create/edit/delete announcements.
- Fields:
  - title
  - message
  - priority (`normal` / `important`)
  - target (`all leagues` or specific league)
  - `created_at`, optional `expires_at`
- Team-side inbox/panel:
  - unread indicator
  - pin important announcements at top
  - mark as read per team account

### Notes
- Add row-level security rules so teams only read announcements for their league.
- Include basic retention/expiration handling to avoid stale notices.
