interface HomeScreenProps {
  onPlay: () => void;
}

export function HomeScreen({ onPlay }: HomeScreenProps) {
  return (
    <main className="screen home-screen">
      <div className="home-backdrop" aria-hidden="true" />
      <div className="home-stage">
        <header className="home-brand">
          <p className="home-eyebrow">Goat Format</p>
          <h1 className="home-title">GOAT DUEL</h1>
          <p className="home-subtitle">Online GOAT-format duels</p>
        </header>
        <button type="button" className="home-play-btn" onClick={onPlay} autoFocus>
          Play
        </button>
      </div>
    </main>
  );
}
