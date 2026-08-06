"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  NOTE_HEIGHT,
  NOTE_TEXT_LIMIT,
  NOTE_WIDTH,
} from "@/lib/board-constants";
import { NOTE_COLORS, type NoteColor, type StickyNote } from "@/lib/types";

type Position = Pick<StickyNote, "x" | "y">;
type Activity = "idle" | "editing" | "dragging";

type StickyNoteCardProps = {
  note: StickyNote;
  selected: boolean;
  remoteActivity: { name: string; activity: Activity } | null;
  onSelect: () => void;
  onActivityChange: (activity: Activity) => void;
  onMove: (position: Position) => void;
  onTextChange: (text: string) => void;
  onColorChange: (color: NoteColor) => void;
  onPersistText: (text: string) => Promise<void>;
};

type DragState = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

export function StickyNoteCard({
  note,
  selected,
  remoteActivity,
  onSelect,
  onActivityChange,
  onMove,
  onTextChange,
  onColorChange,
  onPersistText,
}: StickyNoteCardProps) {
  const [position, setPosition] = useState<Position>({ x: note.x, y: note.y });
  const drag = useRef<DragState | null>(null);
  const nextPosition = useRef<Position | null>(null);
  const animationFrame = useRef<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedText = useRef(note.text);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!drag.current) setPosition({ x: note.x, y: note.y });
  }, [note.x, note.y]);

  useEffect(() => {
    if (document.activeElement !== textareaRef.current) {
      lastSavedText.current = note.text;
    }
  }, [note.text]);

  useEffect(() => {
    return () => {
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("textarea, button")) return;
    if (remoteActivity?.activity === "dragging") return;

    onSelect();
    onActivityChange("dragging");
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: position.x,
      startY: position.y,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const currentDrag = drag.current;
    if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

    nextPosition.current = {
      x: clamp(
        currentDrag.startX + event.clientX - currentDrag.startClientX,
        0,
        BOARD_WIDTH - NOTE_WIDTH,
      ),
      y: clamp(
        currentDrag.startY + event.clientY - currentDrag.startClientY,
        0,
        BOARD_HEIGHT - NOTE_HEIGHT,
      ),
    };

    if (animationFrame.current !== null) return;
    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null;
      if (nextPosition.current) setPosition(nextPosition.current);
    });
  }

  function finishDrag(event: ReactPointerEvent<HTMLElement>) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;

    drag.current = null;
    const finalPosition = nextPosition.current ?? position;
    nextPosition.current = null;
    setPosition(finalPosition);
    onMove(finalPosition);
    onActivityChange("idle");
  }

  function handleTextChange(text: string) {
    onTextChange(text);
    if (saveTimer.current) clearTimeout(saveTimer.current);

    saveTimer.current = setTimeout(() => {
      if (text === lastSavedText.current) return;
      void onPersistText(text)
        .then(() => {
          lastSavedText.current = text;
        })
        .catch(() => undefined);
    }, 550);
  }

  async function flushText() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (note.text === lastSavedText.current) return;

    try {
      await onPersistText(note.text);
      lastSavedText.current = note.text;
    } catch {
      // The board-level save handler already surfaces the error.
    }
  }

  const remoteEditor = remoteActivity?.activity === "editing" ? remoteActivity.name : null;

  return (
    <article
      className={`sticky-note sticky-note--${note.color}${selected ? " is-selected" : ""}${remoteActivity ? " is-remote-active" : ""}`}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onClick={onSelect}
      aria-label="Sticky note"
    >
      {remoteActivity ? (
        <div className="remote-note-badge">
          {remoteActivity.name} is {remoteActivity.activity}
        </div>
      ) : null}

      <div className="note-grab-row" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <textarea
        ref={textareaRef}
        aria-label="Note text"
        value={note.text}
        maxLength={NOTE_TEXT_LIMIT}
        placeholder={remoteEditor ? `${remoteEditor} is editing…` : "Type something…"}
        readOnly={Boolean(remoteEditor)}
        onFocus={() => {
          if (!remoteEditor) onActivityChange("editing");
        }}
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => handleTextChange(event.target.value)}
        onBlur={() => {
          void flushText().finally(() => onActivityChange("idle"));
        }}
      />

      <div className="note-footer">
        <div className="color-picker" role="group" aria-label="Note color">
          {NOTE_COLORS.map((color) => (
            <button
              key={color}
              className={`color-swatch color-swatch--${color}`}
              type="button"
              aria-label={`Use ${color}`}
              aria-pressed={note.color === color}
              onClick={() => onColorChange(color)}
            />
          ))}
        </div>
        <span className="character-count">{note.text.length}/{NOTE_TEXT_LIMIT}</span>
      </div>
    </article>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.round(Math.min(Math.max(value, min), max));
}
