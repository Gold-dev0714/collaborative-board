# Pocket Board

A small shared sticky-note board built for the Encore take-home challenge.

## What it does

- Creates a board with an unguessable shareable URL
- Adds notes from the toolbar, the empty state, or by double-clicking the canvas
- Supports inline text editing and four colors
- Moves notes with pointer-based dragging (mouse, pen, or touch)
- Persists boards and notes in Postgres through server-side API routes
- Loads the same board from any device with the link

## Stack

- Next.js 16 / React 19 / TypeScript
- Supabase-hosted Postgres
- Plain CSS

I kept the browser independent from the database provider. The client talks to small Next.js route handlers, and those handlers use a server-only Supabase service credential. This avoids exposing a database key or adding a public endpoint that can enumerate every board.

## Run locally

Requirements: Node.js 20.9 or newer and a Supabase project.

1. Install dependencies:

   ```bash
   npm install
   ```

2. In Supabase, open **SQL Editor** and run [`db/schema.sql`](db/schema.sql).

3. Copy the environment file:

   ```bash
   cp .env.example .env.local
   ```

4. Add the project URL and service-role key from Supabase project settings:

   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   `SUPABASE_SERVICE_ROLE_KEY` must remain server-side. It is intentionally not prefixed with `NEXT_PUBLIC_`.

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open `http://localhost:3000`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Deploy

The shortest path is Vercel:

1. Push the repository to GitHub.
2. Import it into Vercel.
3. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in project environment variables.
4. Deploy.

## Interaction details

- Dragging is optimistic in the UI and writes once on pointer release rather than on every pointer movement.
- Text writes are debounced for 550 ms and flushed on blur.
- Coordinates are bounded in both the client and API validation.
- A short save indicator shows whether writes are in progress.


## Realtime configuration

Part 2 uses a browser-safe Supabase publishable key for Broadcast and Presence. Add these alongside the server-only values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
```

The secret/service-role key remains server-only. No anonymous table policies are required for this implementation.
