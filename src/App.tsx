import { useEffect, useState } from 'react';
import MenuScene from './components/MenuScene';
import OceanView from './components/OceanView';
import Hud from './components/Hud';
import { AchievementsPanel } from './components/Panels';
import { Game } from './game/engine';
import { clearSave, importSave, newSave, readSave, writeSave } from './save/save';
import { setMuted } from './audio/audio';
import type { SaveData } from './types';
const INTRO = ['Humanity has explored less than 5% of the world’s oceans.', 'Your company intends to change that.', 'You have one small submarine, a modest platform and $25,000. Dive outward from base to reach deeper water: depth is distance.'];
export default function App() {
  const [game, setGame] = useState<Game | null>(null); const [hasSave, setHasSave] = useState(false); const [view, setView] = useState(''); const [saved, setSaved] = useState<SaveData | null>(null); const [err, setErr] = useState('');
  useEffect(() => { readSave().then(s => { setHasSave(!!s); setSaved(s); }).catch(() => setErr('Save data could not be read.')); }, []);
  const begin = (s: SaveData, fresh: boolean) => { const g = new Game(s); setMuted(!!s.settings.muted); if (fresh || !s.introSeen) { g.modal = { title: 'DEEP SEA TYCOON', name: 'FIRST DESCENT', desc: '', lines: ['OBJECTIVE: Scan the nearby ocean floor.'], pages: INTRO, kind: 'info' }; s.introSeen = true; } writeSave(s); (window as unknown as { __dsg?: Game }).__dsg = g; setGame(g); };
  const start = async (cont: boolean) => { if (cont) { const s = await readSave(); if (!s) { setErr('Your save is missing or corrupted. Start a new expedition, or import a backup.'); setHasSave(false); return; } begin(s, false); } else begin(newSave(), true); };
  const replace = async (s: SaveData | null) => { if (!s) { await clearSave(); begin(newSave(), true); setHasSave(true); } else { await writeSave(s); begin(s, false); } };
  const toMenu = async () => { game?.persist(); const s = await readSave(); setSaved(s); setHasSave(!!s); setGame(null); };
  if (game) return <><OceanView game={game} /><Hud g={game} replace={replace} menu={toMenu} /></>;
  return <div style={{ position: 'fixed', inset: 0 }}><MenuScene />
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'radial-gradient(transparent,rgba(0,0,0,.65))', textAlign: 'center', padding: 16 }}>
      <h1 style={{ fontSize: 'clamp(32px,7vw,76px)', letterSpacing: 'clamp(3px,1.2vw,12px)', margin: 0, fontWeight: 300 }}>DEEP SEA TYCOON</h1><p style={{ letterSpacing: 6, opacity: 0.8, marginBottom: 28 }}>THE DEEP IS WAITING.</p>
      <button className="pri" style={{ minWidth: 260 }} onClick={() => start(false)}>NEW EXPEDITION</button><button style={{ minWidth: 260 }} disabled={!hasSave} onClick={() => start(true)}>CONTINUE</button>
      <button style={{ minWidth: 260 }} onClick={() => setView('settings')}>SETTINGS</button><button style={{ minWidth: 260 }} onClick={() => setView('ach')}>ACHIEVEMENTS</button>{err && <div style={{ color: 'var(--red)', maxWidth: 380 }}>{err}</div>}</div>
    {view === 'ach' && <AchievementsPanel s={saved ?? newSave()} close={() => setView('')} />}
    {view === 'settings' && <div className="overlay" onClick={() => setView('')}><div className="panel" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}><h2>SETTINGS</h2><div className="row"><div className="grow">Sound</div><button onClick={() => { const m = !(saved?.settings.muted); setMuted(m); if (saved) { saved.settings.muted = m; writeSave(saved); setSaved({ ...saved }); } }}>{saved?.settings.muted ? 'UNMUTE' : 'MUTE'}</button></div>
      <div className="row"><div className="grow">Import a backup</div><input type="file" accept=".json,application/json" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; const sv = importSave(await f.text()); if (!sv) setErr('Import failed: invalid or corrupted file.'); else { await writeSave(sv); setSaved(sv); setHasSave(true); setErr(''); setView(''); } }} /></div><button onClick={() => setView('')}>CLOSE</button></div></div>}</div>;
}
