import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Board, BoardWithNotes, NotePatch, StickyNote } from "@/lib/types";

type BoardRow = {
  id: string;
  created_at: string;
};

type NoteRow = {
  id: string;
  board_id: string;
  text: string;
  color: StickyNote["color"];
  x: number;
  y: number;
  created_at: string;
  updated_at: string;
};

export async function createBoard(): Promise<Board> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("boards")
    .insert({})
    .select("id, created_at")
    .single();

  if (error) throw new Error(`Could not create board: ${error.message}`);
  return mapBoard(data as BoardRow);
}

export async function getBoardWithNotes(boardId: string): Promise<BoardWithNotes | null> {
  const db = getSupabaseAdmin();

  const [{ data: board, error: boardError }, { data: notes, error: notesError }] =
    await Promise.all([
      db.from("boards").select("id, created_at").eq("id", boardId).maybeSingle(),
      db
        .from("notes")
        .select("id, board_id, text, color, x, y, created_at, updated_at")
        .eq("board_id", boardId)
        .order("created_at", { ascending: true }),
    ]);

  if (boardError) throw new Error(`Could not load board: ${boardError.message}`);
  if (notesError) throw new Error(`Could not load notes: ${notesError.message}`);
  if (!board) return null;

  return {
    ...mapBoard(board as BoardRow),
    notes: ((notes ?? []) as NoteRow[]).map(mapNote),
  };
}

export async function createNote(
  boardId: string,
  input: Pick<StickyNote, "text" | "color" | "x" | "y">,
): Promise<StickyNote | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("notes")
    .insert({ board_id: boardId, ...input })
    .select("id, board_id, text, color, x, y, created_at, updated_at")
    .maybeSingle();

  if (error?.code === "23503") return null;
  if (error) throw new Error(`Could not create note: ${error.message}`);
  if (!data) return null;

  return mapNote(data as NoteRow);
}

export async function updateNote(
  boardId: string,
  noteId: string,
  patch: NotePatch,
): Promise<StickyNote | null> {
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("notes")
    .update(patch)
    .eq("id", noteId)
    .eq("board_id", boardId)
    .select("id, board_id, text, color, x, y, created_at, updated_at")
    .maybeSingle();

  if (error) throw new Error(`Could not update note: ${error.message}`);
  if (!data) return null;

  return mapNote(data as NoteRow);
}

function mapBoard(row: BoardRow): Board {
  return { id: row.id, createdAt: row.created_at };
}

function mapNote(row: NoteRow): StickyNote {
  return {
    id: row.id,
    boardId: row.board_id,
    text: row.text,
    color: row.color,
    x: row.x,
    y: row.y,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
