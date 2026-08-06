import { updateNote } from "@/lib/boards-repository";
import { isUuid, parseNotePatch } from "@/lib/validation";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ boardId: string; noteId: string }> },
) {
  const { boardId, noteId } = await params;
  if (!isUuid(boardId) || !isUuid(noteId)) {
    return Response.json({ error: "Invalid board or note id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseNotePatch(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const note = await updateNote(boardId, noteId, parsed.value);
    if (!note) {
      return Response.json({ error: "Note not found." }, { status: 404 });
    }
    return Response.json(note);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not update the note." }, { status: 500 });
  }
}
