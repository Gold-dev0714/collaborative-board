export const NOTE_COLORS = ["yellow", "pink", "blue", "green"] as const;

export type NoteColor = (typeof NOTE_COLORS)[number];

export type Board = {
  id: string;
  createdAt: string;
};

export type StickyNote = {
  id: string;
  boardId: string;
  text: string;
  color: NoteColor;
  x: number;
  y: number;
  createdAt: string;
  updatedAt: string;
};

export type BoardWithNotes = Board & {
  notes: StickyNote[];
};

export type NotePatch = Partial<Pick<StickyNote, "text" | "color" | "x" | "y">>;
