import type { ZoneDef, ResourceId } from '../types';
export const ZONES: ZoneDef[] = [
  { id:1, name:'Surface Waters', minDepth:0, maxDepth:200, fog:'#1479b0', light:1.0, blurb:'Sunlit shallows. Safe, abundant, ideal for a first expedition.' },
  { id:2, name:'Twilight Zone', minDepth:200, maxDepth:1000, fog:'#082a4d', light:0.45, blurb:'Faint light, bioluminescent flickers, stronger currents.' },
  { id:3, name:'Midnight Zone', minDepth:1000, maxDepth:4000, fog:'#030d18', light:0.14, blurb:'Total darkness. Enormous shapes drift past.' },
  { id:4, name:'Abyssal Plain', minDepth:4000, maxDepth:6000, fog:'#01060b', light:0.08, blurb:'Crushing pressure. Sparse life. Strange formations.' },
  { id:5, name:'Hydrothermal Vents', minDepth:3000, maxDepth:6500, fog:'#160603', light:0.1, blurb:'Volcanic glow and extreme heat. Geothermal riches.' },
  { id:6, name:'Deep Trenches', minDepth:6000, maxDepth:8000, fog:'#010408', light:0.05, blurb:'Vertical cliffs and narrow passages.' },
  { id:7, name:'Hadal Zone', minDepth:8000, maxDepth:11000, fog:'#000204', light:0.03, blurb:'The hardest waters. Anomalies everywhere.' },
  { id:8, name:'The Unknown', minDepth:11000, maxDepth:14000, fog:'#14052e', light:0.07, blurb:'Something is down here.' },
];
export const ZONE_RES: Record<number, { deposit: ResourceId[]; bio: ResourceId; anomaly: ResourceId[]; tier: number }> = {
  1: { deposit:['sand','minerals','iron','copper'], bio:'bio', anomaly:['minerals'], tier:1 },
  2: { deposit:['manganese','copper','iron','minerals'], bio:'bio', anomaly:['manganese'], tier:1 },
  3: { deposit:['titanium','methane','manganese','titanium'], bio:'adv_bio', anomaly:['titanium'], tier:2 },
  4: { deposit:['rare_earth','platinum','titanium','platinum'], bio:'adv_bio', anomaly:['artifacts'], tier:2 },
  5: { deposit:['sulfur','rare_earth','methane','sulfur'], bio:'adv_bio', anomaly:['exotic'], tier:2 },
  6: { deposit:['platinum','rare_earth','platinum','titanium'], bio:'adv_bio', anomaly:['artifacts','exotic'], tier:2 },
  7: { deposit:['exotic','platinum','exotic','rare_earth'], bio:'adv_bio', anomaly:['crystals','artifacts','exotic'], tier:3 },
  8: { deposit:['crystals','exotic'], bio:'adv_bio', anomaly:['crystals'], tier:4 },
};
