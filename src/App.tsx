import { useState } from 'react';
import { useRoute, go } from './lib/nav';
import { Home, Settings } from './pages/Home';
import { Play } from './pages/Play';
import { Learn } from './pages/Learn';
import { Openings } from './pages/Openings';
import { Puzzles } from './pages/Puzzles';
import { Review } from './pages/Review';
import { getSettings, saveSettings } from './lib/storage';
import { play } from './lib/sound';

const NAV = [
  ['home', 'Home', '♔'],
  ['play', 'Play', '♘'],
  ['learn', 'Learn', '♗'],
  ['openings', 'Openings', '♙'],
  ['puzzles', 'Puzzles', '♖'],
  ['review', 'Review', '♕'],
  ['settings', 'Settings', '⚙'],
] as const;

export default function App() {
  const r = useRoute();
  const [soundOn, setSoundOn] = useState(getSettings().sound);
  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="brand" onClick={() => go('home')}>
          <span className="brand-mark">♞</span>
          <span className="brand-name">Chess Coach</span>
        </div>
        {NAV.map(([id, label, icon]) => (
          <a key={id} href={`#/${id}`} className={r.page === id ? 'active' : ''} aria-current={r.page === id ? 'page' : undefined}>
            <span className="nav-icon" aria-hidden>
              {icon}
            </span>
            <span className="nav-label">{label}</span>
          </a>
        ))}
        <div className="sidebar-foot">
          <button
            className="ghost sound-toggle"
            onClick={() => {
              const s = { ...getSettings(), sound: !soundOn };
              saveSettings(s);
              setSoundOn(s.sound);
              if (s.sound) play('move');
            }}
            aria-pressed={soundOn}
          >
            {soundOn ? '🔊 Sound on' : '🔇 Sound off'}
          </button>
        </div>
      </nav>
      <main>
        <div className="route" key={r.page + '/' + (r.arg ?? '')}>
          {r.page === 'home' && <Home />}
          {r.page === 'play' && <Play />}
          {r.page === 'learn' && <Learn arg={r.arg} />}
          {r.page === 'openings' && <Openings arg={r.arg} />}
          {r.page === 'puzzles' && <Puzzles arg={r.arg} />}
          {r.page === 'review' && <Review arg={r.arg} />}
          {r.page === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}
