import type { SaveData } from '../types';
export const SAVE_VERSION = 1;
const DB = 'deep-sea-tycoon', STORE = 'saves', KEY = 'main';
export function newSave(): SaveData {
  const now = Date.now();
  return { version:SAVE_VERSION, seed:Math.floor(Math.random()*2**31), createdAt:now, lastSeen:now,
    credits:25000, research:0, reputation:0, inventory:{}, ownedSubs:['scout'], activeSub:'scout', sonarTier:1,
    sub:{ x:12, z:-6, depth:62, heading:2.3, energy:100, cargo:{} }, hull:{ scout:1 }, subUp:{},
    modules:{ storage:1, dock:1 }, poi:{}, poiLeft:{}, discoveries:[], resSeen:[], achievements:[], missionsDone:[],
    stats:{ pings:0, investigated:0, extracted:0, processed:0, sold:0, deepest:0, upgrades:0, repairs:0, earned:0 },
    tech:[], contracts:{ active:[], done:[] }, cprog:{}, investor:0, mult:{}, signal:false, finale:false, endgame:false, introSeen:false, settings:{ muted:false } };
}
const okInv = (inv: unknown) => !!inv && typeof inv === 'object' && Object.values(inv as object).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
export function validate(d: unknown): SaveData | null {
  if (!d || typeof d !== 'object') return null;
  const s = d as SaveData; const n = newSave();
  if (typeof s.version !== 'number' || s.version > SAVE_VERSION || typeof s.credits !== 'number' || !Array.isArray(s.ownedSubs) || !s.ownedSubs.length) return null;
  if (!Number.isFinite(s.credits) || s.credits < 0 || !okInv(s.inventory) || !s.sub || !okInv(s.sub.cargo)) return null;
  if (![s.sub.x, s.sub.z, s.sub.depth, s.sub.energy].every(Number.isFinite)) return null;
  return { ...n, ...s, version:SAVE_VERSION, stats:{ ...n.stats, ...s.stats }, modules:{ ...n.modules, ...s.modules }, hull:{ ...n.hull, ...s.hull },
    subUp:{ ...s.subUp }, contracts:{ ...n.contracts, ...s.contracts }, cprog:{ ...s.cprog }, tech:Array.isArray(s.tech) ? s.tech : [], poi:{ ...s.poi }, poiLeft:{ ...s.poiLeft }, mult:{ ...s.mult }, settings:{ muted:!!s.settings?.muted } };
}
function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
export async function writeSave(s: SaveData): Promise<void> {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => { const t = db.transaction(STORE,'readwrite'); t.objectStore(STORE).put({ ...s, lastSeen:Date.now() }, KEY); t.oncomplete=()=>res(); t.onerror=()=>rej(t.error); });
  } catch { localStorage.setItem(KEY, JSON.stringify(s)); }
}
export async function readSave(): Promise<SaveData | null> {
  try {
    const db = await open();
    const raw = await new Promise<unknown>((res, rej) => { const q = db.transaction(STORE).objectStore(STORE).get(KEY); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); });
    return validate(raw);
  } catch { try { return validate(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { return null; } }
}
export async function clearSave(): Promise<void> { try { const db = await open(); db.transaction(STORE,'readwrite').objectStore(STORE).delete(KEY); } catch {} localStorage.removeItem(KEY); }
export const exportSave = (s: SaveData) => JSON.stringify(s, null, 2);
export function importSave(text: string): SaveData | null { try { return validate(JSON.parse(text)); } catch { return null; } }
