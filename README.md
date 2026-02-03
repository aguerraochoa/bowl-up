# BowlUp 🎳

A beautiful, mobile-first bowling statistics and payment tracking app for teams.

## Features

- **Dashboard**: Team KPIs, leaderboards, and performance metrics
- **Add Game**: Quick and easy game entry with 10th frame notation support
- **Player Stats**: Individual player dashboards with detailed statistics
- **Debts Tracker**: Splitwise-inspired expense tracking and balance management

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Install lucide-react for icons:
```bash
npm install lucide-react
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS
- LocalStorage for data persistence

## Team Setup

The app is pre-configured with team name "Bowling Bad". Add players in the Players tab to get started!

## Game Entry

When adding a game:
1. Enter total score for frames 1-9
2. Enter number of strikes (frames 1-9)
3. Enter number of spares (frames 1-9)
4. Enter 10th frame notation (e.g., `X9/`, `9/8`, `72`, `X-X`)

## 10th Frame Notation Examples

- `X9/` - Strike, then 9 pins, then spare
- `9/8` - Spare, then 8 pins
- `72` - Open frame (7 then 2)
- `X-X` - Two strikes
- `X--` - Strike, then two misses
