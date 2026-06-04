# Inventory Reservation System

A Next.js 14 inventory reservation system with Redis distributed locking, Prisma transactions, PostgreSQL row-level locking, and idempotent API endpoints.

## Local setup

- Clone repo, copy `.env.example` to `.env`, fill in values
- `npm install`
- `npx prisma migrate dev --name init`
- `npx prisma db seed`
- `npm run dev`

## Expiry mechanism (Vercel Hobby Plan — free)

Three-layer hybrid approach:

1. **Lazy expiry**: every read of a reservation checks and expires it on the spot.
   Zero lag — a reservation is expired the moment it is next touched.

2. **Middleware passive sweep**: fires a background cleanup on every API request,
   throttled to once per 60 seconds via a Redis TTL key. Ensures bulk expiry
   even for reservations nobody is actively viewing.

3. **Daily Vercel Cron (2am UTC)**: full sweep safety net for any reservations
   that slipped through (e.g. no API traffic overnight).

## Concurrency approach

Redis distributed lock (Upstash, `nx` + `px`) ensures only one request enters the critical section per product+warehouse at a time. Inside the lock, a Prisma `$transaction` with raw `SELECT FOR UPDATE` re-checks available stock at the database level.

Two simultaneous requests for the last unit behave as follows:

1. Request A acquires the lock and enters the transaction.
2. Request B fails to acquire the lock, waits 100ms, retries once, and still cannot acquire it.
3. Request B returns `409` with `"Could not acquire lock, try again"`.
4. Request A completes the transaction, increments `reservedUnits`, creates the reservation, and releases the lock.

If both requests somehow enter the critical section sequentially, the second request fails with `409 Insufficient stock` after the row lock reveals zero available units.

## Idempotency

`POST /api/reservations` and `POST /api/reservations/:id/confirm` accept an `Idempotency-Key` header. On the first request, the response body and status code are stored in the `IdempotencyKey` table. On retry with the same key, the cached response is returned without re-running side effects.

## Trade-offs & what I'd do differently

- Cron granularity is 1 minute; a WebSocket or SSE channel would give real-time expiry feedback to the UI
- Redis lock vs PostgreSQL advisory locks: Redis adds infrastructure but is simpler to reason about across serverless instances
- No optimistic UI updates on the product listing page (stock counts don't auto-refresh)
- With more time: add rate limiting per IP on the reservation endpoint, add an admin dashboard
