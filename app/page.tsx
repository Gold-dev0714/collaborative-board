import { CreateBoardButton } from "@/components/create-board-button";

export default function HomePage() {
  return (
    <main className="landing-page">
      <section className="landing-card">
        <div className="landing-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">A tiny collaborative workspace</p>
        <h1>Put the idea somewhere everyone can see it.</h1>
        <p className="landing-copy">
          Create a board, drop a few notes, and share one link. No account or setup for your
          collaborators.
        </p>
        <CreateBoardButton />
      </section>
    </main>
  );
}
