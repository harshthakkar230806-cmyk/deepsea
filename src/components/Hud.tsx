import { useEffect, useRef, useState } from 'react';
import type { Game } from '../game/engine';
import { R, floorDepth, BASE } from '../game/world';
import { ZONES } from '../data/zones';
import { MISSIONS } from '../data/missions';
import { SUB } from '../data/subs';
import { RES } from '../data/resources';
import { FleetPanel, BasePanel, MarketPanel, ResourcesPanel, MissionsPanel, ResearchPanel, ContractsPanel, JournalPanel, AchievementsPanel, SettingsPanel } from './Panels';
import { startAmbience } from '../audio/audio';
import type { SaveData } from '../types';
const $ = (n: number) => '$' + Math.round(n).toLocaleString();
const invDist = (depth: number) => 30 + 370 * Math.pow(Math.max(0, (depth - 120) / 13880), 1 / 1.8);

function Minimap({ g }: { g: Game }) {
  const c = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = c.current!; const x = cv.getContext('2d')!; const S = 170, k = (S / 2 - 4) / R; x.clearRect(0, 0, S, S); x.save(); x.translate(S / 2, S / 2);
    x.fillStyle = 'rgba(2,12,22,.9)'; x.beginPath(); x.arc(0, 0, S / 2 - 2, 0, 7); x.fill(); x.strokeStyle = 'rgba(80,200,230,.28)';
    for (const d of [200, 1000, 4000, 6000, 8000, 11000]) { x.beginPath(); x.arc(0, 0, invDist(d) * k, 0, 7); x.stroke(); }
    x.fillStyle = 'rgba(255,110,30,.16)'; x.beginPath(); x.moveTo(40 * k, 40 * k); x.lineTo(R * k * 0.95, 40 * k); x.arc(0, 0, R * k * 0.95, 0.1, 1.5); x.lineTo(40 * k, R * k * 0.95); x.closePath(); x.fill();
    const t = performance.now() / 1000;
    for (const p of g.world) { const st = g.stage(p); if (st < 1) continue; const px = p.x * k, pz = p.z * k; x.fillStyle = st === 1 ? `rgba(160,210,230,${0.5 + 0.4 * Math.sin(t * 4)})` : st === 2 ? '#ffbf33' : p.kind === 'discovery' ? '#c080ff' : g.left(p) <= 0 ? '#556' : '#4dff99'; x.fillRect(px - 2.5, pz - 2.5, 5, 5); if (st === 1) { x.fillStyle = '#a0d0e0'; x.font = '9px sans-serif'; x.fillText('?', px + 4, pz - 3); } }
    x.fillStyle = '#e8841c'; x.fillRect(BASE.x * k - 3, BASE.z * k - 3, 6, 6);
    const u = g.s.sub; x.translate(u.x * k, u.z * k); x.rotate(-u.heading + Math.PI); x.fillStyle = '#5fe9ff'; x.beginPath(); x.moveTo(0, 6); x.lineTo(4, -4); x.lineTo(-4, -4); x.closePath(); x.fill(); x.restore();
    if (g.pingCd > 2) { x.strokeStyle = 'rgba(95,233,255,.6)'; x.beginPath(); x.arc(S / 2 + u.x * k, S / 2 + u.z * k, (3 - g.pingCd) * 60, 0, 7); x.stroke(); }
  });
  return <canvas ref={c} width={170} height={170} style={{ width: 170, height: 170, border: '1px solid var(--line)', borderRadius: '50%' }} />;
}

export function Modal({ g }: { g: Game }) {
  const m = g.modal; const [pg, setPg] = useState(0); useEffect(() => { setPg(0); }, [m]); if (!m) return null; const pages = m.pages; const last = !pages || pg >= pages.length - 1;
  return <div className="overlay" style={{ zIndex: 40, background: 'rgba(0,3,8,.88)' }}><div className="disc">
    {m.title && <div className="big">{m.title}</div>}{m.name && <div className="nm">{m.name}</div>}
    {pages ? <p style={{ fontSize: 20, lineHeight: 1.6, minHeight: 130 }} key={pg}>{pages[pg]}</p> : <p style={{ fontSize: 16, lineHeight: 1.6 }}>{m.desc}</p>}
    {!pages && m.lines.map(l => <div key={l} style={{ color: l.startsWith('+') ? 'var(--gr)' : 'var(--cy)', letterSpacing: 2, margin: '4px 0' }}>{l}</div>)}
    {last && pages && m.lines.map(l => <div key={l} style={{ color: 'var(--gr)', letterSpacing: 2 }}>{l}</div>)}
    <div style={{ marginTop: 24 }}><button className="pri" onClick={() => (last ? g.closeModal() : setPg(pg + 1))}>{last ? 'CONTINUE' : 'NEXT'}</button></div></div></div>;
}

export default function Hud({ g, replace, menu }: { g: Game; replace: (s: SaveData | null) => void; menu: () => void }) {
  const [, tick] = useState(0); const [panel, setPanel] = useState<string>('');
  useEffect(() => { const id = setInterval(() => tick(n => n + 1), 100); return () => clearInterval(id); }, []);
  useEffect(() => {
    startAmbience();
    const map = (e: KeyboardEvent, v: number) => { if ((e.target as HTMLElement)?.tagName === 'INPUT') return; const k = e.key.toLowerCase(); const i = g.input;
      if (k === 'w') i.fwd = v; else if (k === 's') i.fwd = -v; else if (k === 'a') i.turn = -v; else if (k === 'd') i.turn = v; else if (k === 'r' || k === 'arrowup') i.vert = -v; else if (k === 'f' || k === 'arrowdown') i.vert = v;
      else if (v) { if (k === ' ') g.ping(); else if (k === 'i') g.investigate(); else if (k === 'e') g.extract ? g.stopExtract() : g.startExtract(); else if (k === 'g') g.dock(); else if (k === 'escape') setPanel(p => (p ? '' : 'settings')); else return; }
      else return; e.preventDefault(); };
    const dn = (e: KeyboardEvent) => map(e, 1), up = (e: KeyboardEvent) => map(e, 0); addEventListener('keydown', dn); addEventListener('keyup', up); return () => { removeEventListener('keydown', dn); removeEventListener('keyup', up); g.input.fwd = g.input.turn = g.input.vert = 0; };
  }, [g]);
  const s = g.s; const d = g.d(); const u = s.sub; const z = g.zone(); const zone = ZONES[z - 1]; const hull = (s.hull[s.activeSub] ?? 1); const nt = g.nearest(60); const mission = g.mission(); const close = () => setPanel('');
  const hold = (k: 'fwd' | 'turn' | 'vert', v: number) => ({ onPointerDown: (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); g.setInput(k, v); }, onPointerUp: () => g.setInput(k, 0), onPointerCancel: () => g.setInput(k, 0), onPointerLeave: () => g.setInput(k, 0) });
  const bar = (v: number, col: string) => <div className="bar"><i style={{ width: `${Math.max(0, Math.min(100, v * 100))}%`, background: col }} /></div>;
  const ex = g.extractTarget();
  return <div className="hud">
    <div className="top">
      <div className="card"><div className="lab">CREDITS</div><div className="val">{$(s.credits)}</div><div className="lab" style={{ marginTop: 4 }}>ENERGY</div>{bar(u.energy / d.energy, u.energy / d.energy < 0.25 ? 'var(--red)' : 'var(--cy)')}<div className="lab" style={{ marginTop: 4 }}>HULL {Math.round(hull * 100)}%</div>{bar(hull, hull < 0.4 ? 'var(--red)' : 'var(--gr)')}<div className="lab" style={{ marginTop: 4 }}>OXYGEN {Math.round(g.oxygen)}%</div>{bar(g.oxygen / 100, g.oxygen < 25 ? 'var(--red)' : '#9fd8ff')}</div>
      <div className="card" style={{ textAlign: 'center' }}><div className="lab">{zone.name.toUpperCase()}</div><div className="val">{Math.round(u.depth).toLocaleString()} m</div><div className="sm">{SUB[s.activeSub].name} · limit {Math.round(d.maxDepth).toLocaleString()}m</div><div className="lab" style={{ marginTop: 4 }}>CARGO {Math.round(g.cargoUsed())}/{Math.round(d.cargo)} · STORAGE {Math.round(g.storageUsed()).toLocaleString()}/{g.storageCap().toLocaleString()}</div></div>
      <div className="card hide-s" style={{ maxWidth: 300 }}><div className="lab">OBJECTIVE</div><div style={{ fontSize: 13 }}>{g.hint()}</div>{mission && <div className="sm" style={{ marginTop: 4 }}>▸ {mission.title}: {Math.min(mission.max, mission.cur(s)).toLocaleString()}/{mission.max.toLocaleString()}</div>}{g.events.length > 0 && <div style={{ color: 'var(--or)', fontSize: 12, marginTop: 4 }}>⚠ {g.events.map(e => e.name).join(' · ')}</div>}</div>
    </div>
    <div className="nav">{[['fleet', 'FLEET'], ['base', 'BASE'], ['market', 'MARKET'], ['res', 'RESOURCES'], ['research', 'RESEARCH'], ['contracts', 'CONTRACTS'], ['missions', 'MISSIONS'], ['journal', 'JOURNAL'], ['ach', 'ACHIEVE.'], ['settings', 'SETTINGS']].map(([k, l]) => <button key={k} className={panel === k ? 'on' : ''} onClick={() => setPanel(k)}>{l}{k === 'missions' && MISSIONS.some(m => !s.missionsDone.includes(m.id) && m.cur(s) >= m.max) ? ' ●' : ''}</button>)}</div>
    <div className="mini"><Minimap g={g} />
      {nt && <div className="card" style={{ maxWidth: 260, fontSize: 12 }}><div className="lab">CONTACT · {Math.round(nt.dist * 10)}m</div><b>{g.label(nt.p)}</b>{g.stage(nt.p) >= 3 && nt.p.kind !== 'discovery' && <div className="sm">{g.left(nt.p)} units left · {$(RES[nt.p.resource].baseValue)}/unit</div>}{nt.p.tier > s.sonarTier ? null : g.stage(nt.p) < 3 && nt.dist <= 24 && <div style={{ color: 'var(--or)' }}>Press INVESTIGATE</div>}{ex && ex.id === nt.p.id && g.left(ex) > 0 && <div style={{ color: 'var(--gr)' }}>Press EXTRACT</div>}</div>}</div>
    <div className="toasts">{g.toasts.map(t => <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>)}</div>
    <div className="bottom"><button onClick={() => g.ping()} disabled={g.pingCd > 0}>◉ PING</button><button onClick={() => g.investigate()}>🔍 INVESTIGATE</button><button className={g.extract ? 'pri' : ''} onClick={() => (g.extract ? g.stopExtract() : g.startExtract())}>{g.extract ? '■ STOP' : '⛏ EXTRACT'}</button><button className="go" disabled={!g.canDock()} onClick={() => g.dock()}>⚓ DOCK</button></div>
    <div className="dpad" style={{ left: 10, gridTemplateColumns: 'repeat(3,58px)' }}><span /><button {...hold('fwd', 1)}>▲</button><span /><button {...hold('turn', -1)}>◀</button><button {...hold('fwd', -1)}>▼</button><button {...hold('turn', 1)}>▶</button></div>
    <div className="dpad" style={{ right: 10, gridTemplateColumns: '58px' }}><button {...hold('vert', -1)}>⬆</button><button {...hold('vert', 1)}>⬇</button></div>
    {panel === 'fleet' && <FleetPanel g={g} close={close} />}{panel === 'base' && <BasePanel g={g} close={close} />}{panel === 'market' && <MarketPanel g={g} close={close} />}{panel === 'res' && <ResourcesPanel g={g} close={close} />}{panel === 'research' && <ResearchPanel g={g} close={close} />}{panel === 'contracts' && <ContractsPanel g={g} close={close} />}{panel === 'missions' && <MissionsPanel g={g} close={close} />}{panel === 'journal' && <JournalPanel g={g} close={close} />}{panel === 'ach' && <AchievementsPanel s={s} close={close} />}{panel === 'settings' && <SettingsPanel g={g} close={close} replace={replace} menu={menu} />}
    <Modal g={g} />
  </div>;
}
export { floorDepth };
