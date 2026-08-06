
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="landing-page">
      <section className="landing-card compact-card">
        <p className="eyebrow">Board not found</p>
        <h1>This link does not point to a board.</h1>
        <p className="landing-copy">Check the URL, or start a new board.</p>
        <Link className="primary-button link-button" href="/">Create a board</Link>
      </section>
    </main>
  );
}
