# Take-Home Challenge: Collaborative Board

## Overview

Build a simple collaborative sticky-note board — think a lightweight FigJam/Miro. Users can create a board, add colored sticky notes to a canvas, move them around, edit their text, and share the board with others via a URL.

We expect you to use AI coding assistants (Claude Code, Cursor, ChatGPT, Copilot, etc.) heavily throughout this — that's how we work day to day, and how we expect you to work here. We're less interested in code you typed from scratch and more interested in how you direct, review, and adjust the output of AI tools on a real, moderately complex problem.

This is a two-part challenge. You have the full spec for Part 1 below. Once you have a working version you're happy with, you'll unlock Part 2, which builds on what you've already built. We're not telling you what Part 2 involves — figuring out how to extend your own design in-flight is part of what we're evaluating.

## Time expectation

Budget **2–3 hours total, across both parts**, however you want to split it. The clock is yours to spend: time spent polishing Part 1 is time you won't have for Part 2, so use your judgment about when it's "good enough."

We are not expecting a polished, production-ready product. We'd rather see clear thinking, reasonable tradeoffs, and honest handling of the parts you didn't get to than a feature-complete app with a shaky foundation. If you're at hour 3 and not done, stop, and tell us what you'd do next.

## Part 1 spec

Build a web app where:

- A user can create a new board and gets a shareable link/ID for it.
- On a board, a user can create sticky notes on a free-form canvas (drag to place, or click-to-add).
- Notes can be moved around the canvas (drag) and their text edited in place.
- Notes should support a small set of colors.
- State persists — reloading the page (or opening the link on another device) shows the same board.
- Anyone with the link can view and edit the board (no auth needed for this exercise).

You choose the stack. We'd suggest Node + React if you don't have a strong preference, but use whatever you're most effective in.

## How to unlock Part 2

When you have a working Part 1 you're satisfied with, make a commit marked "Part 1" run:

```
npm run phase-2
```

from the launcher directory. This fetches and unlocks the Part 2 spec and writes it to `PART-2.md`. Only run this when you're actually ready to move on — there's no way to "undo" it, and we're interested in seeing your Part 1 approach reflect Part 1 alone, not a spec you already knew was coming.

## What to include in your submission

A GitHub repo (public, or a private repo with us added as collaborators — details below) containing:

- Your code, with normal commit history (please don't squash into one commit — incremental commits help us see your process).
- A short `NOTES.md` covering: key decisions you made, what you'd do differently with more time, and anything you didn't get to.
- The full conversation history/session log from any AI assistant(s) you used. Please export this using the tool's own export or session-log feature rather than manually copying and pasting — whatever format that export produces is fine. If you used more than one tool, include all of them, in the order you used them.
- A 2-minute (or shorter) screen recording walking through what you built — a quick Loom/QuickTime/whatever-is-easiest is fine. No editing needed.

Send a link with your work to matt.pistone@encorestateplans.com or tag me in github at @mpistone once you're done, whether or not you finished everything.

## Questions

If anything in Part 1 is ambiguous, use your judgment and note the assumption in `NOTES.md` — that's a normal part of real feature work and we're happy with reasonable interpretations either way.
