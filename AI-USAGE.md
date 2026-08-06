# AI Usage

## Tools Used

- ChatGPT
- Supabase documentation and dashboard
- Standard development tools including VS Code, Git, npm, ESLint, and TypeScript

## Full Session Log

The complete ChatGPT conversation used during this assessment is included with the repository:

- `ai-session/chatgpt-session-export.[html|pdf|json]`

Alternatively:

- [ChatGPT session log](PASTE_EXPORTED_SESSION_LINK_HERE)

The session log was exported from ChatGPT rather than manually reconstructed.

## How AI Was Used

I used ChatGPT as an AI-assisted development partner throughout the exercise. The main areas of assistance were:

- interpreting the Part 1 and Part 2 requirements
- comparing architecture options within the 2–3 hour time limit
- scaffolding the Next.js and TypeScript application structure
- designing the Supabase Postgres schema
- implementing board and sticky-note persistence
- designing the realtime collaboration approach
- adding Supabase Broadcast and Presence
- reasoning about concurrent updates and conflict behavior
- troubleshooting Supabase configuration
- reviewing React, TypeScript, and ESLint errors
- improving documentation and explaining technical tradeoffs

## Development Approach

I did not treat the AI output as automatically correct. I used it to generate options and implementation drafts, then reviewed and adjusted the results based on the application requirements.

My workflow was generally:

1. Describe the current requirement or error.
2. Ask for a focused implementation or design recommendation.
3. Review the proposed code and architecture.
4. Integrate the relevant changes into the existing codebase.
5. Run the application locally.
6. Test the behavior in one or more browser sessions.
7. Run linting, type checking, and production build checks.
8. Return to the AI with specific errors or unexpected behavior.
9. Apply and verify the resulting fixes.

## Key Decisions Reviewed With AI

### Application stack

I selected Next.js, React, and TypeScript because they allowed the frontend, server routes, and deployment structure to remain in one small codebase.

Supabase Postgres was used for durable board and note storage.

### Persistence boundary

Browser clients do not access the database with elevated permissions. Persistent operations go through Next.js server routes, where the Supabase secret key remains server-side.

### Note updates

Updates are sent as partial note patches rather than replacing the complete board state.

For example:

- dragging updates position fields
- text editing updates the text field
- color selection updates the color field

This reduces the chance that unrelated changes overwrite each other.

### Realtime collaboration

For Part 2, I kept Postgres as the durable source of truth and added Supabase Realtime for immediate client-to-client updates.

- Broadcast distributes successfully persisted note changes.
- Presence tracks connected clients and their current activity.
- Cursor messages are temporary and are not stored in the database.
- Clients reconcile with the persisted board state after connecting or reconnecting.

### Concurrent text editing

The implementation uses Presence as a lightweight indicator or soft lock when another participant is editing a note.

This works for the expected demonstration scenario, but it is not a complete distributed locking system. Two users who begin editing the same note at nearly the same time may still produce a last-write-wins result.

With more time, I would add optimistic concurrency through revision numbers or evaluate a CRDT-based text model.

## Human Review and Validation

I personally completed the environment setup and validation steps, including:

- creating and configuring the Supabase project
- running the database schema
- configuring environment variables
- testing board creation and persistence
- testing note creation, editing, color changes, and dragging
- testing the same board in multiple browser sessions
- reviewing realtime presence and cursor behavior
- resolving React ref usage and linting errors
- reviewing the Git history and ignored files
- running the project’s lint, type-check, and build commands

I also reviewed the implementation for unnecessary abstractions and kept the solution intentionally focused on the assessment’s time and scope.

## Where AI Output Required Adjustment

Some AI-generated suggestions required correction or refinement during implementation.

Examples included:

- adapting code to the actual project structure
- correcting environment and Supabase configuration details
- resolving a React lint rule that prohibited reading a ref during render
- replacing render-time ref access with stable component state
- ensuring private environment files and generated build files were excluded from Git
- narrowing the architecture to fit the challenge’s limited time budget

These adjustments were made after running the code and reviewing actual development errors.

## Known Limitations

The final solution intentionally prioritizes the common collaboration flow over production-level distributed conflict resolution.

Known limitations include:

- simultaneous text editing of the exact same note is not fully conflict-free
- guest identities are temporary and browser-session based
- cursor updates are ephemeral
- automated multi-client browser tests were not added
- offline editing and advanced reconnect behavior are limited
- authentication and board-level permissions are outside the assessment scope

## Summary

AI was used heavily, as encouraged by the challenge, for architecture exploration, implementation assistance, debugging, and documentation.

The final decisions were based on manual review, local testing, observed errors, and the requirements of the exercise rather than accepting generated output without verification.

