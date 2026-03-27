# AI Trip Planner

Full-stack AI trip planning app with a Next.js frontend and an Express + TypeScript backend. It generates structured day-wise itineraries, supports multi-destination routes, lets users edit AI output before and after saving, and creates read-only public share links for saved trips.

## Features

- JWT-based signup and login
- Landing page with curated destination carousels and category-based inspiration sections
- Preselected destination handoff from landing cards or the world map into the trip form
- Draft trip persistence in local storage, including post-login redirect back to trip creation
- AI-generated itineraries with trip overview, transport info, destination flow, day-wise plans, hotel options, places to visit, food recommendations, travel tips, and estimated budget
- Single, two-destination, and three-destination trip support
- Live distance/travel-time previews between consecutive destinations before generation
- Destination phase and travel-leg formatting for multi-stop trips
- Exact day-count enforcement and itinerary normalization for 1 to 15 days
- Country-aware itinerary generation with capital-city and tourism-cluster context for map-selected countries
- Traveler modes for solo, couple, family, and friends
- Family and friends validation with adult/child count rules
- Budget estimation based on budget type, traveler count, room assumptions, destination cost factors, and inter-city transfers
- Saved trips with in-app detail view, editing, delete, PDF download, and public sharing
- Read-only public shared trip pages that expose the saved itinerary without edit controls
- Budget preference storage on the backend, with saved preference budget able to override the submitted budget during generation
- JWT-aware burst/user/IP rate limiting on AI trip generation

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- UI helpers: `lucide-react`, `sonner`
- Map UI: `jsvectormap`
- Backend: Node.js, Express 5, TypeScript, Mongoose
- Database: MongoDB
- AI: Groq (`llama-3.1-8b-instant`)
- Auth: JWT + `bcryptjs`
- PDF Export: `jspdf` + `jspdf-autotable`

## Project Structure

```text
ai-trip-planner/
  client/                  # Next.js app
    src/app/               # App Router pages
    src/components/        # Shared UI
    src/app/lib/           # API calls and pending-trip persistence
    src/lib/               # Shared auth/util helpers
    src/utils/             # Frontend destination validation helpers
  server/                  # Express API
    src/controllers/       # Route handlers
    src/routes/            # API route definitions
    src/models/            # Mongoose schemas
    src/middleware/        # Auth, validation, rate limiting
    src/services/          # AI integration
    src/utils/             # Distance and destination helpers
```

## Main Pages

- `/` - landing page with destination inspiration cards
- `/create-trip` - trip builder, AI generation, inline editing, and save flow
- `/map` - country picker powered by `jsvectormap`
- `/saved-trips` - saved trip library with modal detail view, edit, delete, share, and PDF export
- `/shared-trip/[slug]` - public read-only shared itinerary page
- `/auth/login` and `/auth/signup` - authentication pages
- `/preferences` - preferences route for user-specific trip settings

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
- `npm run migrate:remove-hotel-ratings` - cleanup script for saved trip hotel data

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

1. User explores destinations from the landing page or opens the separate world map page.
2. Selected destinations are carried into the create-trip form, and in-progress form data is stored in local storage.
3. If generation is attempted while logged out, the app preserves the draft and redirects the user back after authentication.
4. User creates a trip with one to three destinations, 1 to 15 days, budget type, and traveler type.
5. For `family` and `friends`, the form also collects validated adult and child counts.
6. When multiple destinations are entered, the frontend requests travel distance previews between each leg.
7. Backend validates payload size and trip input, applies JWT-aware rate limits, enriches country destinations with country/capital context, and generates a structured AI itinerary.
8. Final itinerary is normalized to the exact requested number of days and returned with destination flow, travel legs, places, food suggestions, hotel options, travel tips, and estimated budget.
9. User can edit the generated result before saving.
10. Saved trips can later be opened, edited again, deleted, downloaded as PDF, or shared via a public read-only link.

## Multi-Destination Behavior

- Maximum 3 destinations per trip
- Total trip days remain fixed across all destinations
- Travel previews are requested for each consecutive leg before generation
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
- Edit support for itinerary, title, transport, and budget details
- Places to visit, food recommendations, and travel tips sections are preserved in saved trips
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
- `server/src/server.ts` also contains a production keep-alive ping for the deployed Render backend.

## Notes

- `server/dist/` is a generated build output and should not be committed.
- Shared trip links are read-only and do not expose edit/delete actions.
