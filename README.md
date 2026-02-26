# Pool Scout (Next.js 14 + Prisma + SQLite)

## Features
- `/pool-scout` page with:
  - FTL pool link input
  - roster paste textarea
  - parsed roster preview (name, club, rating, birth_year)
  - editable opponent table (cell-by-cell)
  - resolve column for FencingTracker profile URL or profile id
- Server-side fetching/parsing of FencingTracker strength pages
- Probability model:
  - `P_pool = 1/(1+exp(-(S_me_pool - S_opp_pool)/k))`
  - `P_de = 1/(1+exp(-(S_me_de - S_opp_de)/k))`
  - `k` configurable in UI (default `300`)
- Prisma models:
  - `PoolImport`
  - `OpponentRaw`
  - `OpponentLink`
  - `StrengthSnapshot`
- "me" hardcoded to FencingTracker profile id `100268345`
- StrengthSnapshot caching with a 24-hour TTL

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env and verify DB URL:
   ```bash
   cp .env.example .env
   ```
3. Generate Prisma client:
   ```bash
   npm run prisma:generate
   ```
4. Run initial migration:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Start dev server:
   ```bash
   npm run dev
   ```
6. Visit:
   - `http://localhost:3000/pool-scout`

## Notes
- FencingTracker parsing uses resilient regex extraction for fields:
  - `pool_strength`
  - `de_strength`
  - optional `confidence_low`, `confidence_high`
- If profile strength data cannot be parsed, probabilities will display as `-`.
