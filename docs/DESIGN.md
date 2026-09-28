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

## v2: BOSS CASTLE (survivors + tower defense)

**Pitch:** *You're the final boss, and the heroes remember you.* Vampire Survivors and tower defense in one game, played as the villain defending your own treasure.

**Why this is ours.** v1 is a survivors game with the names swapped: heroes behave like any horde. A real boss has three things a survivors hero does not (a **lair**, **treasure** and a **reputation**), and v2 makes all three matter. The nearest comparisons are *Orcs Must Die* (you plus traps against a horde) and *Dungeon Keeper* (you run the dungeon). Neither puts you in the boss's shoes with survivors controls, pinball physics and a kid audience.

### The loop: one night, one raid

1. **Build phase.** Place walls, traps and towers on your castle grid. Untimed by default; press READY.
2. **Raid phase (about 2–3 minutes).** Heroes enter through gates and path toward the **treasure vault**. Buildings work automatically; you roam as the boss exactly as in v1, levelling up and picking power cards mid-raid.
3. **Loot phase.** Count the treasure kept and spend it on building.

A **season** is 7 nights, ending with a legendary hero party.

**Core tension: treasure is both score and money.** Every coin spent on a tower is a coin not in the vault, and thieves are carrying coins out of the vault during every raid.

### How the two genres support each other

- **Walls shape paths**, as in classic tower defense. Fully sealing the vault does not work: heroes smash walls that block every route, so mazing is about slowing and steering, not stopping.
- **Physics makes the castle a pinball table.** Launch pads fling heroes down corridors into spike pits and bowl over the heroes behind them. Layout creates combos.
- **The boss is the hero unit** (as in *Kingdom Rush*), needed where the defences leak: chasing thieves, plugging gaps, saving the vault.
- **Power cards can upgrade buildings** ("every saw gets a second blade") as well as the boss, so the survivors build and the castle build feed each other.

### Treasure and thieves

- Heroes grab coins from the vault and **run for the exits**. A thief is marked with a coin bag over their head.
- Hitting a thief makes them drop the loot; coins that escape are lost.
- **Mimic chests** are decoy treasure: thieves go for them and get bitten.

### Buildables (paper-craft)

Walls, spike pits, launch pads, saw blades, lava moats, slime puddles (slow), goblin barracks (spawns minions), skeleton archer tower, trapdoors, mimic chests.

### Heroes with jobs

| Hero | Job |
|---|---|
| Rogue | sneaks straight for the treasure, avoids the boss |
| Builder | breaks walls |
| Wizard | disables traps for a few seconds |
| Knight | tanks, hard to launch |
| Healer | keeps the party alive |
| Noob / Archer / Tryhard | the v1 crowd |

### Nemesis heroes

A thief who escapes **levels up and returns** on later nights and in later runs, wearing what they stole (your crown, a scale from your tail). *"xX_BaconSlayer_Xx returns! Level 3, wearing your crown."* Saved in the browser, so no accounts are needed.

### Story

You are the final boss in *Heroes Online*, a huge fantasy game, programmed to lose at every server reset so players can farm your loot. One day you decide not to lose. If you keep losing, the developers delete you and replace you with a "better boss". Between raids the bosses hang out in the **Boss Break Room**: Blaze is secretly nervous, Gloop just wants friends, Rattles is extremely dramatic. The hub is where you unlock bosses, spend kept treasure on permanent upgrades, and read your rivals' boasts. The season finale is a **speedrunner** who has "solved" your castle; beat them and you are promoted to legendary boss.

### Build order

1. **Treasure vault and thieves** in the current arena, to prove the stealing loop is fun before building anything else. **Built.** The vault starts at 100 gold in the middle of the arena; heroes enter through four gates; rogues (and a growing share of other heroes) go for the gold, grab 3 coins, and run for the nearest gate at 85% speed. Hitting a thief spills the coins, which fly home. A **heist crew** of rogues enters at the gate farthest from the boss every 90 seconds, so defending means leaving the vault. The run is lost if the boss's health or the vault reaches zero. Edge-of-screen markers point to the vault and to fleeing thieves.
   *Difficulty tiers:* after the first human playtest (a win with Rattles, 34 of 100 gold kept), **Heroic** and **Legendary** tiers were added. Each unlocks by winning the tier before it and multiplies hero health, spawn rate, hero damage and the share of thieves (`DIFFICULTIES` in `src/game/config.ts`). Steeper late-game hero health and faster late spawns were tried first and reverted: late in a run heroes die as fast as they arrive, so both only gave the player more XP. The late game stays a power fantasy on Normal; challenge comes from the tiers.
   *Balance status:* against the scripted bot, thieves rarely got away with more than 9 gold, and results varied mainly with the bot's upgrade picks. How much pressure thieves put on real players needs a playtest; the numbers are in `TREASURE` in `src/game/config.ts`.
2. **Castle map, grid pathfinding (flow field) and a build phase.** **Built** together with step 3. The castle is a 24×24 grid of 2-unit cells around the vault. Five buildings: wall (4 gold), spike pit (10), launch pad (15), saw blade (18) and bone archer tower (25). Walls may steer heroes but never seal the vault: a wall that would leave any gate without a path is refused ("Heroes need a way in!"). Heroes follow flow fields (to the vault, to the nearest gate, or to the boss) around walls; the boss walks over its own walls. Selling during the build phase refunds the full price, so experimenting is free, and building can never spend the vault's last coin.
3. **Nights, the economy and the season structure.** **Built.** A season is 7 nights (80–130 seconds each; night 7 lasts until the Chosen One falls). Champions arrive on nights 3, 5 and 7. The boss keeps its level and powers across nights; health refills at each dawn, surviving thieves drop their gold back into the vault, and a sunrise tribute (15–40 gold) is paid. Stars per night come from the share of the vault kept. Each build phase is saved in the browser, so a lost night can be retried and a season can be continued later.
   *Difficulty after the second playtest* (an easy Gloop win keeping 94 gold): the ladder moved up one step. **Chill** is the original Normal, **Normal** (the default) is the original Heroic, and Heroic and Legendary are new, harder tiers. Archers shoot harder and more often so camping the vault costs health, and champions have much more health. The scripted bot, which dies on night 2–3 without building, has proven a poor stand-in for real players; balance now follows playtests.
4. **Nemesis heroes.**
5. **Boss Break Room and the story frame.**

**v3 phase 1 (built):** breach ring with a surprise breach, counter heroes (Shieldbearer, Glider, Trap Nerd, Sapper), building health and repair, adaptive counters, source-based damage, limit breaks. Details in `docs/V3-PROPOSAL.md`.

**Sound (built):** everything is synthesized in `src/game/audio.ts`, so there are no files to license. `src/game/music.ts` plays four loops written as code: the title theme, calm build music, a raid beat that adds an arpeggio and then a lead melody as the night goes on, and a champion theme that shifts key for the Chosen One. The music ducks under pause and level-up screens. The sound button cycles through all sound, effects only, and off, and the choice is remembered.

**Hall of Bosses (built):** players never type a name; each device gets a generated two-word name with three rerolls before it locks. Season score = nights survived × 1000 + 2000 for a win + gold kept × 10 + heroes beaten − 500 per retry, times the tier (Chill 0.5, Normal 1, Heroic 1.5, Legendary 2); the numbers live in `SCORE` in `src/game/config.ts`. A retried season keeps one row, its best. The board is shared when the page runs in claude.ai with the artifact store granted, and local to the device otherwise. The shared store makes an artifact organization-only, so the public play link keeps the local board.

Later: raids against friends (friends design a hero party that raids your castle, with no chat), boss Phase 2 transformations, more bosses and biomes.

**Risks to watch:** pathfinding for 500 heroes (a shared flow field on the grid keeps this cheap), a building interface that works with thumbs on a phone, and scope: each step above should be playable and playtested before the next starts.

**Decided against:** "patch notes" that nerf the player's best move between runs (owner ruling).

## v1 roadmap ideas (superseded by v2 above where they overlap)

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
