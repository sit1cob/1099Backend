# API Analytics Dashboard

React + Vite dashboard that visualizes documents stored in the `ApiAnalytics` Mongo collection.

## Development

```bash
cd /Users/sjena/Documents/DeepDive/TechHub/1099-Job-Board-orignal/analytics-dashboard
npm install
npm run dev
```

Set the backend base URL (defaults to `http://localhost:5010`) via:

```bash
echo "VITE_API_BASE_URL=http://localhost:5010" > .env.local
```

## Features

- Filters by method, status, date range, and search
- Recharts area chart for latency trends
- Summary cards (requests, success rate, avg latency)
- React Query caching + background refresh
- Tailwind UI components

