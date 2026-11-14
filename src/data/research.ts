import type { ResourceId } from '../types';
export type Branch = 'Engineering' | 'Exploration' | 'Industrial' | 'Biology' | 'Energy' | 'Hadal Technology';
export interface Fx { k: 'hull' | 'mining' | 'sonar' | 'speed' | 'storage' | 'processed' | 'bioPrice' | 'medical' | 'research' | 'auto' | 'energy' | 'heat' | 'depth' | 'geo' | 'sell'; v: number }
export interface TechDef { id: string; branch: Branch; name: string; desc: string; credits: number; rp: number; res?: Partial<Record<ResourceId, number>>; req: string[]; fx: Fx[] }
export const TECHS: TechDef[] = [
  { id:'eng1', branch:'Engineering', name:'Composite Hulls', desc:'+15% hull strength on every submarine.', credits:15000, rp:20, req:[], fx:[{ k:'hull', v:0.15 }] },
  { id:'eng2', branch:'Engineering', name:'Reinforced Bulkheads', desc:'+20% hull strength.', credits:60000, rp:80, res:{ titanium:20 }, req:['eng1'], fx:[{ k:'hull', v:0.2 }] },
  { id:'eng3', branch:'Engineering', name:'Mining Optimisation', desc:'+25% mining rate.', credits:30000, rp:40, req:['eng1'], fx:[{ k:'mining', v:0.25 }] },
  { id:'exp1', branch:'Exploration', name:'Signal Processing', desc:'+15% sonar range.', credits:20000, rp:25, req:[], fx:[{ k:'sonar', v:0.15 }] },
  { id:'exp2', branch:'Exploration', name:'Seabed Mapping', desc:'+25% sonar range.', credits:80000, rp:90, res:{ rare_earth:10 }, req:['exp1'], fx:[{ k:'sonar', v:0.25 }] },
  { id:'exp3', branch:'Exploration', name:'Thrust Vectoring', desc:'+12% submarine speed.', credits:25000, rp:30, req:[], fx:[{ k:'speed', v:0.12 }] },
  { id:'ind1', branch:'Industrial', name:'Bulk Storage Systems', desc:'+25% base storage capacity.', credits:25000, rp:30, req:[], fx:[{ k:'storage', v:0.25 }] },
  { id:'ind2', branch:'Industrial', name:'Refining Catalysts', desc:'+10% value of processed goods.', credits:70000, rp:70, req:['ind1'], fx:[{ k:'processed', v:0.1 }] },
  { id:'ind3', branch:'Industrial', name:'Autonomous Systems', desc:'+40% idle submarine production.', credits:90000, rp:100, req:['ind1'], fx:[{ k:'auto', v:0.4 }] },
  { id:'bio1', branch:'Biology', name:'Marine Biochemistry', desc:'+20% price of biological samples and research samples.', credits:20000, rp:30, req:[], fx:[{ k:'bioPrice', v:0.2 }] },
  { id:'bio2', branch:'Biology', name:'Pharmaceutical Synthesis', desc:'+25% price of Medical Compound.', credits:90000, rp:110, res:{ adv_bio:15 }, req:['bio1'], fx:[{ k:'medical', v:0.25 }] },
  { id:'bio3', branch:'Biology', name:'Field Ecology', desc:'+15% research from discoveries.', credits:40000, rp:50, req:['bio1'], fx:[{ k:'research', v:0.15 }] },
  { id:'en1', branch:'Energy', name:'High-Density Cells', desc:'+20% energy capacity.', credits:20000, rp:25, req:[], fx:[{ k:'energy', v:0.2 }] },
  { id:'en2', branch:'Energy', name:'Thermal Shielding', desc:'-50% vent heat damage.', credits:60000, rp:70, req:['en1'], fx:[{ k:'heat', v:0.5 }] },
  { id:'en3', branch:'Energy', name:'Geothermal Taps', desc:'+20% energy, +25% price of sulfur and methane.', credits:120000, rp:140, res:{ sulfur:50 }, req:['en2'], fx:[{ k:'energy', v:0.2 }, { k:'geo', v:0.25 }] },
  { id:'had1', branch:'Hadal Technology', name:'Pressure Hulls', desc:'+10% depth rating.', credits:150000, rp:200, res:{ titanium:60 }, req:['eng2'], fx:[{ k:'depth', v:0.1 }] },
  { id:'had2', branch:'Hadal Technology', name:'Deep Sonar Arrays', desc:'+15% sonar range, +8% depth rating.', credits:300000, rp:320, res:{ platinum:30 }, req:['exp2', 'had1'], fx:[{ k:'sonar', v:0.15 }, { k:'depth', v:0.08 }] },
  { id:'had3', branch:'Hadal Technology', name:'Exotic Matter Studies', desc:'+15% hull. Required for the Final Descent.', credits:600000, rp:500, res:{ exotic:5, crystals:1 }, req:['had2'], fx:[{ k:'hull', v:0.15 }] },
];
export const TECH: Record<string, TechDef> = Object.fromEntries(TECHS.map(x => [x.id, x]));
export const PERKS: Record<string, { name: string; desc: string; fx: Fx[] }> = {
  perk_array: { name:'Government Sonar Array', desc:'+15% sonar range.', fx:[{ k:'sonar', v:0.15 }] },
  perk_plating: { name:'Military-Grade Plating', desc:'+20% hull strength.', fx:[{ k:'hull', v:0.2 }] },
  perk_cells: { name:'Prototype Power Cells', desc:'+15% energy capacity.', fx:[{ k:'energy', v:0.15 }] },
  perk_license: { name:'Trade License', desc:'+5% sell prices.', fx:[{ k:'sell', v:0.05 }] },
};
