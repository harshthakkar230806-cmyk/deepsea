import type { ResourceId, SaveData } from '../types';
export interface ContractDef { id: string; org: string; title: string; kind: 'deliver' | 'discover' | 'reach'; res?: ResourceId; qty?: number; disc?: string; depth?: number; credits: number; rp: number; rep: number; perk?: string; minRep: number }
export const CONTRACTS: ContractDef[] = [
  { id:'c1', org:'Global Mining Company', title:'Deliver 200 Iron', kind:'deliver', res:'iron', qty:200, credits:9000, rp:0, rep:3, minRep:0 },
  { id:'c2', org:'Ocean Research Institute', title:'Deliver 15 Biological Samples', kind:'deliver', res:'bio', qty:15, credits:4000, rp:15, rep:3, minRep:0 },
  { id:'c3', org:'Global Mining Company', title:'Deliver 60 Manganese', kind:'deliver', res:'manganese', qty:60, credits:12000, rp:0, rep:4, minRep:3 },
  { id:'c4', org:'Ocean Research Institute', title:'Deliver 5 Advanced Biological Samples', kind:'deliver', res:'adv_bio', qty:5, credits:0, rp:80, rep:5, minRep:6 },
  { id:'c5', org:'Global Mining Company', title:'Deliver 100 Titanium', kind:'deliver', res:'titanium', qty:100, credits:60000, rp:0, rep:6, minRep:6 },
  { id:'c6', org:'Government Agency', title:'Investigate the Abandoned Research Station', kind:'discover', disc:'d_station', credits:0, rp:0, rep:8, perk:'perk_array', minRep:8 },
  { id:'c7', org:'Deep Energy Corporation', title:'Deliver 80 Methane Hydrates', kind:'deliver', res:'methane', qty:80, credits:55000, rp:0, rep:6, minRep:8 },
  { id:'c8', org:'Pharma Consortium', title:'Deliver 10 Medical Compounds', kind:'deliver', res:'medical', qty:10, credits:40000, rp:40, rep:8, perk:'perk_license', minRep:12 },
  { id:'c9', org:'Government Agency', title:'Reach 6,000m', kind:'reach', depth:6000, credits:0, rp:0, rep:10, perk:'perk_cells', minRep:12 },
  { id:'c10', org:'Government Agency', title:'Investigate the Unidentified Metallic Object', kind:'discover', disc:'d_artobj', credits:0, rp:0, rep:12, perk:'perk_plating', minRep:15 },
  { id:'c11', org:'Global Mining Company', title:'Deliver 40 Platinum', kind:'deliver', res:'platinum', qty:40, credits:120000, rp:0, rep:10, minRep:15 },
  { id:'c12', org:'Ocean Research Institute', title:'Deliver 3 Ancient Artifacts', kind:'deliver', res:'artifacts', qty:3, credits:0, rp:200, rep:12, minRep:20 },
  { id:'c13', org:'Global Mining Company', title:'Deliver 1,000 Titanium', kind:'deliver', res:'titanium', qty:1000, credits:250000, rp:0, rep:15, minRep:25 },
  { id:'c14', org:'Ocean Research Institute', title:'Deliver 10 Exotic Materials', kind:'deliver', res:'exotic', qty:10, credits:300000, rp:250, rep:20, minRep:40 },
];
export const INVESTORS = [{ rep: 10, credits: 25000 }, { rep: 30, credits: 100000 }, { rep: 60, credits: 400000 }, { rep: 100, credits: 1500000 }];
export function contractProgress(c: ContractDef, s: SaveData): number {
  if (c.kind === 'deliver') return Math.min(c.qty!, s.cprog[c.id] ?? 0);
  if (c.kind === 'discover') return s.discoveries.includes(c.disc!) ? 1 : 0;
  return Math.min(c.depth!, s.stats.deepest);
}
export const contractTarget = (c: ContractDef) => (c.kind === 'deliver' ? c.qty! : c.kind === 'discover' ? 1 : c.depth!);
