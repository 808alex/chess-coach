import { useRoute, go } from './lib/nav';
import { Home, Settings } from './pages/Home';
import { Play } from './pages/Play';
import { Learn } from './pages/Learn';
import { Openings } from './pages/Openings';
import { Puzzles } from './pages/Puzzles';
import { Review } from './pages/Review';

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
  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <div className="brand" onClick={() => go('home')}>
          <span className="brand-mark">!?</span>
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
      </nav>
      <main>
        {r.page === 'home' && <Home />}
        {r.page === 'play' && <Play />}
        {r.page === 'learn' && <Learn arg={r.arg} key={r.arg ?? 'list'} />}
        {r.page === 'openings' && <Openings arg={r.arg} key={r.arg ?? 'list'} />}
        {r.page === 'puzzles' && <Puzzles arg={r.arg} />}
        {r.page === 'review' && <Review arg={r.arg} />}
        {r.page === 'settings' && <Settings />}
      </main>
    </div>
  );
}
