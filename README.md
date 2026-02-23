# AI Trip Planner

Full-stack AI-powered trip planning application with:
- `client`: Next.js frontend
- `server`: Express + TypeScript API
- MongoDB for persistence
- Groq LLM for itinerary generation

## Features

- User signup/login with JWT authentication
- Generate day-wise itineraries using AI
- Budget-aware cost estimation (`cheap`, `moderate`, `luxury`)
- Save trips to MongoDB and view/delete later
- Destination inspiration landing page with category-based suggestions

## Tech Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS
- Backend: Node.js, Express 5, TypeScript, Mongoose
- Database: MongoDB
- AI: Groq (`llama-3.1-8b-instant`)
- Auth: JWT + bcrypt

## Project Structure

```text
ai-trip-planner/
  client/                  # Next.js app
    src/app/               # App Router pages
    src/components/        # UI and feature components
  server/                  # Express API
    src/controllers/       # Route handlers
    src/routes/            # API route definitions
    src/models/            # Mongoose schemas
    src/middleware/        # Auth middleware
    src/services/          # AI service integration
```

## Prerequisites

- Node.js 20+ (recommended)
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
```

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

Start frontend (new terminal):

```bash
cd client
npm run dev
```

Open:
- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:5000/api/health`

## Available Scripts

### Client (`client/package.json`)

- `npm run dev` - start Next.js dev server
- `npm run build` - production build
- `npm run start` - run production build
- `npm run lint` - run ESLint

### Server (`server/package.json`)

- `npm run dev` - start with nodemon + ts-node
- `npm run build` - compile TypeScript to `dist/`
- `npm run start` - run compiled server

## API Overview

Base URL: `http://localhost:5000`

Auth:
- `POST /api/auth/signup`
- `POST /api/auth/login`

Trips (protected):
- `POST /api/trip/generate`
- `POST /api/trip/save`
- `GET /api/trip/my-trips`
- `GET /api/trip/:id`
- `DELETE /api/trip/:id`

User preferences (protected):
- `GET /api/user/preferences`
- `PUT /api/user/preferences`

Health:
- `GET /api/health`

## Current App Flow

1. User signs up or logs in.
2. JWT token is stored in browser `localStorage`.
3. User creates a trip (`destination`, `days`, `budgetType`, `travelers`).
4. Backend generates structured itinerary via Groq model.
5. User optionally edits itinerary and saves it.
6. Saved trips can be viewed and deleted from dashboard.

## Notes / Known Gaps

- `saved-trips` frontend currently calls `PUT /api/trip/:id` for updates, but this route is not implemented on backend.
- `preferences` frontend currently calls `POST /api/preferences`; backend expects `PUT /api/user/preferences`.
- CORS is configured in backend for:
  - `http://localhost:3000`
  - `https://plan-my-trip-iota.vercel.app`

## Deployment Notes

- Backend code includes a Render keep-alive ping in `server/src/server.ts`.
- Ensure production env variables are configured on both frontend and backend.
- Set frontend `NEXT_PUBLIC_API_URL` to deployed backend URL.

