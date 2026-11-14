import type { ResourceDef, ResourceId } from '../types';
export const RESOURCES: ResourceDef[] = [
  { id:'sand', name:'Sand', rarity:'common', baseValue:4, storage:1, uses:'Sell' },
  { id:'copper', name:'Copper', rarity:'common', baseValue:12, storage:1, uses:'Sell' },
  { id:'iron', name:'Iron', rarity:'common', baseValue:9, storage:1, uses:'Process into Steel' },
  { id:'minerals', name:'Basic Minerals', rarity:'common', baseValue:7, storage:1, uses:'Sell' },
  { id:'bio', name:'Biological Samples', rarity:'common', baseValue:22, storage:1, uses:'Process into Research Samples' },
  { id:'sulfur', name:'Sulfur', rarity:'common', baseValue:30, storage:1, uses:'Sell (volcanic events boost)' },
  { id:'titanium', name:'Titanium', rarity:'uncommon', baseValue:120, storage:2, uses:'Sell, contracts' },
  { id:'manganese', name:'Manganese', rarity:'uncommon', baseValue:45, storage:1, uses:'Combine with Steel into Alloy' },
  { id:'methane', name:'Methane Hydrates', rarity:'uncommon', baseValue:60, storage:2, uses:'Sell' },
  { id:'platinum', name:'Platinum', rarity:'rare', baseValue:400, storage:2, uses:'Sell' },
  { id:'rare_earth', name:'Rare Earth Elements', rarity:'rare', baseValue:350, storage:2, uses:'Sell' },
  { id:'adv_bio', name:'Advanced Biological Samples', rarity:'rare', baseValue:300, storage:2, uses:'Medical Compound ingredient' },
  { id:'exotic', name:'Exotic Materials', rarity:'very_rare', baseValue:1500, storage:3, uses:'Sell' },
  { id:'artifacts', name:'Ancient Artifacts', rarity:'very_rare', baseValue:2500, storage:3, uses:'Sell' },
  { id:'crystals', name:'Unknown Crystals', rarity:'very_rare', baseValue:5000, storage:3, uses:'Final expedition requirement' },
  { id:'steel', name:'Steel', rarity:'processed', baseValue:40, storage:1, uses:'Alloy ingredient' },
  { id:'alloy', name:'Advanced Alloy', rarity:'processed', baseValue:300, storage:1, uses:'High-value product' },
  { id:'bio_research', name:'Research Sample', rarity:'processed', baseValue:90, storage:1, uses:'Medical ingredient' },
  { id:'medical', name:'Medical Compound', rarity:'processed', baseValue:1200, storage:1, uses:'High-value product' },
];
export const RES: Record<string, ResourceDef> = Object.fromEntries(RESOURCES.map(r => [r.id, r]));
export const RECIPES: { id: string; name: string; inputs: Partial<Record<ResourceId, number>>; out: ResourceId; level: number }[] = [
  { id:'steel', name:'Smelt Steel', inputs:{ iron:2 }, out:'steel', level:1 },
  { id:'bio_research', name:'Analyse Samples', inputs:{ bio:2 }, out:'bio_research', level:1 },
  { id:'alloy', name:'Forge Advanced Alloy', inputs:{ steel:2, manganese:1 }, out:'alloy', level:2 },
  { id:'medical', name:'Synthesise Medical Compound', inputs:{ bio_research:2, adv_bio:1 }, out:'medical', level:2 },
];
