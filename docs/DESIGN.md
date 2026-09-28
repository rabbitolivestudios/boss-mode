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

## Art direction: paper puppets (chosen)

**Decision:** the game is drawn as **animated paper puppets**, in the spirit of Paper Mario. Four looks were built and compared in the real game (paper, bright-Diablo dungeon, Commandos diorama, low-poly classic); paper won. The others stay reachable with `?style=` as reference, but they are no longer developed.

How it works:

- Every character is drawn **in code** (`src/game/cast.ts`, `src/game/bossart.ts`) as flat shapes with an ink line, then **cut into puppet pieces** (cape, back arm, back leg, body, front leg, head, front arm). Each piece gets its own white paper border and a soft drop shadow.
- The renderer (`src/game/puppet.ts`) swings each piece about its joint every frame, so motion is continuous rather than frame-by-frame:
  - **Walk:** legs and arms swing opposite each other, the body bobs on the passing pose and leans in, the head nods, capes trail.
  - **Actions:** melee heroes wind up and chop when they reach the boss, archers raise and draw the bow, healers lift the staff, goblins club.
  - **Reactions:** a squash and head-snap when hit, flailing limbs when launched, and a card-flip (the width passes through zero) when turning around.
  - **Defeat:** the puppet falls back flat like a knocked-over standee and folds away in paper confetti.
  - **Paper flutter:** a vertex-shader bend keeps heads, capes and wings from ever looking rigid.
- **Bosses** are puppets too: the dragon's wing flaps, its tail wags and its head lunges when breathing fire; the slime squashes and stretches while its crown bounces a beat behind; the Bone Lord floats, its cape sways and its staff rises to summon. Faces have idle, blink and "ouch" versions.
- All pieces live in one texture atlas and one instanced mesh per group, so hundreds of heroes (about seven pieces each) stay a couple of draw calls.

## The cast

| Hero | Look | Personality |
|---|---|---|
| **Noob** | yellow head, default shirt, tiny sword | cheerful and clueless; the crowd |
| **Archer** | hood with a feather, quiver, longbow | smug, keeps her distance |
| **Knight** | plumed great-helm, crest shield | slow, stubborn, hard to knock over |
| **Tryhard** | gamer headset, hoodie, glowing blade, sweat drops | gritted teeth, dashes at you |
| **Healer** | tall hat, robe, leafy glowing staff | serene, keeps everyone topped up |
| **Goblin** (yours) | big ears, fangs, spiked club | happy to help |

Every hero class has two outfits so crowds look varied. The three champions each have a unique design: **Sir Tryhard** (gold armour, blue cape, moustache, big sword), **xX_Clutch_Xx** (esports jersey #1, shades, backwards cap, energy hammer) and **THE CHOSEN ONE** (spiky golden hair, red scarf, glowing legendary sword).

Heroes talk like players in a lobby, in comic speech bubbles: taunts ("1v1 me bro", "trust me im pro"), yelps when launched ("wheee!", "LAG!!"), last words ("gg", "nerf boss"), and a line for each champion entrance. All lines are kid-safe.

## Art direction: candidates (historical)

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
