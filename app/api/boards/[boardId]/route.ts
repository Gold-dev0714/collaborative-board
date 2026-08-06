import { getBoardWithNotes } from "@/lib/boards-repository";
import { isUuid } from "@/lib/validation";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ boardId: string }> },
) {
  const { boardId } = await params;
  if (!isUuid(boardId)) {
    return Response.json({ error: "Invalid board id." }, { status: 400 });
  }

  try {
    const board = await getBoardWithNotes(boardId);
    if (!board) {
      return Response.json({ error: "Board not found." }, { status: 404 });
    }

    return Response.json(board);
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not load the board." }, { status: 500 });
  }
}
