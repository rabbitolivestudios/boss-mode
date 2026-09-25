# BOSS MODE

**For once, YOU are the final boss.**

A browser survivors-like (think *Vampire Survivors*) with the roles flipped. You play the giant monster at the bottom of the dungeon, and every hero in the server has queued up to raid you. Move, and your attacks fire automatically. Launch heroes into each other for bowling combos, drop traps in their path, and ROAR when your rage meter is full.

Made for players aged about 10–14 who play Roblox and Fortnite: bright blocky art, gamer-tag heroes, a Fortnite-style killfeed and runs that last under 10 minutes.

## Play

```bash
npm install
npm run dev        # http://localhost:5173 (also on your LAN, so phones can join)
```

| Action | Keyboard | Touch |
|---|---|---|
| Move | WASD / arrows | drag anywhere |
| ROAR (when the meter is full) | Space | ROAR button |
| Pick an upgrade | 1 / 2 / 3 or click | tap |
| Pause | Esc / P | ⏸ |

## Build

```bash
npm run typecheck
npm run build          # static site in dist/, can be hosted anywhere (GitHub Pages, Netlify, Vercel)
npm run build:single   # also writes dist/boss-mode.html, one self-contained file
```

Playtest the late waves quickly with `?speed=4` in the URL.

## Tech

- **Three.js** + TypeScript + Vite. No game engine, no other runtime dependencies.
- One draw call per body part (`InstancedMesh`), so 500+ heroes run on phones.
- Synthesized sound effects (Web Audio), with no audio files to license.
- All balance numbers live in [`src/game/config.ts`](src/game/config.ts).

| File | What it owns |
|---|---|
| `src/game/config.ts` | every tunable number: heroes, bosses, abilities, waves, physics |
| `src/game/game.ts` | the simulation: spawning, AI, abilities, launch physics, loot, rendering the crowd |
| `src/game/models.ts` | the low-poly boss models, built from primitives |
| `src/game/world.ts` | camera, endless tiled ground and scenery |
| `src/game/fx.ts` | particles, shockwaves, lightning, damage numbers |
| `src/game/ui.ts` | HUD, level-up cards, menus, best scores |
| `src/game/input.ts` | keyboard and floating touch joystick |

See [`docs/DESIGN.md`](docs/DESIGN.md) for the pitch, story and roadmap.
