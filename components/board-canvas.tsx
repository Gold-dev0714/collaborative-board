"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import Link from "next/link";
import {
  useEffect,
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
import {
  createNoteRequest,
  getBoardRequest,
  updateNoteRequest,
} from "@/lib/client-api";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import type {
  BoardWithNotes,
  NoteColor,
  NotePatch,
  StickyNote,
} from "@/lib/types";
import { clampPosition } from "@/lib/validation";

type BoardCanvasProps = {
  board: BoardWithNotes;
};

type Activity = "idle" | "editing" | "dragging";

type Participant = {
  clientId: string;
  name: string;
  activity: Activity;
  activeNoteId: string | null;
  onlineAt: string;
};

type ClientIdentity = Pick<
  Participant,
  "clientId" | "name" | "onlineAt"
>;

type CursorPosition = {
  clientId: string;
  name: string;
  x: number;
  y: number;
  seenAt: number;
};

type LocalActivity = Pick<
  Participant,
  "activity" | "activeNoteId"
>;

export function BoardCanvas({ board }: BoardCanvasProps) {
  const [notes, setNotes] = useState(board.notes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savingCount, setSavingCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<
    Record<string, CursorPosition>
  >({});

  /*
   * Identity is state rather than a ref because it is used while rendering
   * remoteParticipants. The value is created once for this component.
   */
  const [identity] = useState<ClientIdentity>(getClientIdentity);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localActivityRef = useRef<LocalActivity>({
    activity: "idle",
    activeNoteId: null,
  });
  const lastCursorSentAt = useRef(0);

  useEffect(() => {
    const supabase = getSupabaseBrowser();

    const channel = supabase.channel(`board:${board.id}`, {
      config: {
        broadcast: {
          self: false,
        },
        presence: {
          key: identity.clientId,
        },
      },
    });

    channelRef.current = channel;

    function syncPresence() {
      const state = channel.presenceState() as Record<
        string,
        Participant[]
      >;

      const nextParticipants = Object.values(state)
        .flat()
        .filter(isParticipant);

      setParticipants(nextParticipants);
    }

    async function reconcileFromServer() {
      try {
        const latest = await getBoardRequest(board.id);

        setNotes((current) =>
          mergeSnapshot(
            current,
            latest.notes,
            localActivityRef.current,
          ),
        );
      } catch {
        setMessage(
          "Live connection restored, but the latest board state could not be checked.",
        );
      }
    }

    channel
      .on("presence", { event: "sync" }, syncPresence)
      .on(
        "broadcast",
        { event: "note-saved" },
        ({ payload }) => {
          const note = readBroadcastNote(payload);
          if (!note) return;

          setNotes((current) =>
            upsertRemoteNote(
              current,
              note,
              localActivityRef.current,
            ),
          );
        },
      )
      .on(
        "broadcast",
        { event: "cursor" },
        ({ payload }) => {
          const cursor = readCursor(payload);

          if (
            !cursor ||
            cursor.clientId === identity.clientId
          ) {
            return;
          }

          setRemoteCursors((current) => ({
            ...current,
            [cursor.clientId]: {
              ...cursor,
              seenAt: Date.now(),
            },
          }));
        },
      )
      .on(
        "broadcast",
        { event: "cursor-left" },
        ({ payload }) => {
          const clientId = readClientId(payload);
          if (!clientId) return;

          setRemoteCursors((current) => {
            if (!(clientId in current)) {
              return current;
            }

            const next = { ...current };
            delete next[clientId];

            return next;
          });
        },
      )
      .subscribe((status) => {
        if (status !== "SUBSCRIBED") {
          return;
        }

        void channel.track({
          ...identity,
          activity: "idle" satisfies Activity,
          activeNoteId: null,
        });

        void reconcileFromServer();
      });

    const staleCursorTimer = window.setInterval(() => {
      const cutoff = Date.now() - 3000;

      setRemoteCursors((current) => {
        const activeEntries = Object.entries(current).filter(
          ([, cursor]) => cursor.seenAt >= cutoff,
        );

        if (
          activeEntries.length === Object.keys(current).length
        ) {
          return current;
        }

        return Object.fromEntries(activeEntries);
      });
    }, 1000);

    return () => {
      window.clearInterval(staleCursorTimer);
      channelRef.current = null;

      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [board.id, identity]);

  async function addNoteAt(x: number, y: number) {
    const position = clampPosition(
      x - NOTE_WIDTH / 2,
      y - 24,
    );

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
      broadcastSavedNote(note);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not add the note.",
      );
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

  function handleCanvasDoubleClick(
    event: ReactMouseEvent<HTMLDivElement>,
  ) {
    if (event.target !== event.currentTarget) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();

    void addNoteAt(
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }

  function updateLocal(
    noteId: string,
    patch: NotePatch,
  ) {
    setNotes((current) =>
      current.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...patch,
            }
          : note,
      ),
    );
  }

  async function persist(
    noteId: string,
    patch: NotePatch,
  ) {
    setSavingCount((count) => count + 1);
    setMessage(null);

    try {
      const saved = await updateNoteRequest(
        board.id,
        noteId,
        patch,
      );

      setNotes((current) =>
        current.map((note) =>
          note.id === noteId
            ? {
                ...note,
                ...patch,
                updatedAt: saved.updatedAt,
              }
            : note,
        ),
      );

      broadcastSavedNote(saved);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the note.",
      );

      throw error;
    } finally {
      setSavingCount((count) => count - 1);
    }
  }

  function broadcastSavedNote(note: StickyNote) {
    const channel = channelRef.current;
    if (!channel) return;

    void channel.send({
      type: "broadcast",
      event: "note-saved",
      payload: {
        note,
      },
    });
  }

  function setLocalActivity(
    activity: Activity,
    activeNoteId: string | null,
  ) {
    localActivityRef.current = {
      activity,
      activeNoteId,
    };

    const channel = channelRef.current;
    if (!channel) return;

    void channel.track({
      ...identity,
      activity,
      activeNoteId,
    });
  }

  function broadcastCursor(
    event: ReactPointerEvent<HTMLDivElement>,
  ) {
    const channel = channelRef.current;
    if (!channel) return;

    const now = performance.now();

    if (now - lastCursorSentAt.current < 50) {
      return;
    }

    lastCursorSentAt.current = now;

    const rect = event.currentTarget.getBoundingClientRect();

    void channel.send({
      type: "broadcast",
      event: "cursor",
      payload: {
        clientId: identity.clientId,
        name: identity.name,
        x: clamp(
          event.clientX - rect.left,
          0,
          BOARD_WIDTH,
        ),
        y: clamp(
          event.clientY - rect.top,
          0,
          BOARD_HEIGHT,
        ),
      },
    });
  }

  function broadcastCursorLeft() {
    const channel = channelRef.current;
    if (!channel) return;

    void channel.send({
      type: "broadcast",
      event: "cursor-left",
      payload: {
        clientId: identity.clientId,
      },
    });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        window.location.href,
      );

      setMessage("Board link copied.");

      window.setTimeout(() => {
        setMessage(null);
      }, 1800);
    } catch {
      setMessage(
        "Copy failed. Copy the URL from your browser instead.",
      );
    }
  }

  const remoteParticipants = participants.filter(
    (participant) =>
      participant.clientId !== identity.clientId,
  );

  return (
    <main className="board-shell">
      <header className="board-toolbar">
        <div>
          <Link className="brand-link" href="/">
            Pocket Board
          </Link>

          <span className="board-id">
            Board {board.id.slice(0, 8)}
          </span>
        </div>

        <div className="toolbar-actions">
          <div
            className="presence-pill"
            title={remoteParticipants
              .map((person) => person.name)
              .join(", ")}
          >
            <span
              className="presence-dot"
              aria-hidden="true"
            />

            {Math.max(1, participants.length)} online
          </div>

          <span
            className={`save-state${
              savingCount ? " is-saving" : ""
            }`}
          >
            {savingCount ? "Saving…" : "Saved"}
          </span>

          <button
            className="secondary-button"
            type="button"
            onClick={() => void copyLink()}
          >
            Copy link
          </button>

          <button
            className="primary-button compact"
            type="button"
            onClick={addNoteInView}
          >
            + Add note
          </button>
        </div>
      </header>

      {message ? (
        <div className="board-message" role="status">
          {message}
        </div>
      ) : null}

      <div className="board-hint">
        Double-click empty space to add a note. Changes
        appear live in other open tabs.
      </div>

      <div
        className="canvas-viewport"
        ref={viewportRef}
      >
        <div
          className="board-canvas"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
          }}
          onDoubleClick={handleCanvasDoubleClick}
          onPointerMove={broadcastCursor}
          onPointerLeave={broadcastCursorLeft}
          onPointerDown={(
            event: ReactPointerEvent<HTMLDivElement>,
          ) => {
            if (event.target === event.currentTarget) {
              setSelectedId(null);
            }
          }}
        >
          {notes.length === 0 ? (
            <button
              className="empty-board-prompt"
              type="button"
              onClick={() =>
                void addNoteAt(
                  BOARD_WIDTH / 2,
                  BOARD_HEIGHT / 2,
                )
              }
            >
              Add the first note
            </button>
          ) : null}

          {notes.map((note) => {
            const remoteActivity =
              remoteParticipants.find(
                (person) =>
                  person.activeNoteId === note.id &&
                  person.activity !== "idle",
              );

            return (
              <StickyNoteCard
                key={note.id}
                note={note}
                selected={selectedId === note.id}
                remoteActivity={
                  remoteActivity
                    ? {
                        name: remoteActivity.name,
                        activity:
                          remoteActivity.activity,
                      }
                    : null
                }
                onSelect={() =>
                  setSelectedId(note.id)
                }
                onActivityChange={(activity) => {
                  setLocalActivity(
                    activity,
                    activity === "idle"
                      ? null
                      : note.id,
                  );
                }}
                onMove={(position) => {
                  updateLocal(note.id, position);

                  void persist(
                    note.id,
                    position,
                  ).catch(() => undefined);
                }}
                onTextChange={(text) => {
                  updateLocal(note.id, {
                    text,
                  });
                }}
                onColorChange={(color: NoteColor) => {
                  updateLocal(note.id, {
                    color,
                  });

                  void persist(note.id, {
                    color,
                  }).catch(() => undefined);
                }}
                onPersistText={(text) =>
                  persist(note.id, {
                    text,
                  })
                }
              />
            );
          })}

          {Object.values(remoteCursors).map(
            (cursor) => (
              <div
                key={cursor.clientId}
                className="remote-cursor"
                style={{
                  left: cursor.x,
                  top: cursor.y,
                }}
                aria-hidden="true"
              >
                <span className="remote-cursor-arrow">
                  ◆
                </span>

                <span className="remote-cursor-name">
                  {cursor.name}
                </span>
              </div>
            ),
          )}
        </div>
      </div>
    </main>
  );
}

function getClientIdentity(): ClientIdentity {
  /*
   * Client components may be pre-rendered by Next.js. Avoid accessing
   * sessionStorage when this function runs without a browser window.
   *
   * The identity is not rendered into the initial HTML, so the temporary
   * server value does not affect the visible server/client markup.
   */
  let clientId = crypto.randomUUID();

  if (typeof window !== "undefined") {
    const storageKey = "pocket-board-client-id";

    try {
      const storedClientId =
        window.sessionStorage.getItem(storageKey);

      if (storedClientId) {
        clientId = storedClientId;
      } else {
        window.sessionStorage.setItem(
          storageKey,
          clientId,
        );
      }
    } catch {
      /*
       * Some privacy modes can block sessionStorage.
       * A temporary ID still allows collaboration for this tab.
       */
    }
  }

  const suffix = clientId
    .replaceAll("-", "")
    .slice(-4)
    .toUpperCase();

  return {
    clientId,
    name: `Guest ${suffix}`,
    onlineAt: new Date().toISOString(),
  };
}

function upsertRemoteNote(
  current: StickyNote[],
  incoming: StickyNote,
  localActivity: LocalActivity,
): StickyNote[] {
  const index = current.findIndex(
    (note) => note.id === incoming.id,
  );

  if (index === -1) {
    return [...current, incoming];
  }

  const existing = current[index];

  if (
    Date.parse(incoming.updatedAt) <
    Date.parse(existing.updatedAt)
  ) {
    return current;
  }

  let merged = incoming;

  if (localActivity.activeNoteId === incoming.id) {
    if (localActivity.activity === "editing") {
      merged = {
        ...incoming,
        text: existing.text,
      };
    } else if (
      localActivity.activity === "dragging"
    ) {
      merged = {
        ...incoming,
        x: existing.x,
        y: existing.y,
      };
    }
  }

  const next = [...current];
  next[index] = merged;

  return next;
}

function mergeSnapshot(
  current: StickyNote[],
  latest: StickyNote[],
  localActivity: LocalActivity,
): StickyNote[] {
  return latest.map((incoming) => {
    const existing = current.find(
      (note) => note.id === incoming.id,
    );

    if (!existing) {
      return incoming;
    }

    if (
      localActivity.activeNoteId !== incoming.id
    ) {
      return incoming;
    }

    if (localActivity.activity === "editing") {
      return {
        ...incoming,
        text: existing.text,
      };
    }

    if (localActivity.activity === "dragging") {
      return {
        ...incoming,
        x: existing.x,
        y: existing.y,
      };
    }

    return incoming;
  });
}

function readBroadcastNote(
  payload: unknown,
): StickyNote | null {
  if (
    !isRecord(payload) ||
    !isStickyNote(payload.note)
  ) {
    return null;
  }

  return payload.note;
}

function readCursor(
  payload: unknown,
): Omit<CursorPosition, "seenAt"> | null {
  if (!isRecord(payload)) {
    return null;
  }

  if (
    typeof payload.clientId !== "string" ||
    typeof payload.name !== "string" ||
    typeof payload.x !== "number" ||
    typeof payload.y !== "number"
  ) {
    return null;
  }

  return {
    clientId: payload.clientId,
    name: payload.name,
    x: payload.x,
    y: payload.y,
  };
}

function readClientId(
  payload: unknown,
): string | null {
  return isRecord(payload) &&
    typeof payload.clientId === "string"
    ? payload.clientId
    : null;
}

function isParticipant(
  value: unknown,
): value is Participant {
  return (
    isRecord(value) &&
    typeof value.clientId === "string" &&
    typeof value.name === "string" &&
    (value.activity === "idle" ||
      value.activity === "editing" ||
      value.activity === "dragging") &&
    (value.activeNoteId === null ||
      typeof value.activeNoteId === "string") &&
    typeof value.onlineAt === "string"
  );
}

function isStickyNote(
  value: unknown,
): value is StickyNote {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.boardId === "string" &&
    typeof value.text === "string" &&
    typeof value.color === "string" &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}


