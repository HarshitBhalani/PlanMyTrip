# AI Trip Planner

Full-stack AI trip planning app with a Next.js frontend and an Express + TypeScript backend. It generates structured itineraries, supports multi-destination trips, saves trips for later editing, and lets users share read-only public trip links.

## Features

- JWT-based signup and login
- AI-generated itineraries with day-wise planning
- Country selection through a separate interactive world map page
- Single, two-destination, and three-destination trip support
- Destination phase and travel-leg formatting for multi-stop trips
- Exact day-count enforcement in generated itineraries
- Country-aware itinerary generation with capital-city and tourism-cluster context
- Family/friends group input with adult and child validation
- Budget estimation based on trip type, members, days, destinations, and transfers
- Saved trips with edit, delete, PDF download, and public sharing
- Read-only public shared trip pages
- Rate limiting on AI trip generation with JWT-aware user/IP fallback
- Distance preview endpoint for destination-to-destination travel

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Map UI: `jsvectormap`
- Backend: Node.js, Express 5, TypeScript, Mongoose
- Database: MongoDB
- AI: Groq
- Auth: JWT + bcrypt
- PDF Export: `jspdf` + `jspdf-autotable`

## Project Structure

```text
ai-trip-planner/
  client/                  # Next.js app
    src/app/               # App Router pages
    src/components/        # Shared UI
    src/lib/               # Auth and API helpers
    src/utils/             # Frontend validation helpers
  server/                  # Express API
    src/controllers/       # Route handlers
    src/routes/            # API route definitions
    src/models/            # Mongoose schemas
    src/middleware/        # Auth, validation, rate limiting
    src/services/          # AI integration
    src/utils/             # Distance and destination helpers
```

## Prerequisites

- Node.js 20+
- npm
- MongoDB database URI
- Groq API key

## Environment Variables

### `server/.env`

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your_groq_api_key

# Development rate limits
DEV_RATE_LIMIT_BURST_MAX=50
DEV_RATE_LIMIT_BURST_WINDOW_SEC=30
DEV_RATE_LIMIT_USER_MAX=500
DEV_RATE_LIMIT_USER_WINDOW_SEC=3600
DEV_RATE_LIMIT_IP_MAX=200
DEV_RATE_LIMIT_IP_WINDOW_SEC=3600

# Production rate limits
PROD_RATE_LIMIT_BURST_MAX=3
PROD_RATE_LIMIT_BURST_WINDOW_SEC=30
PROD_RATE_LIMIT_USER_MAX=15
PROD_RATE_LIMIT_USER_WINDOW_SEC=3600
PROD_RATE_LIMIT_IP_MAX=8
PROD_RATE_LIMIT_IP_WINDOW_SEC=3600
```

Defaults if rate-limit env vars are missing:
- Development: burst `20/30s`, user `100/hour`, IP `50/hour`
- Production: burst `2/30s`, user `10/hour`, IP `5/hour`

### `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Installation

Install dependencies in both apps:

```bash
cd server
npm install

cd ../client
npm install
```

## Run Locally

Start backend:

```bash
cd server
npm run dev
```

Start frontend in a new terminal:

```bash
cd client
npm run dev
```

Open:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/health`

## Available Scripts

### Client

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production build
- `npm run lint` - run ESLint

### Server

- `npm run dev` - start backend with nodemon
- `npm run build` - compile TypeScript to `dist/`
- `npm run start` - run compiled backend with `node dist/server.js`

## API Overview

Base URL: `http://localhost:5000`

### Auth

- `POST /api/auth/signup`
- `POST /api/auth/login`

### Trips

- `POST /api/trip/distance-preview`
- `POST /api/trip/generate` (protected, rate limited)
- `POST /api/trip/save` (protected)
- `GET /api/trip/my-trips` (protected)
- `GET /api/trip/:id` (protected)
- `PUT /api/trip/:id` (protected)
- `DELETE /api/trip/:id` (protected)
- `POST /api/trip/:id/share` (protected)
- `GET /api/trip/public/:slug`

### User Preferences

- `GET /api/user/preferences` (protected)
- `PUT /api/user/preferences` (protected)

### Health

- `GET /api/health`

## Current App Flow

1. User signs up or logs in.
2. JWT token is stored in browser storage.
3. User creates a trip with one to three destinations, days, budget type, and traveler type.
4. User can also open a separate map page and choose a country directly from the world map.
5. For `family` and `friends`, the form also collects adult and child counts.
6. Backend validates input, applies rate limits, enriches country destinations with country/capital context, and generates a structured AI itinerary.
7. Final itinerary is normalized to the exact requested number of days.
8. User can review the generated trip, then save it.
9. Saved trips can be viewed, edited, deleted, downloaded as PDF, or shared via a public read-only link.

## Multi-Destination Behavior

- Maximum 3 destinations per trip
- Total trip days remain fixed across all destinations
- Destination cards and itinerary length are normalized to the exact requested day count
- AI itinerary separates:
  - destination phases
  - travel phases
  - destination-to-destination transitions
- Travel leg details include approximate distance and duration when available

## Map Destination Flow

- `/map` provides a separate world-map destination picker
- Country selection from the map is passed back into the create-trip form
- The current map flow is country-only selection
- Selected country names are normalized to full readable names such as `India`, `Portugal`, or `Greenland`

## Country-Aware Itinerary Logic

- If a selected destination is a full country, the backend tries to fetch country metadata such as capital, region, and population
- The trip-generation prompt uses this country context to steer itineraries toward real capital-city and tourism clusters
- Country itineraries are rewritten when the AI response is too generic or repetitive
- This improves plans for destinations such as Portugal, Russia, and other country-level selections from the map

## Saved Trip Features

- Full saved itinerary rendering
- Edit support for itinerary and trip details
- PDF download with PlanMyTrip branding
- Saved date/time visible on trip cards
- Public share links for read-only trip viewing

## Deployment Notes

- Backend production service should use:
  - Build Command: `npm run build`
  - Start Command: `npm start`
- Do not run `npm run dev` in production environments like Render.
- Configure backend env vars in the hosting dashboard; do not rely on committing `.env`.
- Set frontend `NEXT_PUBLIC_API_URL` to the deployed backend URL.
- Backend CORS is configured for local frontend and the deployed Vercel frontend.

## Notes

- `server/dist/` is a generated build output and should not be committed.
- Shared trip links are read-only and do not expose edit/delete actions.
