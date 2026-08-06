"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBoardRequest } from "@/lib/client-api";

export function CreateBoardButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      const board = await createBoardRequest();
      router.push(`/boards/${board.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create a board.");
      setBusy(false);
    }
  }

  return (
    <div className="create-board-area">
      <button className="primary-button" type="button" onClick={handleCreate} disabled={busy}>
        {busy ? "Creating…" : "Create a board"}
      </button>
      {error ? <p className="inline-error">{error}</p> : null}
    </div>
  );
}
