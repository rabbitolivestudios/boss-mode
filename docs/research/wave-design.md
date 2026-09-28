# Wave and enemy design research for BOSS MODE

Note on method: WebFetch was blocked for most wikis (riskofrain2 wiki.gg and fandom, left4deadwiki, maxroll, rndthursday). The facts below come from web search result summaries of the cited pages. I did not open the pages themselves, so treat exact numbers as "reported by the cited page" and check them before they go into data files. I did not open the BOSS MODE repo, so my proposals are based on the design summary in the task, not the code.

---

## Games studied

- **Risk of Rain 2** is a roguelite shooter where a "Director" spends credits to buy enemies. It is the reference model for spawning that grows harder over time and runs on a budget.
- **Left 4 Dead** is a co-op shooter whose AI Director reacts to how much pressure the players are under. It is the reference for pacing that responds to the player and for enemies built to break up camping.
- **Vampire Survivors** is the genre BOSS MODE copies. Its fixed per-minute waves, formation events and hard run-ending cap show what the genre does by default.
- **Brotato** is a wave-based arena survivor. It has telegraphed spawn points that the player can deny, and it randomizes elite and horde waves inside fixed windows.
- **Diablo III** gives elite packs affixes (combinable modifiers). It shows how modifiers create variety cheaply, and how badly they can combine.
- **Hades** has encounters built from waves plus the Pact of Punishment, a menu of opt-in difficulty modifiers.
- **Doom 2016 and Doom Eternal** give each enemy a combat role ("chess pieces"), and some enemies exist to counter a player habit.
- **Bloons TD 6** is a tower-defense game. Its enemy properties (camo, lead) were added on purpose to beat dominant tower strategies. It is the direct precedent for units that counter a building layout.
- **Thronefall** is the closest structural relative: build by day, defend at night, with spawn directions previewed. It has mutators.
- **Kingdom Rush** is a tower-defense game with a wave preview and a "call the next wave early for gold" risk/reward.
- **Mindustry** is a factory and tower-defense game. Its spawn zones destroy buildings, which is the literal answer to "I put spikes on all the spawn points".
- **They Are Billions** is an RTS survival game. Earlier waves come from one point and the final wave comes from every side, which punishes a fixed defense.
- **Deep Rock Galactic** is a co-op horde shooter with "disruptive" special enemies that ignore normal spawn caps.

---

## Mechanisms that matter (facts, with sources)

### 1. Credit-based director (Risk of Rain 2)
- The Director earns credits that "increase linearly with difficulty coefficient". It picks a random enemy card from the stage's spawn list and spends credits to spawn a group of up to four. [fandom Directors](https://riskofrain2.fandom.com/wiki/Directors)
- The reported credit rate is `0.75 × (1 + 0.4 × coeff) × (players + 1) / 2`. [fandom Directors, via search snippet](https://riskofrain2.fandom.com/wiki/Directors)
- The difficulty coefficient is `(playerFactor + minutes × timeFactor) × 1.15^stagesCompleted`, where `timeFactor = 0.0506 × difficultyValue × players^0.2`. The difficulty values are Drizzle 1, Rainstorm 2 and Monsoon 3. [wiki.gg Difficulty](https://riskofrain2.wiki.gg/wiki/Difficulty)
- Elites cost more. Tier-1 elites (Blazing, Overloading, Glacial) cost ×6 and tier-2 elites (Malachite, Celestine) cost ×36. For example, a Jellyfish costs 10, a tier-1 Jellyfish 60 and a tier-2 Jellyfish 360. [wiki.gg Directors](https://riskofrain2.wiki.gg/wiki/Directors)
- While the coefficient is low, the Director spawns lone, weak enemies. As it rises, the Director buys larger groups, more elites and more expensive enemies. [wiki.gg Directors](https://riskofrain2.wiki.gg/wiki/Directors)
- The Director has a "too cheap" check against the most expensive group it could buy. Without it, late-game budgets once caused bosses to fail to spawn and stages to go empty. [fandom Directors](https://riskofrain2.fandom.com/wiki/Directors)

### 2. Pacing that reacts to the player (Left 4 Dead)
- The Director tracks each survivor's "intensity". Intensity rises when the survivor is attacked or kills infected nearby, and it jumps to maximum when the survivor is incapacitated. [L4D fandom](https://left4dead.fandom.com/wiki/The_Director)
- It cycles through four phases [L4D fandom](https://left4dead.fandom.com/wiki/The_Director):
  - **Build Up** at full threat until intensity passes the peak threshold.
  - **Sustain Peak** for 3–5 seconds.
  - **Peak Fade**.
  - **Relax** with minimal threat for 30–45 seconds, or until the survivors travel far enough.
- On higher difficulty, L4D makes threats more frequent, not bigger. [L4D fandom](https://left4dead.fandom.com/wiki/The_Director)
- The special infected have complementary jobs: the Smoker drags one survivor away from the group, the Hunter pins isolated targets, and the Boomer blinds survivors and forces them to spread out. [Boomer](https://left4dead.fandom.com/wiki/The_Boomer), [Smoker](https://left4dead.fandom.com/wiki/The_Smoker), [TechRaptor](https://techraptor.net/gaming/guides/10-years-of-left-4-dead-hunters-and-boomers-and-smokers-oh-my)

### 3. Fixed waves, formation events and a hard end (Vampire Survivors)
- A new wave arrives every minute. Each wave sets a minimum enemy count and a spawn interval, and the game refills to the minimum when too few enemies are alive. [VS wiki Enemies](https://vampire.survivors.wiki/w/Enemies)
- On-screen enemies are capped at 500. [VS fandom Enemies](https://vampire-survivors.fandom.com/wiki/Enemies)
- Curse raises wave frequency, enemy count, speed and health by its percentage. [VS fandom Curse](https://vampire-survivors.fandom.com/wiki/Curse)
- Map events:
  - **Bat Swarm:** 50 bats cross the map in a straight line and push other enemies aside. [Bat Swarm](https://vampire.survivors.wiki/w/Bat_Swarm)
  - **Flower Wall:** 100 flowers spawn in an ellipse around the player and close in over 30 seconds. They have high health and low damage. [Flower Wall](https://vampire.survivors.wiki/w/Flower_Wall_(event))
- At 30:00 the Reaper spawns and deals 65,535 damage. More Reapers follow about every minute, which ends the run. [VS fandom Reaper](https://vampire-survivors.fandom.com/wiki/The_Reaper), [GameRant](https://gamerant.com/vampire-survivors-30-minutes-reaper-boss-death-beat-kill/)

### 4. Spawn telegraphs that the player can deny (Brotato)
- A red X marks each spawn point, and the enemy appears 1 second later. [Steam discussion](https://steamcommunity.com/app/1942280/discussions/0/3810656958845428240/)
- If the player stands on the X, the enemy spawns somewhere else instead. [Steam discussion](https://steamcommunity.com/app/1942280/discussions/0/3810656958845428240/)
- Elite and horde waves only appear from Danger 2 upward. [Brotato wiki](https://brotato.wiki.spellsandguns.com/Elite_and_Horde_Waves)
  - The first special wave falls on wave 11 or 12, with a 40% chance of horde and 60% of elite. Elites on those waves spawn at 75% health.
  - The second falls on wave 14 or 15, and the third on wave 17 or 18 is always an elite wave.

### 5. Affixes (Diablo III)
- Elites draw affixes from a pool with three kinds of effect [Diablo fandom](https://diablo.fandom.com/wiki/Monster_Traits_(Diablo_III)), [Blizzard Watch](https://blizzardwatch.com/2015/07/11/combat-elite-monster-affixes-diablo-3/):
  - ground effects: Molten, Desecrator, Plagued
  - spell effects: Arcane Enchanted, Waller, Jailer, Frozen, Mortar, Vortex
  - personal effects: Fast, Shielding, Horde, Reflect Damage, Teleporter
- Champion packs reportedly get 1 trait at hero levels 1–29, 2 at 30–49, 3 at 50–59 and 4 at 60+. [Diablo fandom](https://diablo.fandom.com/wiki/Monster_Traits_(Diablo_III))
- Some combinations are notoriously unfair. Arcane Enchanted combined with Waller, Jailer or Vortex is called among the deadliest, and Horde combined with ground effects "can dominate even a wide open area". [DiabloHub](https://www.diablohub.com/guides/monster-traits-description/), [Diablo Wiki](https://www.diablowiki.net/Arcane_Enchanted)

### 6. Opt-in difficulty modifiers (Hades, Thronefall)
- The Pact of Punishment measures difficulty in "Heat". Examples: Jury Summons (+20% enemies per rank), Forced Overtime (enemies move and attack 20% faster), Heightened Security (traps deal +400% damage), and Benefits Package (armored enemies gain one extra perk per rank). [Hades fandom](https://hades.fandom.com/wiki/Pact_of_Punishment), [RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)
- Thronefall mutators add handicaps such as fewer resources, faster enemies and stronger bosses, and score more in return. [digitsguide](https://digitsguide.com/thronefall-weapons-perks-mutator-guide/)

### 7. Previews, rotating directions and punishing fixed defenses
- **Thronefall:** before each night the map shows where enemies will appear, with an icon for melee, ranged or flying. [Siliconera](https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/) In Eternal Trials mode, even-numbered waves come from several points and odd-numbered waves converge on one approach. [game.wiki](https://game.wiki/thronefall/eternal-trials)
- **Kingdom Rush:** a skull icon shows the next wave's enemies, their counts and their path. Calling the wave early pays bonus gold based on how early you call it. [Level Winner](https://www.levelwinner.com/kingdom-rush-beginners-guide-tips-tricks-strategies-to-vanquish-the-evil-forces/)
- **They Are Billions:** earlier swarms are announced by direction and come from a point. The final swarm comes from every map edge, so defenses built for the earlier waves are bypassed. [fandom Swarms](https://they-are-billions.fandom.com/wiki/Swarms), [NamuWiki](https://en.namu.wiki/w/They%20Are%20Billions)
- **Mindustry:** a "Drop Zone Radius" rule destroys buildings inside the spawn zone at the start of each wave. [Mindustry Rules API](https://mindustrygame.github.io/docs/mindustry/game/Rules.html), [Editor/Rules](https://mindustry-unofficial.fandom.com/wiki/Editor/Rules)

### 8. Counter-units and roles (Bloons, Doom, Deep Rock Galactic)
- **Bloons TD 6:** the lead, pink and black properties were reportedly added to counter popular anti-MOAB towers such as MOAB Mauler and Dartling spam. Camo bloons can't be targeted without camo detection. [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/YMMV/BloonsTowerDefense), [Bloons wiki](https://bloons.fandom.com/wiki/Camo_Bloon)
- **Doom:** id's GDC talk "Embracing Push Forward Combat" describes enemies as distinct combat roles. [GDC Vault](https://www.gdcvault.com/play/1024940/Embracing-Push-Forward-Combat-in), [Game Developer](https://www.gamedeveloper.com/design/video-the-combat-design-of-i-doom-i-) In Doom Eternal, Hugo Martin calls enemies "chess pieces". The Carcass puts up an anti-rocket shield, and Martin says "we're cool with frustrating you as long as we're teaching". [PC Gamer](https://www.pcgamer.com/heres-a-breakdown-of-the-new-demons-in-doom-eternal/), [Gamereactor](https://www.gamereactor.eu/doom-eternals-demons-broken-down-by-hugo-martin/)
- **Deep Rock Galactic:** Bulk Detonators are "Disruptive" enemies. Only one exists at a time, they aren't removed when the spawn cap is hit, and they ignore the per-player aggro limit. [DRG fandom](https://deeprockgalactic.fandom.com/wiki/Glyphid_Bulk_Detonator)

### 9. Hades encounter structure
- Encounters are waves triggered as each group dies. Survival encounters in Tartarus instead spawn enemies constantly for 45 seconds. [Hades fandom](https://hades.fandom.com/wiki/Chambers_and_Encounters)
- I could not confirm how Hades telegraphs where enemies will spawn. The search results did not cover it.

---

## What BOSS MODE should steal (proposals, ranked)

Everything in this section is my proposal, not established fact. Each item names the playtest finding it answers.

**1. Breach points that rotate and are previewed, and that clear buildings when they open.**
*Answers: "I put spikes on all the spawn points" and "where the enemies come from is too predictable".*
- Replace the 4 fixed gates with a larger set of candidate breach points around the ring (for example 8–12). Each night, 2–4 of them open.
- Show the next night's breach points during the build phase, as Thronefall and Kingdom Rush do: an arrow and a unit-type icon per breach.
- Add a Mindustry-style no-build zone: when a breach opens, buildings within a small radius break (the paper puppets tear). The player can still build a gauntlet between the breach and the vault, but can no longer sit spikes on the spawn tile itself.
- Mid-night, open one surprise breach with a Brotato-style warning before anyone comes through. Brotato's delay is 1 second; for kids on phones I'd make it 2–3 seconds. The boss standing on the warning mark cancels that breach, which turns the telegraph into a skill moment.
- Make the final night work like They Are Billions: heroes come from every side.

**2. A credit-based war chest in place of fixed spawn rates.**
*Answers: "need increasingly difficult enemies".*
- Each hero type gets a card cost, for example noob 1, archer 2, knight 4, healer 5, tryhard 8. These numbers are placeholders only and need to be ruled on and tested.
- The night's budget grows with the night number and with time elapsed, using the shape of the Risk of Rain 2 coefficient (linear in time, multiplied per night).
- Adopt RoR2's "too cheap" rule: late in the run, the cheapest cards stop being allowed. Night 6 then fields far fewer noobs and more tryhards and elites, instead of 7587 low-HP bodies. Enemy count stays readable on a phone while threat still rises.
- This also changes how difficulty tiers work. Today they multiply HP, which only makes bullet sponges. A tier could instead change the budget and which cards are allowed.

**3. Counter-heroes that target building layouts, and that are readable and beatable.**
*Answers: "the add-ons make it such that I hardly took any damage".*
This follows the Bloons approach of properties that answer a dominant strategy, softened by Doom's "frustrating is fine if it teaches". Candidates:
- **Engineer (or "Trap Nerd")** disarms the nearest spike pit or saw, shown by a wrench icon and a progress bar. The counter is to kill it first, a clear priority target.
- **Jumper/Glider** hops over pits and walls, ignoring ground traps. The counter is towers or the boss.
- **Shield Squad** is a group of heroes carrying a shared shield that blocks tower arrows from the front.
- **Hook hero**, like L4D's Smoker, pulls the boss off its position so the boss can't camp one spot.

The director buys these cards more when a layout has dominated, measured as the share of kills made by buildings on the previous night. That makes them a counter to the player's strategy rather than a random tax.

**4. Hero affixes that scale by night, with at most two per hero.**
*Answers: "need increasingly difficult enemies".*
- Borrow Diablo III's idea of a trait count that scales with progress: 0 affixes on nights 1–2, one on nights 3–4, two on nights 5–7.
- Keep the pool small and kid-readable, with a single icon above each head. Examples:
  - **Speedy** (a speed-line effect)
  - **Bouncy**, which resists launch and so blunts bowling combos
  - **Buddy**, which heals the heroes around it
  - **Split**, which becomes 2 noobs on death
  - **Sticky**, which leaves a slow trail
  - **Stealthy**, which is invisible to towers until the boss is near
- Price affixed heroes the RoR2 way (×6 for one affix, ×36 for two, as a starting shape) so the budget pays for them.

**5. Formation events that don't come from gates.**
*Answers: "too predictable".*
- Copy Vampire Survivors' two events. **Flower Wall** becomes a ring of shield knights closing on the boss (tough, low damage, "break out"). **Bat Swarm** becomes a streamer "raid" charging across the map in a straight line and knocking into other heroes.
- Frame both as online-player moments with killfeed text such as "xX_Raid_Xx started a RAID!". This keeps the fiction of heroes as online players.

**6. A pressure meter that shapes pacing, not a power nerf.**
*Answers: "hardly took any damage".*
- Use a Left 4 Dead-style intensity score built from boss damage taken, gold lost from the vault and heroes near the boss.
- When intensity stays low for too long, the director brings the next elite or event forward and opens an extra breach. After a peak it grants a short Relax window.
- Follow L4D's rule of more frequent threats rather than bigger ones: spend credits sooner, and don't multiply HP. Show the meter as a "HYPE" bar so the player can see the heroes getting angry. See trap 3 for why it must be visible.

**7. Heat-style mutators, and calling nights early for gold.**
*Answers: "exhausted all upgrades by night 5 or early 6", which partly belongs to another research topic.*
- Let players raise the difficulty during a run for more gold or score (Hades Heat, Thronefall mutators). Example mutators: "Heroes are 20% faster", "Healers everywhere", "+1 breach".
- Add a Kingdom Rush-style early-call bonus: start the next wave early for tribute gold.
- Both give an over-powered player something to spend power on instead of running out of things to do.

**8. Guaranteed special nights, with the type rolled inside a window.**
*Answers: "too predictable".*
- Keep the champions on nights 3/5/7, but add Brotato-style elite or horde nights whose type is rolled (for example 40/60 horde/elite) and announced in the build phase.
- A warning such as "Night 4: HORDE" is fair to plan for, and a different roll next run keeps it from becoming routine.

---

## Traps to avoid

1. **Spawns that aren't telegraphed.** Brotato's 1-second X, Thronefall's preview and Kingdom Rush's skull all exist because a hit you can't see coming reads as cheating. For kids on phones, give more warning than Brotato does, not less.
2. **Only multiplying HP.** Harder tiers that multiply hero HP give more bullet sponges, not more interesting threats. Martin defends sponges only as one chess piece among several. Change what spawns, not only how much HP it has.
3. **Hidden rubber-banding.** A director that quietly nerfs a winning player takes away the power fantasy. L4D's version changes pacing, not the player's strength. Show pressure openly (the HYPE bar) and never reduce the boss's stats.
4. **Hard counters that make a building useless.** Bloons camo, which can't be hit at all without detection, is a known frustration. A counter-hero should be a priority target the player can deal with, not a "your spikes do nothing" wall. Otherwise kids learn not to build, which removes a system.
5. **Affix combinations that stack into something unfair.** Diablo's Arcane plus Jailer, or Horde plus ground effects, shows how. Cap affixes at two, and ban crowd control combined with area damage on the same hero.
6. **Too cheap never being cut off.** RoR2 needed its "too cheap" rule. Without one, a growing budget becomes an unreadable sea of noobs on a phone.
7. **A hard wall as the ending.** The Vampire Survivors Reaper is a hard stop, not a difficulty curve. A 10–20 minute run needs the escalation to be the ending, not an unkillable enemy.
8. **Tuning against the bot.** The bot died on night 2–3 while humans win easily, so the director should be calibrated from human telemetry. Useful signals: damage taken per night, share of kills by buildings, the night on which upgrades run out.

Inference from the playtest numbers: 7587 kills in 11:14 is roughly 11 kills per second. That suggests enemy count is already near a phone-readability limit, so further escalation should come from quality (cost, affixes, counter-roles) rather than quantity.

---

## Sources

- https://riskofrain2.wiki.gg/wiki/Directors
- https://riskofrain2.fandom.com/wiki/Directors
- https://riskofrain2.wiki.gg/wiki/Difficulty
- https://left4dead.fandom.com/wiki/The_Director
- https://left4dead.fandom.com/wiki/The_Boomer
- https://left4dead.fandom.com/wiki/The_Smoker
- https://techraptor.net/gaming/guides/10-years-of-left-4-dead-hunters-and-boomers-and-smokers-oh-my
- https://vampire.survivors.wiki/w/Enemies
- https://vampire-survivors.fandom.com/wiki/Enemies
- https://vampire-survivors.fandom.com/wiki/Curse
- https://vampire.survivors.wiki/w/Bat_Swarm
- https://vampire.survivors.wiki/w/Flower_Wall_(event)
- https://vampire-survivors.fandom.com/wiki/The_Reaper
- https://gamerant.com/vampire-survivors-30-minutes-reaper-boss-death-beat-kill/
- https://steamcommunity.com/app/1942280/discussions/0/3810656958845428240/
- https://brotato.wiki.spellsandguns.com/Elite_and_Horde_Waves
- https://diablo.fandom.com/wiki/Monster_Traits_(Diablo_III)
- https://blizzardwatch.com/2015/07/11/combat-elite-monster-affixes-diablo-3/
- https://www.diablohub.com/guides/monster-traits-description/
- https://www.diablowiki.net/Arcane_Enchanted
- https://hades.fandom.com/wiki/Pact_of_Punishment
- https://hades.fandom.com/wiki/Chambers_and_Encounters
- https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards
- https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/
- https://game.wiki/thronefall/eternal-trials
- https://digitsguide.com/thronefall-weapons-perks-mutator-guide/
- https://www.levelwinner.com/kingdom-rush-beginners-guide-tips-tricks-strategies-to-vanquish-the-evil-forces/
- https://they-are-billions.fandom.com/wiki/Swarms
- https://en.namu.wiki/w/They%20Are%20Billions
- https://mindustrygame.github.io/docs/mindustry/game/Rules.html
- https://mindustry-unofficial.fandom.com/wiki/Editor/Rules
- https://tvtropes.org/pmwiki/pmwiki.php/YMMV/BloonsTowerDefense
- https://bloons.fandom.com/wiki/Camo_Bloon
- https://www.gdcvault.com/play/1024940/Embracing-Push-Forward-Combat-in
- https://www.gamedeveloper.com/design/video-the-combat-design-of-i-doom-i-
- https://www.pcgamer.com/heres-a-breakdown-of-the-new-demons-in-doom-eternal/
- https://www.gamereactor.eu/doom-eternals-demons-broken-down-by-hugo-martin/
- https://deeprockgalactic.fandom.com/wiki/Glyphid_Bulk_Detonator