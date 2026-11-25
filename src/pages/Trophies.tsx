import { ACHIEVEMENTS, collectData } from '../lib/achievements';
import { getUnlocked } from '../lib/storage';
import { Medal } from '../components/Medal';
import { Progress } from '../components/Bits';
import { Icon } from '../components/Icon';

const GROUPS = ['Games', 'Bots', 'Skill', 'Puzzles', 'Study', 'Streaks'] as const;

export function Trophies() {
  const unlocked = getUnlocked();
  const d = collectData();
  const got = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length;
  return (
    <div className="page">
      <header className="page-head trophies-head">
        <div>
          <h1>Trophies</h1>
          <p className="lede">
            {got} of {ACHIEVEMENTS.length} unlocked.
          </p>
        </div>
        <div className="streak-card">
          <Icon name="fire" size="2.2rem" />
          <div>
            <b>{d.streak}</b>
            <span className="muted small">day streak · best {d.best}</span>
          </div>
        </div>
      </header>
      <Progress value={got} max={ACHIEVEMENTS.length} label="Trophies unlocked" />
      {GROUPS.map((g) => (
        <section key={g} className="lesson-group">
          <h2>{g}</h2>
          <div className="trophy-grid">
            {ACHIEVEMENTS.filter((a) => a.group === g).map((a, i) => {
              const on = !!unlocked[a.id];
              const prog = !on && a.progress ? a.progress(d) : null;
              return (
                <div key={a.id} className={`trophy ${on ? 'on' : ''}`} style={{ animationDelay: `${i * 30}ms` }}>
                  <Medal a={a} unlocked={on} />
                  <div className="trophy-text">
                    <b>{a.name}</b>
                    <span className="muted small">{a.desc}</span>
                    {on ? (
                      <span className="small trophy-date">Unlocked {new Date(unlocked[a.id]).toLocaleDateString()}</span>
                    ) : (
                      prog && (
                        <span className="trophy-prog">
                          <Progress value={Math.min(prog[0], prog[1])} max={prog[1]} />
                          <span className="small muted">
                            {Math.min(prog[0], prog[1])}/{prog[1]}
                          </span>
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
