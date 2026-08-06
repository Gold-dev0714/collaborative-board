// Fetches a challenge spec from the hosted endpoint and writes it to disk.
//
//   node scripts/fetch-spec.mjs 1   ->  writes README-CHALLENGE.md (Part 1)
//   node scripts/fetch-spec.mjs 2   ->  writes PART-2.md          (Part 2)
//
// You normally run this via `npm run start-challenge` / `npm run phase-2`.
//
// It needs to know who you are so we can send you the right thing — set the
// CANDIDATE_ID we emailed you. Easiest: copy .env.example to .env and fill it in.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- config -----------------------------------------------------------------
// Set at deploy time. This is the workers.dev URL of the deployed spec Worker.
const ENDPOINT = "https://board-challenge.matt-pistone.workers.dev";
// ----------------------------------------------------------------------------

const OUT = { "1": "README-CHALLENGE.md", "2": "PART-2.md" };

function loadCandidateId() {
  if (process.env.CANDIDATE_ID) return process.env.CANDIDATE_ID.trim();
  const envPath = join(root, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*CANDIDATE_ID\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return null;
}

function die(msg) {
  console.error("\n  " + msg + "\n");
  process.exit(1);
}

const phase = process.argv[2];
if (!OUT[phase]) die("Usage: node scripts/fetch-spec.mjs <1|2>");

if (ENDPOINT.includes("REPLACE-ME")) {
  die("This launcher hasn't been configured with an endpoint yet. Please contact us.");
}

const candidateId = loadCandidateId();
if (!candidateId) {
  die(
    "No CANDIDATE_ID found.\n" +
      "  Copy .env.example to .env and paste in the id from your invite email:\n" +
      "    cp .env.example .env",
  );
}

const url = `${ENDPOINT}/?name=${encodeURIComponent(candidateId)}&phase=${phase}`;

try {
  const res = await fetch(url);
  const body = await res.text();
  if (!res.ok) {
    die(`Couldn't fetch the spec (HTTP ${res.status}).\n  Server said: ${body.trim()}`);
  }
  const outFile = OUT[phase];
  writeFileSync(join(root, outFile), body);
  const label = phase === "1" ? "Part 1" : "Part 2";
  console.log(`\n  ${label} written to ${outFile} — open it and get started.\n`);
} catch (err) {
  die(`Network error fetching the spec: ${err.message}`);
}
