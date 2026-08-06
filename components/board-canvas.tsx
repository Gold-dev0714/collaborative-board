"use client";

import Link from "next/link";
import {
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { StickyNoteCard } from "@/components/sticky-note-card";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  NOTE_WIDTH,
} from "@/lib/board-constants";
import { createNoteRequest, updateNoteRequest } from "@/lib/client-api";
import { clampPosition } from "@/lib/validation";
import type { BoardWithNotes, NoteColor, NotePatch } from "@/lib/types";

type BoardCanvasProps = {
  board: BoardWithNotes;
};

export function BoardCanvas({ board }: BoardCanvasProps) {
  const [notes, setNotes] = useState(board.notes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  async function addNoteAt(x: number, y: number) {
    const position = clampPosition(x - NOTE_WIDTH / 2, y - 24);
    setSavingCount((count) => count + 1);
    setMessage(null);

    try {
      const note = await createNoteRequest(board.id, {
        text: "",
        color: "yellow",
        ...position,
      });
      setNotes((current) => [...current, note]);
      setSelectedId(note.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add the note.");
    } finally {
      setSavingCount((count) => count - 1);
    }
  }

  function addNoteInView() {
    const viewport = viewportRef.current;
    if (!viewport) return;

    void addNoteAt(
      viewport.scrollLeft + viewport.clientWidth / 2,
      viewport.scrollTop + viewport.clientHeight / 2,
    );
  }

  function handleCanvasDoubleClick(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const rect = event.currentTarget.getBoundingClientRect();
    void addNoteAt(event.clientX - rect.left, event.clientY - rect.top);
  }

  function updateLocal(noteId: string, patch: NotePatch) {
    setNotes((current) =>
      current.map((note) => (note.id === noteId ? { ...note, ...patch } : note)),
    );
  }

  async function persist(noteId: string, patch: NotePatch) {
    setSavingCount((count) => count + 1);
    setMessage(null);

    try {
      const saved = await updateNoteRequest(board.id, noteId, patch);
      setNotes((current) =>
        current.map((note) =>
          note.id === noteId ? { ...note, updatedAt: saved.updatedAt } : note,
        ),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save the note.");
      throw error;
    } finally {
      setSavingCount((count) => count - 1);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Board link copied.");
      window.setTimeout(() => setMessage(null), 1800);
    } catch {
      setMessage("Copy failed. Copy the URL from your browser instead.");
    }
  }

  return (
    <main className="board-shell">
      <header className="board-toolbar">
        <div>
          <Link className="brand-link" href="/">Pocket Board</Link>
          <span className="board-id">Board {board.id.slice(0, 8)}</span>
        </div>

        <div className="toolbar-actions">
          <span className={`save-state${savingCount ? " is-saving" : ""}`}>
            {savingCount ? "Saving…" : "Saved"}
          </span>
          <button className="secondary-button" type="button" onClick={() => void copyLink()}>
            Copy link
          </button>
          <button className="primary-button compact" type="button" onClick={addNoteInView}>
            + Add note
          </button>
        </div>
      </header>

      {message ? <div className="board-message" role="status">{message}</div> : null}

      <div className="board-hint">Double-click empty space to add a note. Drag any note to move it.</div>

      <div className="canvas-viewport" ref={viewportRef}>
        <div
          ref={canvasRef}
          className="board-canvas"
          style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT }}
          onDoubleClick={handleCanvasDoubleClick}
          onPointerDown={(event: ReactPointerEvent<HTMLDivElement>) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          {notes.length === 0 ? (
            <button
              className="empty-board-prompt"
              type="button"
              onClick={() => void addNoteAt(BOARD_WIDTH / 2, BOARD_HEIGHT / 2)}
            >
              Add the first note
            </button>
          ) : null}

          {notes.map((note) => (
            <StickyNoteCard
              key={note.id}
              note={note}
              selected={selectedId === note.id}
              onSelect={() => setSelectedId(note.id)}
              onMove={(position) => {
                updateLocal(note.id, position);
                void persist(note.id, position).catch(() => undefined);
              }}
              onTextChange={(text) => updateLocal(note.id, { text })}
              onColorChange={(color: NoteColor) => {
                updateLocal(note.id, { color });
                void persist(note.id, { color }).catch(() => undefined);
              }}
              onPersistText={(text) => persist(note.id, { text })}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
