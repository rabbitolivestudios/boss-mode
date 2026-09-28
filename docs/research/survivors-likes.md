# Survivors-likes research: late-game challenge and running out of upgrades

## Games studied

- **Vampire Survivors**: the game that started the genre. It is relevant because it has several systems for keeping the upgrade pool from running dry: Limit Break, Banish, Skip, Reroll, evolutions and Arcanas. It also has a hard end to each stage (the Reaper) and difficulty modes (Inverse, Hyper, Hurry).
- **Brotato**: an arena game played in short waves with a shop between them, which is the closest structural match to BOSS MODE's night and build-phase loop. It shows how "Danger" tiers add elite and horde waves, and how spawn points move around the arena each time.
- **Halls of Torment**: a harder, Diablo-styled game. Its Agony mode raises the difficulty as the clock runs, inside a single run, and adds "Champion" elites that gain new abilities.
- **HoloCure**: a free fan game. Its formation spawns (rings, walls, stampedes) force the player to move, and its normal stages stop at a set difficulty while Hard stages keep climbing.
- **20 Minutes Till Dawn**: 16 stacking "Darkness" levels, each adding one modifier. It shows how to build difficulty in small steps you can read.
- **Deep Rock Galactic: Survivor**: the player must kill elites to move to the next stage, and weapons get branching "overclock" choices at set levels.
- **Soulstone Survivors**: "curses" the player switches on before a run, including more frequent elites. It shows the risk of too many difficulty layers.
- **Death Must Die**: a shop whose best rarity is capped by how many bosses you have killed, plus Darkness levels that go up to 100.
- **Magic Survival**: a mobile survivors-like. It is useful only as proof that the genre works on phones; I found no verifiable numbers for it.

## Mechanisms that matter

### A. Difficulty that rises with the clock and with player power (facts)

- **VS Curse stat.** "Curse increases the frequency and quantity of enemy waves, as well as their speed and health, by the percentage of Curse" ([wiki](https://vampire-survivors.fandom.com/wiki/Curse)). Players pick it up voluntarily, from items and characters.
- **VS mini-bosses scale with the player's level.** Their HP is "HP x Level", set when they spawn ([Steam discussion](https://steamcommunity.com/app/1794680/discussions/0/3489752656787156939/)). The Reaper has 655,350 HP multiplied by the player's level ([wiki](https://vampire-survivors.fandom.com/wiki/The_Reaper)). So a stronger player automatically faces stronger bosses.
- **VS cycles.** When a stage passes its last minute, the waves start again from minute 0 and "Enemies gain 100% of their base Max Health per cycle" ([Stages wiki](https://vampire-survivors.fandom.com/wiki/Stages)).
- **VS Inverse mode.** Enemies start at +200% HP and gain +5% HP and +0.5 move speed every minute. It pays +200% gold ([source](https://orbispatches.com/gaming-faq/what-does-inverse-mode-do-vampire-survivors)). The Bone Zone stage adds 15% HP and 2.5% speed per minute with no cap ([Stages wiki](https://vampire-survivors.fandom.com/wiki/Stages)).
- **Halls of Torment Agony.** A meter fills over time and adds one Agony Rank every 4:48, up to rank 5 after 24 minutes. Each rank raises enemy count, enemy HP and XP. Reviving takes 20% off the meter ([wiki](https://hot.fandom.com/wiki/Agony), [search summary of the Champion page](https://hot.fandom.com/wiki/Champion)).
- **Brotato waves.** Wave 1 lasts 20s and each wave is 5s longer, up to 60s. Every enemy gains a fixed +HP per wave; a Tree, for example, starts at 10 HP and gains +5 per wave ([Waves wiki](https://brotato.wiki.spellsandguns.com/Waves)). Danger 3, 4 and 5 give all enemies +12%, +26% and +40% HP and damage ([gameplay.tips](https://gameplay.tips/guides/brotato-danger-5-guide.html)). I could not verify the Danger 1 and 2 values.
- **20MTD Darkness.** There are 16 levels (0 to 15), and each level keeps the effects of the ones before it. Darkness 2: small enemies spawn 25% more often and have 25% more HP. Darkness 5: elites hit for 2 HP. Darkness 10: small enemies hit for 2 in the last 5 minutes ([Darkness wiki](https://20-minutes-till-dawn.fandom.com/wiki/Darkness)). I could not get the full list because the wiki is blocked from this sandbox.
- **Soulstone Survivors.** Curses are optional and chosen before the run, for example fewer healing drops or more frequent elites ([Steam discussion](https://steamcommunity.com/app/2066020/discussions/0/3490879839982636719/)). Unlocks max out at Curse 36, but curses go up to 62 ([same](https://steamcommunity.com/app/2066020/discussions/0/3490879839982636719/)). The developers later had to rework scaling entirely ([patch notes](https://steamdb.info/patchnotes/13884795/)).

### B. Elite and mini-boss timing (facts)

- **Brotato elite and horde waves.** None appear at Danger 0 or 1. There is one at Danger 2 and 3, and three at Danger 4 and 5. They fall on wave 11 or 12, then wave 14 or 15, and the third is always an elite on wave 17 or 18. Each is 60% likely to be an elite and 40% a horde. Hordes drop 35% fewer materials per enemy but bring more enemies. Elites drop a Legendary crate that heals 100 HP ([Elite/Horde wiki](https://brotato.wiki.spellsandguns.com/Elite_and_Horde_Waves)).
- **Brotato elites and bosses.** Elites "mutate" into new phases 2 or 3 times, triggered after 25-30 seconds or at 40-50% damage taken ([single-player.org](https://single-player.org/post/84-how-to-fight-elites-in-brotato)). Wave 20 is a boss wave. At Danger 5 both bosses spawn at 75% HP, before the +40% Danger bonus ([gameplay.tips](https://gameplay.tips/guides/brotato-danger-5-guide.html)).
- **HoT Champions.** A Champion spawns every 150s, 9s sooner for each Agony Rank. Champions gain abilities their normal type does not have, for example "summon purple skeletons, or dash across the screen leaving fire in their wake", and they drop good loot ([Champion wiki](https://hot.fandom.com/wiki/Champion), [Agony wiki](https://hot.fandom.com/wiki/Agony)).
- **VS.** Timed bosses drop chests. Special bosses at 11:00 and 21:00 drop Arcana chests offering 4 choices (6 if the player owns 23 or more Arcanas) ([BlueStacks guide](https://www.bluestacks.com/blog/game-guides/vampire-survivors/vps-arcana-card-guid-en.html)).
- **DRG: Survivor.** You must kill the stage's elite to move on. The final stage is 4 elites and then a Dreadnought, which is one of two variants at 50% each ([DRG wiki](https://deeprockgalactic.wiki.gg/wiki/Survivor:Elimination)). The number of elites goes up with the Hazard level ([same](https://deeprockgalactic.wiki.gg/wiki/Survivor:Elimination)).

### C. Where enemies spawn, and enemies that force movement (facts)

- **VS.** Enemies "generally spawn just outside the screen" around the player, not at fixed map points ([Steam discussion](https://steamcommunity.com/app/1794680/discussions/0/3425571923619889388/)). Map events send swarms across the screen or "encircle the player with high health enemies". Mad Forest's flower walls are "not meant to be killed" because their HP levels up ([Steam discussion](https://steamcommunity.com/app/1794680/discussions/0/4346606879515964572/)).
- **Brotato.** Spawns land at random points in the arena. A red X appears 1 second before each spawn. If the player is standing on the X, the enemy spawns somewhere else instead ([Steam discussion](https://steamcommunity.com/app/1942280/discussions/0/3810656958845428240/), [Steam discussion](https://steamcommunity.com/app/1942280/discussions/0/3593339057331153772/)). **This rule is aimed squarely at the "camp the spawn point" exploit.**
- **HoloCure.** Enemies come in formations: "Rings" that surround the player, "Walls" that sweep across, and "Stampedes", which are faster walls. At 8:30 on stage 1, shield-carrying enemies close in on all sides ([HoloCure wiki](https://holocure.fandom.com/wiki/Enemy)).
- **Brotato Monk elite.** It creates tentacles that restrict movement and draws a circle around the player ([single-player.org](https://single-player.org/post/84-how-to-fight-elites-in-brotato)).

### D. How upgrade exhaustion is avoided (facts)

- **VS Limit Break.** Once the whole build is maxed, level-ups offer weapons past their normal cap instead of gold or chicken ([Limit Break wiki](https://vampire-survivors.fandom.com/wiki/Limit_Break)).
- **VS evolutions.** An evolution needs the weapon at max level (usually 8), its paired passive item, and a boss chest opened after 10:00 ([Rogue Ranker](https://rogueranker.com/vampire-survivors-evolution/)). The build therefore has a second goal after reaching max.
- **VS Banish, Skip and Reroll.** Banish removes an item from the rest of the run. Skip keeps some XP. Reroll reshuffles the offer. Using a reroll or banish before skipping is advised because they give "20% of the experience" ([Skip wiki](https://vampire-survivors.fandom.com/wiki/Skip), [Banish wiki](https://vampire-survivors.fandom.com/wiki/Banish)).
- **Brotato shop.** Of 199 items, 55 are Tier I, 55 Tier II, 55 Tier III and 34 Tier IV. Prices rise each wave by 10% of the base price plus 1. Reroll costs grow within one shop and reset at the next. Which tiers appear depends on the wave and on Luck, and Tier 3 is capped at 25% ([Fextralife](https://brotato.wiki.fextralife.com/Items), [Shop wiki summary](https://brotato.wiki.spellsandguns.com/Shop)). Most items are flat stat bonuses that stack without limit, so the pool never runs out.
- **HoT traits.** Higher ranks of a trait only enter the pool at certain levels. Potions let the player reroll, remove traits, and later pick the same trait more than once ([Trait wiki](https://hot.fandom.com/wiki/Trait), [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2984278062)).
- **DRG: Survivor overclocks.** Overclocks are offered at weapon levels 6 and 12, and a powerful but risky "Unstable" one at 18 ([DRG wiki](https://deeprockgalactic.wiki.gg/wiki/Survivor:Overclocks), [guide](https://game.lb-product.com/en/games/deep-rock-galactic-survivor/guides/deep-rock-galactic-survivor_overclock-guide)).
- **HoloCure.** Stamps upgrade the main weapon. Collab items combine into a "super collab", apparently one per run ([Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=3021610470)).
- **Death Must Die.** The shop's best rarity is capped by bosses killed in the current Act ([Shop wiki](https://dmd.fandom.com/wiki/Shop)).

### E. Meta-progression and difficulty ladders (facts)

- **Unlocking harder levels.** In 20MTD you unlock each Darkness level by beating the previous one ([wiki](https://20-minutes-till-dawn.fandom.com/wiki/Darkness)). In HoT, Agony unlocks per Hall by defeating its Lord ([wiki](https://hot.fandom.com/wiki/Agony)). HoloCure's developer keeps normal stages at "no more than Stage 2" difficulty, while Hard stages keep climbing ([HoloCure Stage wiki](https://holocure.fandom.com/wiki/Stage)).
- **Harder modes pay more.** VS Inverse pays +200% gold for +200% enemy HP ([source](https://orbispatches.com/gaming-faq/what-does-inverse-mode-do-vampire-survivors)).
- **One critique of the genre.** Once players understand VS it stops being hard. It is described as "a power fantasy with a gentle on-ramp", and Halls of Torment is described as the harder alternative ([Choost Games](https://choostgames.com/blog/games-like-vampire-survivors-but-harder/), [kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors)). This is opinion, not data.

## Inferences (mine, not sourced)

1. None of these games has fixed, visible spawn points that the player can build over. The two that face the problem head-on use two defences: spawn relative to the player's position (VS), or pick random marked points and move the spawn if it is blocked (Brotato's X). BOSS MODE's 4 fixed gates combined with free spike placement is a structure the genre avoids.
2. Every game studied ties late difficulty to a quantity with no ceiling (the clock, player level, cycles or Curse), or to a new behaviour such as elite abilities, mutations or formations. BOSS MODE's tiers scale fixed numbers set before the run. Nothing in them responds to how powerful the player has become. That fits "exhausted all upgrades by night 5" combined with "too easy".
3. The finding "exhausted all upgrades" suggests a small pool: 8×5 abilities with a max of 4, plus 6×5 passives, so a full build of 4 abilities and 6 passives is 50 level-ups. The genre stretches this by making maxing out a *start*: evolutions, Limit Break, overclocks, and shop items that keep stacking.

## What BOSS MODE should steal (proposals, ranked)

1. **Move spawns every night, show a warning, and never spawn on something you built** (fixes "spikes on all spawn points" and "too predictable").
   - Each night picks N breach points from a larger set: ring edges, holes dug in the ground, portals, "respawn beams".
   - The dawn or build phase shows only *some* of them. The rest appear with a 1-2 second telegraph during the night, the way Brotato's X does.
   - If the breach tile has a trap on it, the breach moves elsewhere, or the heroes "break" the trap on arrival.
   - Build-phase traps then protect *routes to the vault*, not spawn tiles.
2. **Make elites that scale with the boss's level, plus a set schedule of elites and hordes** (fixes "need increasingly difficult enemies").
   - Copy VS's HP × player level and Brotato's elite and horde nights.
   - Every night from night 2 has at least one timed "raid leader" elite with an ability that counters the build: a dash, jumping over walls, disarming traps, or healing aura bubbles.
   - Champions (nights 3, 5, 7) gain a new phase at 50% HP, like Brotato's mutations.
3. **Formations that make the boss move** (fixes "predictable" and "hardly took any damage").
   - HoloCure-style rings that close around the boss, walls, and fast stampedes.
   - A "squad push" of tryhards in a line.
   - Traps cannot handle these, because they spawn relative to the boss, not at the gates.
4. **Stop the upgrade pool from running out** (fixes "exhausted all upgrades by night 5-6").
   - Evolutions: a max-level ability plus its paired passive evolves in a chest dropped by a champion.
   - Limit Break-style +1% level-ups with no cap once everything is maxed.
   - Keep skip and banish. Use an Overclock-style branching choice at ability levels 3 and 5.
5. **A threat meter that rises with the clock inside the run**, like HoT's Agony, instead of only tiers picked before the run. Each night, and each minute within a night, raises hero HP and spawn density with no cap on the last night. Nights past the season could run "cycles" of +100% HP each, like VS.
6. **Build costs that rise each night, or a cap on traps**, like Brotato's +10% inflation per wave. Spamming spikes stops being free, and the build phase becomes a real choice.
7. **An opt-in ladder of harder levels with bigger rewards** (20MTD/Soulstone style), unlocked by winning. Keep it to about 10 levels, each adding one modifier a kid can read ("Heroes bring a Trap-Breaker").

## Traps to avoid

- **Scaling only HP.** Pure HP inflation makes fights slow without making them hard, and the boss still stands on the spikes. Add new behaviours as well as bigger numbers.
- **Too many curse or difficulty layers.** Soulstone needed a full rework of its scaling ([patch](https://steamdb.info/patchnotes/13884795/)). One ladder is easier to read than stacked modifiers, especially for 10-14 year olds.
- **Evolutions that need a wiki.** VS's pairings are notoriously obscure. Show the recipe in the game.
- **Randomness that feels like a loot box.** Rerolls and chests must stay free and earned in play, with no paid randomness, to stay kid-safe.
- **Tuning with bots.** A bot died on night 2 while a human won easily. Tune the threat curve against the *exploit build* (full spike coverage), not against the average player.
- **Too many units on a phone.** Horde waves and extra-density rules multiply unit counts. Scale elites and behaviours before raw counts.
- **Unfair spawns.** Moving spawns must always be warned. An unwarned spawn right on top of the boss reads as cheating.

## Sources

- https://vampire-survivors.fandom.com/wiki/Curse
- https://vampire-survivors.fandom.com/wiki/The_Reaper
- https://vampire-survivors.fandom.com/wiki/Stages
- https://vampire-survivors.fandom.com/wiki/Limit_Break
- https://vampire-survivors.fandom.com/wiki/Skip
- https://vampire-survivors.fandom.com/wiki/Banish
- https://steamcommunity.com/app/1794680/discussions/0/3489752656787156939/
- https://steamcommunity.com/app/1794680/discussions/0/3425571923619889388/
- https://steamcommunity.com/app/1794680/discussions/0/4346606879515964572/
- https://orbispatches.com/gaming-faq/what-does-inverse-mode-do-vampire-survivors
- https://www.bluestacks.com/blog/game-guides/vampire-survivors/vps-arcana-card-guid-en.html
- https://rogueranker.com/vampire-survivors-evolution/
- https://brotato.wiki.spellsandguns.com/Elite_and_Horde_Waves
- https://brotato.wiki.spellsandguns.com/Waves
- https://brotato.wiki.spellsandguns.com/Shop
- https://brotato.wiki.fextralife.com/Items
- https://gameplay.tips/guides/brotato-danger-5-guide.html
- https://single-player.org/post/84-how-to-fight-elites-in-brotato
- https://steamcommunity.com/app/1942280/discussions/0/3810656958845428240/
- https://steamcommunity.com/app/1942280/discussions/0/3593339057331153772/
- https://hot.fandom.com/wiki/Agony
- https://hot.fandom.com/wiki/Champion
- https://hot.fandom.com/wiki/Trait
- https://steamcommunity.com/sharedfiles/filedetails/?id=2984278062
- https://holocure.fandom.com/wiki/Enemy
- https://holocure.fandom.com/wiki/Stage
- https://steamcommunity.com/sharedfiles/filedetails/?id=3021610470
- https://20-minutes-till-dawn.fandom.com/wiki/Darkness
- https://deeprockgalactic.wiki.gg/wiki/Survivor:Elimination
- https://deeprockgalactic.wiki.gg/wiki/Survivor:Overclocks
- https://game.lb-product.com/en/games/deep-rock-galactic-survivor/guides/deep-rock-galactic-survivor_overclock-guide
- https://steamcommunity.com/app/2066020/discussions/0/3490879839982636719/
- https://steamdb.info/patchnotes/13884795/
- https://dmd.fandom.com/wiki/Shop
- https://choostgames.com/blog/games-like-vampire-survivors-but-harder/
- https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/vampire-survivors

**Limits of this research:** Most wiki pages (the VS, Brotato, 20MTD and DRG wikis) are blocked from this sandbox. The facts above come from search-result summaries of those pages, not from reading them directly. I could not verify these: the Brotato Danger 1-2 values, the full 20MTD Darkness list, Magic Survival mechanics, or Death Must Die elite timing.