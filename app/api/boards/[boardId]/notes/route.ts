import { createNote } from "@/lib/boards-repository";
import { isUuid, parseCreateNote } from "@/lib/validation";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;
  if (!isUuid(boardId)) {
    return Response.json({ error: "Invalid board id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseCreateNote(body);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const note = await createNote(boardId, parsed.value);
    if (!note) {
      return Response.json({ error: "Board not found." }, { status: 404 });
    }
    return Response.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not create the note." }, { status: 500 });
  }
}
