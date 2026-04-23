# GrowSpace

GrowSpace is a production-ready full-stack booking platform for gardening workshops and plant-care stations. It is built for Netlify deployment, uses PostgreSQL for persistence, and protects booking integrity with transaction-based slot locking.

## Stack

- React + Vite + TypeScript
- Tailwind CSS
- Netlify Functions for REST APIs
- PostgreSQL or Supabase Postgres
- JWT authentication with `ADMIN` and `USER` roles
- Zod validation and centralized API error handling

## Features

- Register, log in, and fetch the current session with JWT auth
- Browse predefined workshop and station services
- Create slots as an admin with capacity, duration, date, service, and slot type
- View slots by service and date, including available-capacity filtering
- Book appointments with transaction-safe, concurrency-safe slot locking
- Prevent duplicate bookings and overbooking with row-level locking plus a unique constraint
- View personal bookings as a user
- Filter and cancel bookings as an admin

## API Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/services`
- `POST /api/admin/slots`
- `GET /api/slots`
- `GET /api/slots/available`
- `POST /api/bookings`
- `GET /api/bookings/my`
- `GET /api/admin/bookings`
- `PATCH /api/admin/bookings/:id/cancel`

## Environment Variables

Copy `.env.example` to `.env` for local configuration and add the same values in Netlify site settings:

```bash
VITE_API_BASE_URL=/api
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/growspace
DATABASE_SSL=false
JWT_SECRET=replace-this-with-a-long-random-secret
JWT_EXPIRES_IN=7d
```

For Supabase Postgres on Netlify, set `DATABASE_SSL=true`.

## Database Setup

1. Run `backend/db/schema.sql` against your PostgreSQL database.
2. Run `backend/db/seed.sql` to load the required predefined workshop and station services.
3. Register a user in the app.
4. Promote that user to admin:

```bash
npm run promote:admin -- admin@example.com
```

You can also promote manually:

```sql
update users set role = 'ADMIN', updated_at = now() where email = 'admin@example.com';
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the full frontend + backend flow locally:

1. Copy `.env.local.example` to `.env.local` and fill in a real PostgreSQL `DATABASE_URL`.
2. Prepare the database:

```bash
npm run db:check
npm run db:setup
```

3. Start the local Netlify-powered app:

```bash
npm run dev:full
```

Local URLs:

- App + API proxy: `http://localhost:8888`
- Vite frontend directly: `http://localhost:5173`

`npm run dev:full` uses Netlify Dev to proxy the React app and execute the Netlify function locally, so `/api/*` routes work on localhost.

## Deployment Notes

- `netlify.toml` is configured for SPA routing and `/api/*` rewrites to the Netlify function entrypoint.
- The frontend builds to `frontend/dist`.
- Netlify bundles the TypeScript function from `backend/functions/api.ts`.
- Set all required environment variables in Netlify before deploying.

## Concurrency Model

Booking flow:

1. Start a transaction.
2. Lock the selected slot row with `SELECT ... FOR UPDATE`.
3. Reject past-date slots.
4. Reject duplicate user bookings for the same slot.
5. Reject full slots.
6. Insert the booking as `CONFIRMED`.
7. Increment `booked_count`.
8. Commit.

Cancellation flow:

1. Start a transaction.
2. Lock the booking row and related slot row.
3. Reject already-cancelled bookings.
4. Mark the booking as `CANCELLED`.
5. Decrement `booked_count`.
6. Commit.

## Project Structure

```text
frontend/                   React SPA, Vite config, and Tailwind config
backend/functions/api.ts    Netlify function entrypoint
backend/src/server          Controllers, services, repositories, validation, and DB access
backend/db                  PostgreSQL schema and seed files
backend/scripts             Utility scripts such as admin promotion
shared/contracts.ts         Shared API and domain contracts used by both frontend and backend
```
