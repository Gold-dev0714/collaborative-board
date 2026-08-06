"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="landing-page">
      <section className="landing-card compact-card">
        <p className="eyebrow">Something went wrong</p>
        <h1>The board could not be loaded.</h1>
        <p className="landing-copy">The database may be unavailable. Try once more.</p>
        <button className="primary-button" type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  );
}
