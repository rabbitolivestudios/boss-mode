# TD + action hybrids: research report for BOSS MODE

**How this was researched:** WebFetch was blocked for almost every source I tried: the Thronefall wiki, steamcommunity.com, the Orcs Must Die wiki.gg, the Dome Keeper wiki, gamedeveloper.com, robotentertainment.com and the Rogue Tower fandom wiki. So every fact about a game below comes from WebSearch result summaries of the linked pages, not from reading the full pages. Treat exact numbers as "as reported by that source". Claims are tagged **[F]** for a sourced fact, **[I]** for my inference, and **[P]** for my proposal.

## Games studied

- **Thronefall.** Build by day, fight by night, with a hero king. It is the closest match to BOSS MODE's loop, and it shows exactly where each attack is coming from before every night.
- **Orcs Must Die! 2/3/Deathtrap.** Traps plus a hero in corridor maps. It has spawn doors that open over time, a path preview, and enemies that ignore or break barricades. Deathtrap adds spawn rifts that appear at random.
- **Kingdom Rush.** Hero plus towers on fixed build spots. It has armour and magic-resist counters, and a wave preview you tap to see the path each wave will take.
- **Dungeon Defenders.** A capped defence budget, plus enemies (Djinn, Kobolds, Wyverns) that are built to break or bypass defences.
- **Defense Grid: The Awakening.** Enemies steal cores and carry them out, and a dropped core can be relayed. This is the closest precedent to BOSS MODE's thieves.
- **Rogue Tower.** A roguelike TD where the path grows every wave, and enemies spawn from wherever the path ends.
- **Dome Keeper.** Wave strength scales with how far you have progressed through the run, not only with the wave number.
- **Bloons TD 6.** Enemy properties (camo, lead, fortified) that switch off specific towers, plus deliberate late-game income taxes.
- **Mindustry.** The spawn "drop zone" destroys any buildings inside it when a wave begins. Flying bosses skip ground defences.

## Mechanisms that matter

### 1. Spawn points: predictable, telegraphed, but moving

- **[F] Thronefall** shows before each night how many enemies of each type are coming from each spawn point, with icons for melee, ranged and flying ([Siliconera](https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/), [GameLuster](https://gameluster.com/thronefall-early-access-review-king-for-a-wave/), [Checkpoint](https://checkpointgaming.net/features/2023/08/thronefall-hands-on-preview-a-small-game-packing-a-big-punch/)). The final waves come "from all directions". On the map Totend the attack direction rotates each wave, so you can plan one step ahead ([New Game Network](https://www.newgamenetwork.com/article/2820/thronefall-review/), [game.wiki Totend](https://game.wiki/thronefall/totend)).
- **[F] Orcs Must Die 3.** Most maps have about 4 doors. Enemies start from 2 and the others open as the level goes on ([Steam level guide via search](https://steamcommunity.com/sharedfiles/filedetails/?id=2658386189)). Blue "wisps" show the enemies' planned path between waves, and they turn red when no path is open, meaning orcs will break a barricade ([OMD2 Tips wiki](https://orcsmustdie.fandom.com/wiki/Orcs_Must_Die!_2_Tips), [GameFAQs OMD2](https://gamefaqs.gamespot.com/pc/665786-orcs-must-die-2/faqs/64955)).
- **[F] OMD Deathtrap** "Unstable Rifts" are portals that can appear at any point during a wave, in random spots. On "teleporting" maps the objective rift is placed in one of 3 locations ([Deathtrap maps wiki](https://orcsmustdie.wiki.gg/wiki/Maps), [PC Gamer](https://www.pcgamer.com/games/action/orcs-must-die-deathtrap/)). Its mutations include corrupted ground that blocks trap placement ([PC Gamer](https://www.pcgamer.com/games/action/orcs-must-die-deathtrap/)).
- **[F] Kingdom Rush.** Tapping the next-wave skull shows which enemies are coming and which path they will take. A winged skull means flyers. Calling a wave early pays bonus gold and shortens ability cooldowns ([AyumiLove](https://ayumilove.net/kingdom-rush-walkthrough-guide/), [LevelWinner](https://www.levelwinner.com/kingdom-rush-beginners-guide-tips-tricks-strategies-to-vanquish-the-evil-forces/)).
- **[F] Rogue Tower.** The player adds one path tile per wave without knowing what shape it will be. Portals (the spawns) sit wherever the path cannot extend any further, so spawn locations change as the map grows ([Indie Hell Zone](https://indiehellzone.com/2022/02/21/rogue-tower/), [newsminer](https://www.newsminer.com/features/latitude_65/great_indoors/smart-challenges-make-rogue-tower-stand-out-in-the-tower-defense-genre/article_92aed7d4-8f7b-11ec-889f-cfea62d1ba09.html), [Rogue Tower wiki](https://rogue-tower.fandom.com/wiki/Map_features)).

**[I] The pattern across the genre.** None of these games hides where enemies spawn. They surprise you by changing the source over time, with a warning in advance: doors open later, direction rotates, portals move, and the last wave comes from everywhere. Being surprised with no warning appears only as a spice (Deathtrap's unstable rifts), not as the rule.

### 2. Stopping "stack everything at the spawn"

- **[F] Mindustry.** Its Drop Zone Radius rule destroys any blocks inside the spawn zone at the start of each wave. Separate rules stop players building near enemy structures ([Mindustry Editor/Rules wiki](https://mindustry-unofficial.fandom.com/wiki/Editor/Rules), [Rules API](https://mindustrygame.github.io/docs/mindustry/game/Rules.html)).
- **[F] Kingdom Rush and Thronefall** allow building only on predetermined plots. Thronefall's developers say waves are designed around those plots ([KR Strategic Point wiki](https://kingdomrushtd.fandom.com/wiki/Strategic_Point), [Pocket Gamer](https://www.pocketgamer.com/kingdom-rush/basic-strategies/), [TryHardGuides](https://tryhardguides.com/thronefall-review/)).
- **[F] Dungeon Defenders.** Every defence costs mana and also uses up a finite Defense Unit (DU) cap, with stronger towers using more DU ([DD wiki: Defense Units](https://dungeondefenders.fandom.com/wiki/Defense_Units)).
- **[F] OMD.** Barricades and wisps make the player build mazes. Some enemies ignore the layout: Gnolls walk over barricades, and about 3 Sappers destroy one ([OMD Barricade wiki](https://orcsmustdie.fandom.com/wiki/Barricade)).
- **[I]** I could not confirm that OMD has a no-build radius at its spawn doors (a search found no documented rule). Do not cite OMD for that.

### 3. Enemies that counter specific defences

- **[F] Thronefall.** Racers ignore every structure and go straight for the castle. Hunterlings target the king. Rams are siege units. Exploders die when they hit a building and explode. Fury is a large flyer that focuses on destroying your defences ([Thronefall wiki via search](https://throne-fall.github.io/game-content/enemies/index.html), [Shapes](https://shapes.inc/fandom/thronefall/units-and-buildings)).
- **[F] Dungeon Defenders.** Djinn are the only enemies that can destroy traps and auras directly. Kobolds light a fuse and explode on contact with a defence. Wyverns can be hit only by projectile towers or specific traps ([Djinn](https://dungeondefenders.fandom.com/wiki/Djinn), [Kobold](https://dungeondefenders.fandom.com/wiki/Kobold), [Wyvern](https://dungeondefenders.fandom.com/wiki/Wyvern)).
- **[F] OMD.** Kobold Sappers rush ahead with bombs aimed at the player, guardians or barricades. Fire Ogres take only 20% of fire damage ([Kobold Sapper wiki](https://orcsmustdie.fandom.com/wiki/Kobold_Sapper), [GameFAQs OMD1](https://gamefaqs.gamespot.com/pc/622894-orcs-must-die/faqs/63621)).
- **[F] BTD6.** Towers ignore Camo bloons unless they have detection. Lead is immune to sharp damage. The DDT combines lead, black and camo. The lead, pink and black properties were added specifically to counter popular anti-MOAB towers ([Camo wiki](https://bloons.fandom.com/wiki/Camo_Bloon), [DDT wiki](https://bloons.fandom.com/wiki/Dark_Dirigible_Titan_(DDT))).
- **[F] Kingdom Rush** has physical armour and magic resistance. Levels send high-HP or magic-resistant enemies specifically to discourage a single-tower strategy ([KR armour wiki](https://kingdomrushtd.fandom.com/wiki/Armor_and_Magic_resistance)).
- **[F] Rogue Tower** enemies have up to 3 layers: Shield, then Armor, then Health, removed in that order. Some regenerate. The wave-25 boss is stacked with shields ([Rogue Tower Monsters wiki](https://rogue-tower.fandom.com/wiki/Monsters), [GameSpot review](https://www.gamespot.com/rogue-tower/user-reviews/2200-12849335/)).
- **[F] Mindustry.** Guardian bosses get +50% health and +30% damage. Flying guardians "plow through" defences and sometimes take routes that miss defences entirely ([Guardian wiki](https://mindustry-unofficial.fandom.com/wiki/Guardian), [Steam discussion via search](https://steamcommunity.com/app/1127400/discussions/0/3548301990163033805/)).

### 4. Economy and ramping difficulty

- **[F] BTD6 taxes income per bloon popped in late game.** It drops to 50% from round 51, then 20% from 61, 10% from 86, 5% from 101, and lower after that. Beyond round 80, "ramping" makes MOABs faster and tougher every round ([Rounds wiki](https://bloons.fandom.com/wiki/Rounds_(BTD6)), [Late Game wiki](https://bloons.fandom.com/wiki/Late_Game_and_Freeplay_(BTD6))).
- **[F] Dome Keeper.** Wave strength follows a "run weight" built from resources collected, wave count and gadgets owned. After about wave 10, wave count dominates ([Steam discussion via search](https://steamcommunity.com/app/1637320/discussions/0/5704402939715471022/), [Dome Keeper wiki](https://domekeeper.wiki.gg/wiki/Technical_Terms)).
- **[F] Thronefall.** Income comes from houses (1 gold per night, +1 per upgrade) and harbours. The standard advice is "economy first, but only when you can defend it perfectly" ([GameRant](https://gamerant.com/thronefall-how-to-build-better-economy-get-more-gold/), [gameplay.tips](https://gameplay.tips/guides/thronefall-building-and-upgrade-tips.html)).
- **[F] Defense Grid.** Aliens carry off 1 to 3 cores. The loss counts only when a core leaves the map. A dropped core floats back slowly, and any other alien can pick it up and carry it on ([Wikipedia](https://en.wikipedia.org/wiki/Defense_Grid:_The_Awakening), [Gaming Nexus](https://www.gamingnexus.com/Article/2354/Defense-Grid-The-Awakening/)).

### 5. Keeping the hero necessary

- **[F]** Thronefall's Hunterlings hunt the king, and Racers skip all buildings. Both leave the king as the only answer ([Thronefall wiki via search](https://throne-fall.github.io/game-content/enemies/index.html)).
- **[F]** In Dungeon Defenders, melee heroes can jump to hit low-flying wyverns ([Wyvern wiki](https://dungeondefenders.fandom.com/wiki/Wyvern)).
- **[F]** In Kingdom Rush, calling waves early speeds up hero and spell cooldowns ([AyumiLove](https://ayumilove.net/kingdom-rush-walkthrough-guide/)).
- **[I]** The common mechanism is a set of enemies that defences cannot handle by design: flyers, trap-breakers, runners that ignore structures, and units that hunt the hero. It is not "defences are weak". When defences can handle everything, the hero becomes decoration. That matches the owner's report of taking almost no damage.

## What BOSS MODE should steal

Ranked by how much of the playtest problem each one fixes. All of these are **[P]**.

1. **Rotating, telegraphed gates.** *Fixes: "where the enemies come from is too predictable"; spikes on every spawn.* Replace the 4 fixed gates with 8 to 12 possible breach points around the ring. Open only 1 or 2 on night 1 (as OMD's doors do), and add or rotate breaches each night (as on Totend). Show them during the build phase in the Thronefall style: a red arrow per gate, a count, and melee/ranged/flying/thief icons. The final night comes from everywhere. Add a Deathtrap-style mid-night "surprise breach" from night 4 onward, with a 3 to 5 second warning (crack or glow on the wall), so a kid can react instead of being blindsided. Prediction becomes a skill instead of a solved puzzle.

2. **A spawn drop zone that clears traps.** *Fixes: spike cheese directly.* Adopt Mindustry's rule: nothing can be built within about 3 tiles of any breach point, and anything inside it is destroyed when a breach opens (so surprise breaches punish over-building near gates). Pair it with a visible "no-build" hatch pattern on the grid. This is cheaper and clearer than fixed plots, and keeps the 24x24 free grid.

3. **Hero counters that defences cannot solve.** *Fixes: "hardly took any damage"; "increasingly difficult enemies".* Introduce these one per night so each is readable:
   - **Sappers.** Fast; they blow up one building on contact (Kobold, Exploder).
   - **Flyers.** Ignore walls, spikes and saws; only towers and the boss can hit them (Wyvern, Fury).
   - **Jumpers or climbers.** Hop over walls and spike pits (OMD Gnolls).
   - **Armoured "shield" heroes.** Immune to trap damage until the boss's hit or a launch breaks the shield (Rogue Tower layers, BTD6 lead).
   - **Boss-hunters.** Ignore the vault and dive the boss (Hunterlings).
   - **Speedrunner thieves.** Take a path that ignores structures (Racers).

   Scale the share of these by night, not only HP. Kid-readable rule: one icon per counter, shown in the gate preview.

4. **Building durability and repair.** *Fixes: the "set and forget" defence that ends the need to move.* Give traps HP or charges that sappers, rams and heavy heroes wear down, with repair costing gold at dawn. Dungeon Defenders' Djinn and OMD's sapper-versus-barricade rule both show that defences under attack make players move and react. Optionally add a DU-style cap on active traps (Dungeon Defenders) so gold alone doesn't scale defences without limit.

5. **Upgrades that run through night 7, and difficulty that follows player power.** *Fixes: "exhausted all upgrades by night 5 or early 6".* Two levers here:
   - Pace the supply. Make XP needed per level grow faster, or tie ability tiers 4 and 5 to champion kills on nights 3, 5 and 7.
   - Borrow Dome Keeper's run weight. Wave strength = f(night, boss level, total building value), so strong builds attract stronger raids.
   - Add a BTD6-style drop in gold per kill on later nights, so gold stops snowballing.

   **Caution, per the "levers" rule:** before tuning, measure what actually bound the winning run. It kept only 1 gold, so gold was not piling up. The real problem was trap placement and zero damage taken, not the size of the treasury. Items 1 to 3 are aimed at that. Item 5 is secondary.

6. **Defense Grid core relay for thieves.** *Fixes: needing the hero (and makes thieves a threat that isn't about the spawn).* Dropped coins drift back slowly and can be re-grabbed by another thief. The boss must chase and intercept, since traps can't "catch" a moving coin.

7. **Kingdom Rush early call.** *Fixes: too easy for skilled players, and lets difficulty adjust itself.* A "Bring it on!" button that starts the night early (or triggers the next surge) for bonus gold and faster ROAR charge. Strong players choose harder play and get rewarded, while kids can decline.

8. **Path preview ghosts** (OMD wisps). Show dotted flow-field lines from each open breach to the vault during the build phase, turning red where heroes will break a wall. This makes the rotating gates in item 1 fair and teachable for ages 10 to 14.

## Traps to avoid

- **Fully random spawns with no warning.** Genre leaders telegraph (Thronefall, KR, OMD wisps). Unfair surprise frustrates kids. Deathtrap's random-rift variety was criticised as fading quickly after a few runs ([PC Gamer](https://www.pcgamer.com/games/action/orcs-must-die-deathtrap/)).
- **Hard-countering the player's favourite build with no alternative.** BTD6's DDT needs a specific combination of detection and damage type ([DDT wiki](https://bloons.fandom.com/wiki/Dark_Dirigible_Titan_(DDT))). For kids, every counter enemy should be beatable by the boss directly, even when traps fail.
- **Boss spikes out of proportion.** Players complained that Mindustry guardian waves were "50x harder than preceding waves" and "childish gotcha bosses" ([Steam discussion](https://steamcommunity.com/app/1127400/discussions/0/3266808619813296026/), [Steam discussion](https://steamcommunity.com/app/1127400/discussions/0/3105765614235703891/)). Ramp champions smoothly.
- **Tuning only HP multipliers.** The owner asked for "increasingly difficult enemies". **[I]** More HP on the same heroes still gets killed by the same spikes at the same place. The change has to be in enemy behaviour.
- **Fixed plots imported wholesale.** They solve cheese (KR, Thronefall), but Thronefall players ask for more freedom of placement ([Steam discussion](https://steamcommunity.com/app/2239150/discussions/0/4034724602260513609/)). **[I]** A no-build radius plus rotating gates keeps BOSS MODE's free grid.
- **Trusting bot difficulty.** Already known from the brief: the bot died on night 2 or 3 while a human cleared everything. Validate with human play at each tier.

## Sources

- https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/
- https://gameluster.com/thronefall-early-access-review-king-for-a-wave/
- https://checkpointgaming.net/features/2023/08/thronefall-hands-on-preview-a-small-game-packing-a-big-punch/
- https://www.newgamenetwork.com/article/2820/thronefall-review/
- https://game.wiki/thronefall/totend
- https://throne-fall.github.io/game-content/enemies/index.html (search summary only; fetch blocked)
- https://shapes.inc/fandom/thronefall/units-and-buildings
- https://tryhardguides.com/thronefall-review/
- https://gamerant.com/thronefall-how-to-build-better-economy-get-more-gold/
- https://gameplay.tips/guides/thronefall-building-and-upgrade-tips.html
- https://steamcommunity.com/app/2239150/discussions/0/4034724602260513609/
- https://steamcommunity.com/sharedfiles/filedetails/?id=2658386189
- https://orcsmustdie.fandom.com/wiki/Orcs_Must_Die!_2_Tips
- https://orcsmustdie.fandom.com/wiki/Barricade
- https://orcsmustdie.fandom.com/wiki/Kobold_Sapper
- https://gamefaqs.gamespot.com/pc/665786-orcs-must-die-2/faqs/64955
- https://gamefaqs.gamespot.com/pc/622894-orcs-must-die/faqs/63621
- https://orcsmustdie.wiki.gg/wiki/Maps
- https://www.pcgamer.com/games/action/orcs-must-die-deathtrap/
- https://kingdomrushtd.fandom.com/wiki/Strategic_Point
- https://kingdomrushtd.fandom.com/wiki/Armor_and_Magic_resistance
- https://ayumilove.net/kingdom-rush-walkthrough-guide/
- https://www.levelwinner.com/kingdom-rush-beginners-guide-tips-tricks-strategies-to-vanquish-the-evil-forces/
- https://www.pocketgamer.com/kingdom-rush/basic-strategies/
- https://dungeondefenders.fandom.com/wiki/Defense_Units
- https://dungeondefenders.fandom.com/wiki/Djinn
- https://dungeondefenders.fandom.com/wiki/Kobold
- https://dungeondefenders.fandom.com/wiki/Wyvern
- https://en.wikipedia.org/wiki/Defense_Grid:_The_Awakening
- https://www.gamingnexus.com/Article/2354/Defense-Grid-The-Awakening/
- https://indiehellzone.com/2022/02/21/rogue-tower/
- https://www.newsminer.com/features/latitude_65/great_indoors/smart-challenges-make-rogue-tower-stand-out-in-the-tower-defense-genre/article_92aed7d4-8f7b-11ec-889f-cfea62d1ba09.html
- https://rogue-tower.fandom.com/wiki/Map_features
- https://rogue-tower.fandom.com/wiki/Monsters
- https://www.gamespot.com/rogue-tower/user-reviews/2200-12849335/
- https://steamcommunity.com/app/1637320/discussions/0/5704402939715471022/
- https://domekeeper.wiki.gg/wiki/Technical_Terms
- https://bloons.fandom.com/wiki/Camo_Bloon
- https://bloons.fandom.com/wiki/Dark_Dirigible_Titan_(DDT)
- https://bloons.fandom.com/wiki/Rounds_(BTD6)
- https://bloons.fandom.com/wiki/Late_Game_and_Freeplay_(BTD6)
- https://mindustry-unofficial.fandom.com/wiki/Editor/Rules
- https://mindustrygame.github.io/docs/mindustry/game/Rules.html
- https://mindustry-unofficial.fandom.com/wiki/Guardian
- https://steamcommunity.com/app/1127400/discussions/0/3266808619813296026/
- https://steamcommunity.com/app/1127400/discussions/0/3105765614235703891/
- https://steamcommunity.com/app/1127400/discussions/0/3548301990163033805/

**Could not verify:**
- Whether Dome Keeper waves come from both sides, and whether there is an indicator (no source found).
- Any rule in OMD that stops traps being placed at spawn doors.
- Exact Thronefall enemy stats. The wiki fetch was blocked, and the Thronefall claims above rely on search snippets only.