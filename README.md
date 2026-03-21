# ChargeSmart

One app to find the cheapest, nearest EV charger in China. Powered by AI and crowdsourced data.

![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-green)
![Backend](https://img.shields.io/badge/backend-Node.js%20%7C%20Fastify-blue)
![AI](https://img.shields.io/badge/AI-Qwen2.5%20%7C%20Qwen3--VL-orange)
![Database](https://img.shields.io/badge/database-PostgreSQL-blue)

## The Problem

China has **30 million+ EV drivers** but charging price information is completely fragmented. Users must switch between 5+ separate apps (State Grid, TGOOD, Star Charge, Cloud Quick Charge, etc.) with no way to compare prices side by side. There is no aggregation platform like GasBuddy for Chinese EV charging.

## The Solution

ChargeSmart aggregates all charging stations onto a single map, uses a smart algorithm to recommend the best option, and rewards users with points for contributing real-time data — making every charge smarter and greener.

## Key Features

### Unified Map
- All charging stations from multiple operators on one Mapbox map
- Color-coded price pins (green = cheap, orange = medium, red = expensive)
- One-tap navigation to any station via Amap or Baidu Maps

### Smart Ranking Algorithm
```
Score = Price×0.35 + Availability×0.25 + Distance×0.20 + Reliability×0.15 + Speed×0.05
```

### AI Charging Assistant
- Natural language Q&A powered by Qwen2.5-7B
- Real-time station data context injection
- Clickable station cards in chat responses — tap to view full details

### AI Receipt Scanner
- Photograph your charging bill — AI extracts kWh and awards carbon points
- Multi-layer fraud prevention: vision classification + backend numeric validation
- Rejects non-charging documents (supermarket receipts, bank statements, calendars, etc.)

### Crowdsourced Data
- Users earn points for reporting prices, faults, queue times, and check-ins
- Anti-fraud: geographic fencing (must be within 300m), cross-validation (2+ confirmations), 7-day receipt limit

### Carbon Savings Tracker
- Every charging session tracked as CO2 reduced, trees saved, and km of emissions avoided
- Gamified points system with 4 user tiers

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | Expo React Native (SDK 54), Expo Router |
| Map | Mapbox GL JS (WebView) |
| Backend | Node.js + Fastify + TypeScript |
| Database | PostgreSQL + Drizzle ORM (Railway) |
| AI Chat | Featherless API — Qwen2.5-7B-Instruct |
| AI Vision | Featherless API — Qwen3-VL-30B |
| Auth | Phone OTP |
| Deployment | Railway |
| Package Manager | pnpm workspaces (Monorepo) |

## Project Structure
```
chargesmart/
├── apps/
│   └── mobile/
│       ├── app/
│       │   ├── (tabs)/
│       │   │   ├── index.tsx           # Map screen (Mapbox)
│       │   │   ├── rank.tsx            # Smart ranking
│       │   │   ├── ai.tsx              # AI assistant
│       │   │   └── profile.tsx         # User profile & points
│       │   ├── station/[id].tsx        # Station detail
│       │   └── contribute/[stationId].tsx
│       ├── store/
│       │   ├── authStore.ts
│       │   └── languageStore.ts        # i18n (zh/en)
│       └── locales/
│           ├── zh.ts
│           └── en.ts
└── packages/
    └── api/
        └── src/modules/
            ├── ai/
            ├── stations/
            ├── ranking/
            ├── contributions/
            ├── reviews/
            └── users/
```

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm
- Expo Go app (for mobile testing)

### Installation
```bash
git clone https://github.com/aussiefoke/My_personal_Repo
cd chargesmart
pnpm install

# Start backend
cd packages/api
pnpm dev

# Start mobile app
cd apps/mobile
npx expo start
```

### Environment Variables
```
DATABASE_URL=your_postgresql_url
FEATHERLESS_API_KEY=your_featherless_key
```

## Database Schema

| Table | Description |
|-------|-------------|
| stations | Charging station info (50 real Shenzhen locations) |
| charger_units | Individual charger details |
| price_snapshots | Price history per station |
| users | User accounts + points + tier |
| point_transactions | Points ledger |
| contributions | Crowdsourced reports |
| reviews | User reviews |

## Points System

| Action | Points |
|--------|--------|
| Price update | +15 |
| Fault report | +12 |
| Check-in | +10 |
| Write review | +10 |
| Queue report | +8 |
| Add new station | +20 |
| Carbon receipt scan | +2/kWh (max 200/day) |
| Price verified by others | +5 bonus |

## User Tiers

| Tier | Points Required |
|------|----------------|
| EV Newbie | 0-99 |
| Charging Pro | 100-499 |
| Charging Expert | 500-1999 |
| Charging Guardian | 2000+ |

## Roadmap

- WeChat Mini Program version
- Real operator API partnerships
- Expand to Beijing and Shanghai
- Carbon offset marketplace

## License

Copyright 2026 Xuanyu Li. All rights reserved.