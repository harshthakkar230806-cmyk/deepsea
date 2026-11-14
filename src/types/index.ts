export type ResourceId = 'sand'|'copper'|'iron'|'minerals'|'bio'|'sulfur'|'titanium'|'manganese'|'methane'|'platinum'|'rare_earth'|'adv_bio'|'exotic'|'artifacts'|'crystals'|'steel'|'alloy'|'bio_research'|'medical';
export interface ZoneDef { id: number; name: string; minDepth: number; maxDepth: number; fog: string; light: number; blurb: string; }
export interface ResourceDef { id: ResourceId; name: string; rarity: 'common'|'uncommon'|'rare'|'very_rare'|'processed'; baseValue: number; storage: number; uses: string; }
export interface SubDef { id: string; name: string; cost: number; maxDepth: number; cargo: number; speed: number; hull: number; sonar: number; mining: number; energy: number; research: number; repair: number; blurb: string; }
export type Inv = Partial<Record<ResourceId, number>>;
export interface SubState { x: number; z: number; depth: number; heading: number; energy: number; cargo: Inv; }
export interface Stats { pings: number; investigated: number; extracted: number; processed: number; sold: number; deepest: number; upgrades: number; repairs: number; earned: number; }
export interface SaveData {
  version: number; seed: number; createdAt: number; lastSeen: number;
  credits: number; research: number; reputation: number;
  inventory: Inv; ownedSubs: string[]; activeSub: string; sonarTier: number;
  sub: SubState; hull: Record<string, number>; subUp: Record<string, number>; modules: Record<string, number>;
  poi: Record<string, number>; poiLeft: Record<string, number>;
  discoveries: string[]; resSeen: string[]; achievements: string[]; missionsDone: string[];
  stats: Stats; mult: Record<string, number>; signal: boolean; finale: boolean; endgame: boolean;
  tech: string[]; contracts: { active: string[]; done: string[] }; cprog: Record<string, number>; investor: number;
  introSeen: boolean; settings: { muted: boolean };
}
