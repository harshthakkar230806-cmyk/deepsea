import type { SubDef } from '../types';
export const SUBS: SubDef[] = [
  { id:'scout', name:'Starter Scout', cost:0, maxDepth:400, cargo:500, speed:10, hull:100, sonar:300, mining:1, energy:100, research:0, repair:5000, blurb:'Cheap and fast, with little cargo and shallow depth.' },
  { id:'miner', name:'Mining Sub', cost:55000, maxDepth:1200, cargo:3000, speed:6, hull:250, sonar:300, mining:4, energy:160, research:0, repair:12000, blurb:'Large cargo and strong mining gear. Slow.' },
  { id:'explorer', name:'Explorer Sub', cost:90000, maxDepth:3000, cargo:1500, speed:12, hull:200, sonar:800, mining:2, energy:180, research:1, repair:15000, blurb:'Excellent sonar and speed, medium cargo.' },
  { id:'research', name:'Research Sub', cost:180000, maxDepth:4500, cargo:1200, speed:8, hull:300, sonar:900, mining:2, energy:220, research:4, repair:22000, blurb:'Scientific suite with great anomaly detection.' },
  { id:'heavy', name:'Heavy Industrial Sub', cost:400000, maxDepth:6000, cargo:12000, speed:5, hull:600, sonar:500, mining:10, energy:300, research:1, repair:50000, blurb:'Huge cargo and extreme mining capability.' },
  { id:'hadal', name:'Hadal Explorer', cost:1500000, maxDepth:11500, cargo:4000, speed:9, hull:900, sonar:1500, mining:6, energy:450, research:5, repair:150000, blurb:'Built for the hadal depths. Very expensive.' },
  { id:'unknown', name:'Unknown Class', cost:6000000, maxDepth:14000, cargo:6000, speed:14, hull:1400, sonar:3000, mining:8, energy:700, research:8, repair:300000, blurb:'Its technology is not entirely human.' },
];
export const SUB_RP: Record<string, number> = { scout: 0, miner: 0, explorer: 20, research: 60, heavy: 100, hadal: 300, unknown: 600 };
export const SUB: Record<string, SubDef> = Object.fromEntries(SUBS.map(s => [s.id, s]));
export const UPGRADES = [
  { id:'hull', name:'Reinforced Hull', max:5, base:1500, desc:'+25% hull strength per level' },
  { id:'pressure', name:'Pressure Resistance', max:3, base:4000, desc:'+10% max depth per level' },
  { id:'engine', name:'Engine', max:5, base:1800, desc:'+15% speed per level' },
  { id:'cargo', name:'Cargo Bay', max:5, base:1600, desc:'+25% cargo per level' },
  { id:'battery', name:'Batteries', max:5, base:1400, desc:'+25% energy per level' },
  { id:'mining', name:'Mining Laser/Drill', max:5, base:2200, desc:'+25% mining rate per level' },
  { id:'thermal', name:'Thermal Protection', max:2, base:20000, desc:'Reduces vent heat damage (required for vents)' },
];
export const SONAR_TIERS = [
  { tier:1, name:'Basic Sonar', cost:0, rp:0, mult:1, gate:1000, desc:'Short range. Reveals major objects. Safe to 1,000m.' },
  { tier:2, name:'Advanced Sonar', cost:20000, rp:30, mult:1.8, gate:4000, desc:'Longer range, identifies resources. Safe to 4,000m.' },
  { tier:3, name:'Deep Sonar', cost:250000, rp:150, mult:2.8, gate:11000, desc:'Extreme-depth operation. Detects anomalies. To 11,000m.' },
  { tier:4, name:'Quantum Sonar', cost:1200000, rp:400, mult:4.5, gate:14000, desc:'Detects what normal sonar cannot explain.' },
];
export const MODULES = [
  { id:'storage', name:'Storage', start:1, costs:[0,12000,60000,200000], desc:['5,000','15,000','50,000','150,000'], what:'Storage capacity (units)' },
  { id:'dock', name:'Dock', start:1, costs:[0,40000,150000,500000], desc:['2 subs','3 subs','5 subs','10 subs'], what:'Maximum submarines owned' },
  { id:'power', name:'Power Generator', start:0, costs:[0,15000,70000,300000], desc:['—','+15% energy','+35% energy','+60% energy'], what:'Energy capacity for all subs' },
  { id:'processing', name:'Processing Facility', start:0, costs:[0,10000,60000,250000], desc:['—','Steel & samples','+Alloy & medical','+15% processed value'], what:'Unlocks processing chains' },
  { id:'repair', name:'Repair Bay', start:0, costs:[0,15000,80000,300000], desc:['—','-25% repair cost','-50% repair cost','-70% repair cost'], what:'Repair cost reduction' },
  { id:'sonar', name:'Sonar Station', start:0, costs:[0,18000,90000,320000], desc:['—','+10% range','+20% range','+35% range'], what:'Sonar range for all subs' },
  { id:'lab', name:'Research Lab', start:0, costs:[0,25000,100000,380000], desc:['—','+0.6 RP/min','+1.8 RP/min','+4 RP/min'], what:'Passive research points' },
  { id:'trading', name:'Trading Terminal', start:0, costs:[0,20000,90000,350000], desc:['—','+3% sell price','+6% sell price','+10% sell price'], what:'Sell price bonus' },
  { id:'automation', name:'Automation Hub', start:0, costs:[0,45000,180000,600000], desc:['—','Idle subs mine (1x)','Idle subs 1.6x','Idle subs 2.4x'], what:'Idle submarines mine automatically' },
];
export const STORAGE_CAP = [0, 5000, 15000, 50000, 150000];
export const DOCK_CAP = [0, 2, 3, 5, 10];
