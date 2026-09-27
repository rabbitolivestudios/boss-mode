# BOSS MODE: design

## One line

*Vampire Survivors*, but you are the raid boss and the heroes are the horde.

## References

- **Role inversion:** [Hostile Architect](https://store.steampowered.com/app/4768160/Hostile_Architect/). You build the level the heroes run through, with springboards, saw blades and lava.
- **Feel:** [Mini Gladiators](https://store.steampowered.com/app/4754470/Mini_Gladiators/). A physics bullet-heaven where enemies are launched across the arena and crash into each other.
- **Audience language:** Roblox and Fortnite, which means blocky characters, gamer tags, killfeeds, emotes and "the squad".

## Theme and story

You are the final boss of an online fantasy game. For years heroes have farmed you for loot. Today *every* hero in the server has queued up to raid you at once.

The joke that carries the whole game is that **the heroes behave like other players**. They have gamer tags (`xX_BaconSlayer_Xx`, `TurboToast2014`), they arrive in "squads", a Fortnite-style killfeed reports "Blaze eliminated ChunkyWizard1670", and the champions are the sweaty tryhards of the server:

1. **Sir Tryhard** (2:30), the first champion hero.
2. **xX_Clutch_Xx** (5:00), who always wins the 1v1.
3. **THE CHOSEN ONE** (7:30), the hero from every prophecy. Beat them and the prophecy is broken: the treasure stays yours.

The story is told in about ten words on screen and then through play. Kids this age skip cutscenes.

### The bosses

| Boss | Style | Starts with |
|---|---|---|
| 🐉 **Blaze** the Dragon | balanced ranged | Fireball |
| 🟢 **Gloop** the Slime King | slow, tanky, crowd launcher | Ground Pound |
| 💀 **Rattles** the Bone Lord | fragile, commands an army | Summon Goblins |

## Design pillars

1. **Big and powerful, not fragile.** You are huge and the heroes are tiny. Damage is capped per second, so a swarm hurts but never deletes you instantly.
2. **Physics is the fun.** Hard hits launch heroes, and flying heroes bowl over everyone they land on. Combo counters (CRASH → BOWLING → STRIKE → UNSTOPPABLE → LEGENDARY) reward chain reactions.
3. **Be the architect.** Traps (Launch Pads, Saw Blades, Lava) turn movement into level design: lure the crowd over them.
4. **One button for the big moment.** ROAR fills from kills and combos. Pressing it launches everything nearby and starts a Frenzy.
5. **Runs under 10 minutes**, with a clear win condition and a result screen of records to beat.

## What's in the prototype

- 3 bosses, 6 hero types plus 3 champions, and 8 abilities with 5 levels each: Ground Pound, Fireball, Bat Swarm, Lava Trail, Storm Call, Summon Goblins, Launch Pad and Saw Blade.
- 6 passives, level-up cards, champion chests, healing drumsticks and a loot vacuum.
- Squad ambushes, champion health bars, a killfeed, combos, ROAR/Frenzy and best scores saved in the browser.
- Keyboard and touch controls, and a portrait-phone layout.

## Balance status

These values were tuned against an automated kiting bot that picks upgrades at random (`?speed` plus a scripted run). Across two batches the bot won 2 of 3 runs, then lost all 3 somewhere between 3:10 and 3:56. The swing mostly comes from which upgrades it happened to pick. **Real playtests with kids are the next step.** Every number is in `src/game/config.ts`.

## Roadmap ideas

**Next (makes it sticky)**
- **Boss Lair meta-progression:** spend the treasure you defended between runs on permanent upgrades and decorations for your lair.
- **Unlockable bosses:** Kraken, Mecha-Golem, Pumpkin King. Unlock them by beating challenges ("win with Gloop without Ground Pound").
- **Evolutions:** two maxed abilities combine (Fireball + Storm Call = Meteor Storm), the Vampire Survivors hook.
- **Hero variety:** builders who put up walls, a "streamer" who brings viewers (more heroes), a hacker who teleports.

**Later (social)**
- Daily seeded run with a leaderboard, and weekly "events" that change the rules.
- Hero-skin gags: a hero in a banana suit, a hero in a cardboard box.
- Co-op: two bosses, one dungeon.

**Safety for this audience:** no open chat, no loot boxes, no paid randomness. If it's ever monetized, only cosmetic boss skins with clear prices.

## Art direction: candidates

Four looks are implemented behind `?style=` so they can be compared in the real game (see the README). None is chosen yet.

| | Paper | Dungeon | Diorama | Classic |
|---|---|---|---|---|
| Reference | Paper Mario | bright Diablo | Commandos | generic low-poly toon |
| Tone for 10–14 | funny, friendly | epic, a little spooky | serious, military-ish | friendly, generic |
| Heroes readable in a crowd of 300 | best: flat, white-bordered | good under light, weaker at the edges | smallest units | good |
| Art cost to reach "finished" | low: 2D drawings per character | medium: lighting, VFX | high: many detailed props | low |
| Phone performance (expected, not yet measured) | best: one flat quad per unit | heaviest: point lights and bloom | medium: shadow map | good |
| Stands out on a store page | high | low: many dark ARPG survivors | medium | low |

### Classic (original notes)

Bright, saturated low-poly with toon shading: blocky heroes built from boxes (Roblox-readable at a glance), chunky bosses built from primitives, a grassy endless arena, and big readable HUD type (Lilita One). Camera is high three-quarter top-down. Everything is generated in code today; a later pass can swap in authored `.glb` models without touching gameplay.
