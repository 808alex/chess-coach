import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { useRoute, go } from './lib/nav';
import { Home, Settings } from './pages/Home';
import { Play } from './pages/Play';
import { Learn } from './pages/Learn';
import { Openings } from './pages/Openings';
import { Puzzles } from './pages/Puzzles';
import { Review } from './pages/Review';
import { Trophies } from './pages/Trophies';
import { currentStreak, getSettings, getUnlocked, saveSettings } from './lib/storage';
import { useSettings } from './lib/useSettings';
import { play } from './lib/sound';
import { checkAchievements, type Achievement } from './lib/achievements';
import { getAnalysisEngine, getBotEngine } from './engine/browserEngine';
import { Medal } from './components/Medal';
import { Icon } from './components/Icon';

const NAV = [
  ['home', 'Home', '♔'],
  ['play', 'Play', '♘'],
  ['learn', 'Learn', '♗'],
  ['openings', 'Openings', '♙'],
  ['puzzles', 'Puzzles', '♖'],
  ['review', 'Review', '♕'],
  ['trophies', 'Trophies', '♚'],
  ['settings', 'Settings', '⚙'],
] as const;

export default function App() {
  const r = useRoute();
  const settings = useSettings();
  const [toasts, setToasts] = useState<(Achievement & { key: number })[]>([]);
  const [streak, setStreak] = useState(currentStreak());

  // Warm the engines up in the background so the first grade and first bot move are instant.
  useEffect(() => {
    const t = setTimeout(() => {
      const start = new Chess().fen();
      getAnalysisEngine().analyse(start, { depth: 8 }).catch(() => {});
      getBotEngine().analyse(start, { depth: 4 }).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Night mode lives on the root element so every page picks it up.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-night', settings.night);
  }, [settings.night]);

  // Achievements: silently record what's already earned, then celebrate new ones as they happen.
  useEffect(() => {
    if (!Object.keys(getUnlocked()).length) checkAchievements();
    const onData = () => {
      setStreak(currentStreak());
      const fresh = checkAchievements();
      if (!fresh.length) return;
      setTimeout(() => play('brilliant'), 600);
      setToasts((t) => [...t, ...fresh.map((a, i) => ({ ...a, key: Date.now() + i }))]);
    };
    window.addEventListener('cc-data', onData);
    return () => window.removeEventListener('cc-data', onData);
  }, []);
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((x) => x.slice(1)), 4600);
    return () => clearTimeout(t);
  }, [toasts]);

  const toggle = (key: 'sound' | 'night') => {
    const s = { ...getSettings(), [key]: !getSettings()[key] };
    saveSettings(s);
    if (key === 'sound' && s.sound) play('move');
  };

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
          <div className={`streak-pill ${streak > 0 ? 'on' : ''}`} title="Days in a row you've trained">
            <Icon name="fire" size="1.15em" />
            <b>{streak}</b> day streak
          </div>
          <button className="ghost side-toggle" onClick={() => toggle('night')} aria-pressed={settings.night}>
            <Icon name={settings.night ? 'sun' : 'moon'} size="1.1em" />
            {settings.night ? 'Normal mode' : 'Night mode'}
          </button>
          <button className="ghost side-toggle" onClick={() => toggle('sound')} aria-pressed={settings.sound}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" />
              {settings.sound ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
            </svg>
            {settings.sound ? 'Sound on' : 'Sound off'}
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
          {r.page === 'trophies' && <Trophies />}
          {r.page === 'settings' && <Settings />}
        </div>
      </main>
      <div className="toasts" aria-live="polite">
        {toasts.slice(0, 1).map((t) => (
          <button key={t.key} className="toast" onClick={() => go('trophies')}>
            <Medal a={t} unlocked />
            <span>
              <span className="toast-kicker">Achievement unlocked</span>
              <b>{t.name}</b>
              <span className="muted small">{t.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
