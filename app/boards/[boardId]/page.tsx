import { notFound } from "next/navigation";
import { BoardCanvas } from "@/components/board-canvas";
import { getBoardWithNotes } from "@/lib/boards-repository";
import { isUuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  if (!isUuid(boardId)) notFound();

  const board = await getBoardWithNotes(boardId);
  if (!board) return notFound();

  return <BoardCanvas board={board} />;
}
