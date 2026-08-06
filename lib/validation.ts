import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  NOTE_HEIGHT,
  NOTE_TEXT_LIMIT,
  NOTE_WIDTH,
} from "@/lib/board-constants";
import { NOTE_COLORS, type NoteColor, type NotePatch } from "@/lib/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isNoteColor(value: unknown): value is NoteColor {
  return typeof value === "string" && NOTE_COLORS.includes(value as NoteColor);
}

export function clampPosition(x: number, y: number) {
  return {
    x: Math.round(Math.min(Math.max(0, x), BOARD_WIDTH - NOTE_WIDTH)),
    y: Math.round(Math.min(Math.max(0, y), BOARD_HEIGHT - NOTE_HEIGHT)),
  };
}

export function parseCreateNote(input: unknown) {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  if (!isFiniteNumber(input.x) || !isFiniteNumber(input.y)) {
    return { ok: false as const, error: "x and y must be finite numbers." };
  }

  if (!isNoteColor(input.color)) {
    return { ok: false as const, error: "Unsupported note color." };
  }

  const text = typeof input.text === "string" ? input.text : "";
  if (text.length > NOTE_TEXT_LIMIT) {
    return { ok: false as const, error: `Text is limited to ${NOTE_TEXT_LIMIT} characters.` };
  }

  const position = clampPosition(input.x, input.y);
  return {
    ok: true as const,
    value: { ...position, color: input.color, text },
  };
}

export function parseNotePatch(input: unknown) {
  if (!isRecord(input)) {
    return { ok: false as const, error: "Request body must be an object." };
  }

  const patch: NotePatch = {};

  if ("text" in input) {
    if (typeof input.text !== "string") {
      return { ok: false as const, error: "text must be a string." };
    }
    if (input.text.length > NOTE_TEXT_LIMIT) {
      return { ok: false as const, error: `Text is limited to ${NOTE_TEXT_LIMIT} characters.` };
    }
    patch.text = input.text;
  }

  if ("color" in input) {
    if (!isNoteColor(input.color)) {
      return { ok: false as const, error: "Unsupported note color." };
    }
    patch.color = input.color;
  }

  const hasX = "x" in input;
  const hasY = "y" in input;
  if (hasX !== hasY) {
    return { ok: false as const, error: "x and y must be updated together." };
  }

  if (hasX && hasY) {
    if (!isFiniteNumber(input.x) || !isFiniteNumber(input.y)) {
      return { ok: false as const, error: "x and y must be finite numbers." };
    }
    Object.assign(patch, clampPosition(input.x, input.y));
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false as const, error: "No supported fields were provided." };
  }

  return { ok: true as const, value: patch };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
