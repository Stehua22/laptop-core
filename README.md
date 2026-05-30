# 💻 Laptop Price Tracker

A full-stack Next.js 14 app for tracking and comparing laptop prices, backed by Supabase (Postgres).

**Stack:** Next.js 14 (App Router) · TypeScript · Supabase · Recharts · Tailwind · Vercel

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/laptop-tracker.git
cd laptop-tracker
npm install
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a **New Project** (remember the DB password — you won't need it here but save it)
3. Once your project is ready, go to **SQL Editor → New Query**
4. Copy the entire contents of `supabase-schema.sql` and run it — this creates your tables and seeds sample data
5. Go to **Settings → API** and copy:
   - `Project URL`
   - `anon / public` key

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 Deploy to Vercel

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. In the **Environment Variables** section, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click **Deploy** — done!

> Vercel auto-deploys on every push to `main`.

---

## 📁 Project Structure

```
laptop-tracker/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Server component — fetches data
│   └── globals.css       # Global styles + design tokens
├── components/
│   ├── TrackerClient.tsx  # Main client component (state + logic)
│   ├── Header.tsx
│   ├── StatsBar.tsx
│   ├── Controls.tsx       # Search + filter bar
│   ├── Recommendations.tsx
│   ├── LaptopGrid.tsx
│   ├── LaptopCard.tsx
│   ├── LaptopModal.tsx    # Detail modal
│   ├── PriceHistoryModal.tsx  # Chart + history table
│   ├── AddLaptopModal.tsx
│   └── Toast.tsx
├── lib/
│   └── supabase.ts        # DB client + typed helpers
├── supabase-schema.sql    # Run this in Supabase SQL Editor
├── .env.example           # Copy to .env.local
└── README.md
```

---

## 🗄️ Database Schema

**`laptops`** — one row per laptop  
**`price_history`** — many rows per laptop, one per price check

Price history is fetched via Supabase's nested select — no extra API calls needed.

---

## ✨ Features

- 📊 Stats bar: total, avg, min, max prices
- 🏆 Best Picks section with category tabs (Student / Home / Business)
- 🔍 Search + brand filter + sort
- 📈 Interactive price history chart (Recharts)
- ➕ Add new laptops via modal form
- 💰 Update prices — each update appends to history
- 🗑️ Delete laptops
- 🔗 Direct store links

---

## 🔧 Customizing Recommendations

In `components/TrackerClient.tsx`, find:

```ts
const RECOMMENDATION_IDS: Record<string, number[]> = {
  student:  [49, 5, 42, 13],
  home:     [8, 20, 50, 25],
  business: [4, 18, 21, 41],
};
```

Replace the IDs with any laptop IDs from your database.
