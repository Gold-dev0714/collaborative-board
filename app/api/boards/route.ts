import { createBoard } from "@/lib/boards-repository";

export async function POST() {
  try {
    const board = await createBoard();
    return Response.json(board, { status: 201 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: "Could not create the board." }, { status: 500 });
  }
}
