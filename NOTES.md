# Part 1 Notes

## Key decisions

### Use a thin server boundary

I used Next.js route handlers between the browser and Postgres. The exercise allows anyone with a link to edit, but that does not require exposing the database directly to the browser. The API only supports creating a board and creating/updating notes inside a known board; there is intentionally no endpoint for listing boards.

### Treat the board ID as the share secret

Board IDs are random UUIDs. There is no authentication for this exercise, so possession of the URL is the authorization model. This is appropriate for the requested scope, though a real product would likely use a separate revocable share token and explicit permissions.

### Keep drag interactions local

Pointer movement updates component state locally, using `requestAnimationFrame` to avoid excessive React work. The final coordinates are persisted on pointer release. This keeps drag behavior responsive and avoids sending dozens of writes per second.

### Save text after a short pause

Text is controlled locally and saved after 550 ms of inactivity, with an additional save on blur. That is a middle ground between saving every keystroke and requiring an explicit Save button.

### Avoid a drag-and-drop dependency

The interaction is small enough to implement with Pointer Events. This keeps the dependency surface low, supports mouse/touch/pen, and makes the coordinate behavior explicit.

## Assumptions

- “Collaborative” in Part 1 means a shared, editable board with durable state. I did not add live multi-user updates because the Part 1 acceptance criteria do not explicitly require real-time synchronization.
- A fixed 1600 × 1000 canvas is sufficient for the exercise. The viewport scrolls when needed.
- Note deletion, board naming, zooming, and authentication are outside Part 1.

## What I would do with more time

- Add focused tests for request validation, coordinate clamping, and repository error cases.
- Add graceful retry/reconciliation when an optimistic move fails.
- Add note deletion and keyboard movement/accessibility improvements.
- Add observability around failed writes and API latency.
- Replace possession-only links with revocable share tokens if this were production software.

## Not completed in Part 1

- Real-time synchronization between already-open browser sessions
- Presence or live cursors
- Undo/redo and version history
- Automated test coverage

These were deliberately left out to keep Part 1 within the shared timebox and preserve room to adapt the design after unlocking Part 2.

# Part 2 Notes

## Realtime approach

I kept Postgres and the existing route handlers as the durable source of truth. After a create or update succeeds through the API, the browser broadcasts the saved note to the board's Supabase Realtime channel. Other open clients merge that note into local state immediately. Each client also fetches the latest board after subscribing or reconnecting, which repairs missed transient messages.

I chose Broadcast instead of subscribing directly to Postgres changes. That let me keep the `boards` and `notes` tables closed to anonymous browser reads and avoid adding broad RLS policies only for this exercise. The tradeoff is a small failure window between a successful API write and the client's broadcast. Reconnect reconciliation repairs that state, but another already-connected client may not see the update immediately if that one broadcast fails.

## Concurrent updates

The API already patches only the fields that changed. A move sends `x` and `y`; text editing sends `text`; color changes send `color`. That means two people changing different notes, or different fields on the same note, do not overwrite unrelated data.

The client also protects the field it is actively changing when a remote snapshot arrives: text is preserved while the local textarea is focused, and coordinates are preserved during a local drag. Once the local interaction is saved, its persisted row is broadcast.

For simultaneous text editing of the exact same note, I used a pragmatic soft lock. Presence shows who is editing a note and makes that textarea read-only for other clients. There is still a narrow race if both people focus the note before presence syncs; in that case the database uses last-write-wins for the text field. With more time I would add optimistic concurrency with a text revision and a small conflict-resolution UI, or move text to a CRDT if true character-level co-editing were a product requirement.

## Presence and cursors

Each tab gets a session-scoped anonymous ID and joins the board channel. Presence tracks online status plus slow-changing activity (`idle`, `editing`, or `dragging`) and the active note. Cursor coordinates are sent separately with Broadcast and throttled to roughly 20 updates per second; they are intentionally not stored in Postgres.

## What Part 1 absorbed cleanly

The server repository and field-level PATCH routes remained unchanged. Part 2 was mostly additive: a browser Realtime client, a board snapshot GET route for reconciliation, and interaction signals from the existing note component.

The main rework was moving the board component from purely local optimistic state to merge-aware state. If I had known Part 2 in advance, I would have made local interaction state and remote reconciliation explicit from the beginning.

## Time split

- Part 1: approximately 90 minutes, including setup and persistence debugging.
- Part 2: approximately 55 minutes for Broadcast, Presence, cursors, reconciliation, and documentation.
- Final verification and recording: approximately 20 minutes.

## Known limits and next steps

- The same-note text race described above is soft-locked, not mathematically conflict-free.
- Broadcast delivery is transient; reconnect reconciliation covers missed messages but there is no periodic background reconciliation while a socket appears healthy.
- Anonymous display names are generated per tab rather than chosen by users.
- Cursor updates are best-effort and disappear after three seconds without a new event.
- I would add multi-client browser tests and an explicit connection-state indicator next.
