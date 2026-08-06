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
