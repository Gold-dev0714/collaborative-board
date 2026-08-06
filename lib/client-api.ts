import type { Board, NoteColor, NotePatch, StickyNote } from "@/lib/types";

export async function createBoardRequest(): Promise<Board> {
  return request<Board>("/api/boards", { method: "POST" });
}

export async function createNoteRequest(
  boardId: string,
  input: { text: string; color: NoteColor; x: number; y: number },
): Promise<StickyNote> {
  return request<StickyNote>(`/api/boards/${boardId}/notes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateNoteRequest(
  boardId: string,
  noteId: string,
  patch: NotePatch,
): Promise<StickyNote> {
  return request<StickyNote>(`/api/boards/${boardId}/notes/${noteId}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    const message =
      isErrorPayload(payload) && payload.error ? payload.error : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

function isErrorPayload(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null && "error" in value;
}
