# DEEP SEA TYCOON

A single-player browser game: explore the ocean, sonar-scan the unknown, mine and process resources, build an underwater empire, and descend toward something humanity does not understand.

Everything runs client-side. No database, backend, accounts, external API, or online service. Progress is saved in your browser (IndexedDB). After the page has loaded, no network access is needed.

## Install / develop / build

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-checks, then builds to dist/
npm run preview    # serve the production build locally
npm test           # headless engine tests (gameplay rules, economy, saves, finale)
```

## Deploy on Vercel (static)

Import the repo in Vercel (framework preset: **Vite**). Build command `npm run build`, output directory `dist`. No environment variables or server functions are used.

## How to play

**Core loop:** explore → scan → discover → extract → process → sell → upgrade → go deeper.

* **Depth is distance.** The seabed slopes away from your base. Sail outward and dive to reach deeper zones. Each zone needs a better sub and better sonar to survive.
* **Sonar contacts have stages:** `UNKNOWN SIGNAL` → `87% PROBABILITY — METALLIC STRUCTURE` (closer) → identified when you INVESTIGATE (or automatically for resources at close range with Advanced Sonar).
* **Mining:** park within 160 m of an identified deposit and EXTRACT. Mining drains energy and fills cargo. Deposits slowly regenerate.
* **Dock** at the base (G) to unload cargo, recharge, and repair. Sell at the Market, process in the Resources panel, and spend credits on upgrades, subs, and base modules.
* **Hazards:** pressure limits (you cannot dive below your rated depth), current surges (warned 4 s ahead; hull damage), vent heat (needs Thermal Protection to mine vents), and low energy. Failure never kills you: you are towed to base for a fee and keep your cargo.
* **Research:** a 6-branch tech tree (Engineering, Exploration, Industrial, Biology, Energy, Hadal Technology) with prerequisites. Each project costs credits, Research Points and sometimes resources, and gives permanent bonuses. Research Points (from discoveries, missions, contracts, the Research Lab) are also needed for sonar tiers and the top submarines.
* **Contracts & reputation:** accept up to 4 contracts from corporations and agencies (deliver resources, make discoveries, reach depths). Higher reputation unlocks better contracts, unique equipment rewards, and investor funding rounds.
* **Life support:** oxygen drains while you are out; low oxygen or a failed hull/power tows you home. Dock to refill.
* **Events:** besides market events there are electrical storms (halved sonar range above 1,000 m) and rockfalls at unstable cave/canyon discoveries.
* **Missions** track automatically; claim rewards in the Missions panel. Reputation gives a small sell bonus.
* **Final goal:** meet the requirements shown in Missions once you pass 4,000 m, then launch **The Final Descent**.

### Controls
W/S forward/back · A/D turn · R/F or ↑/↓ ascend/descend · Space ping · I investigate · E extract · G dock · V camera · Esc settings. On touch screens use the on-screen pad and buttons.

## Saves
* Autosave every 20 s and at key actions, to IndexedDB in your browser (localStorage fallback). Nothing is ever transmitted.
* Settings → **Export** downloads a JSON backup; **Import** restores it (validated; invalid or corrupted files are rejected without touching your current save). **Reset** deletes the save.
* Saves carry a version number. Negative or non-finite values are rejected on load.
* Idle submarines mine while you are away (needs the Automation Hub); up to 8 hours are credited on return.

## Troubleshooting
* **Black screen / no 3D:** your browser needs WebGL. Enable hardware acceleration.
* **Low frame rate:** close other tabs; the game scales pixel ratio down on its own, and game time catches up if frames are slow.
* **Continue is greyed out:** no valid save was found in this browser profile (private windows do not persist data).
* **No sound:** browsers require a click before audio starts; check Settings → Mute. All sounds are synthesised locally.

## Project layout
`src/game` (engine, world generation), `src/data` (zones, resources, subs, discoveries, missions), `src/save`, `src/audio`, `src/components` (Three.js view, HUD, panels), `tests/` (headless engine tests).
