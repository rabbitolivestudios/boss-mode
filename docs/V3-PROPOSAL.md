# BOSS MODE v3 Redesign Proposal

*Lead design proposal, built from six research and audit reports. Codebase facts come from the exploit audit's reading of `src/game/config.ts`, `src/game/game.ts`, `src/game/castle.ts` and `docs/DESIGN.md`; I did not re-read those files myself. Competitor facts come from the research reports. Those reports built them from search-result summaries because most wiki fetches were blocked, so every competitor figure below should be read as "as reported by the cited page". Every number proposed for BOSS MODE is a placeholder to be tuned in playtest, not a ruling.*

---

## 1. Diagnosis

BOSS MODE is too easy because one early purchase answers every threat for the whole season, and nothing in the game reacts to that answer. Every hero except squads spawns inside one of four fixed 3×2 boxes at the gates (±18.38, ±18.38). These are the same every night and every run, and the player knows them before the first build phase. Three spike pits per gate cover sideways offsets of ±2.96, while heroes spawn within ±1.5. So 120g, which the player has by night 2 out of a season maximum of 315g, forces every gate-spawned hero across a spike. Traps then cost nothing in the flow field, have no HP, are never attacked, get stronger with the boss's Might, frenzy and crits, and can be sold for a 100% refund.

Upgrades run out for a separate reason. There are 49 picks in the pool. Normal supplies about 15,800 XP by 11:14, against 10,653 needed to max everything (a ratio of 0.67), so the build is complete about 40 seconds into night 6. Harder tiers finish sooner, because `tier.spawn` multiplies XP as well as heroes.

Threat also stops growing. The wave mix freezes at t=360. The spawn rate caps at t≈524. The contact-damage cap ignores `tier.damage`. Hero HP grows about ×4.15 over the season while Ground Pound throughput grows ×12.9 and its area ×2.6.

The owner's run fits this model: 7,587 kills against about 7,880 predicted spawns, almost no damage taken, a 468× combo that is probably pad-driven, and 1g left over because unspent gold is worth nothing. The root problem is structural. Difficulty exists only as scalar multipliers on a few stats. Those scalars either feed the player (spawn rate becomes XP), get capped (contact damage), or flatten out (spawn cap, last wave band). **More HP will not fix this.** The fix has to change where heroes come from, what kinds of heroes come, and what the player's power is measured against.

---

## 2. Design pillars for v3

1. **You can't pre-solve the night.** Hero sources change every night and inside a night, and every change is telegraphed. You can predict one step ahead, never the whole season.
2. **Buildings shape the fight; the boss finishes it.** Every building type has a hero that gets past it, and every such hero can be beaten by the boss in person. Traps protect *routes*, not spawn tiles.
3. **Escalate in kind, not just in quantity.** New behaviours, affixes and elites each night keep threat rising while unit counts stay readable on a phone. Kills are already about 11 per second.
4. **Maxing out is a start, not an end.** Upgrades keep producing meaningful choices through night 7, and enemy pressure follows the player's actual power.
5. **Hard is opt-in and worth bragging about.** A gentle default for 10-year-olds, and difficulty the owner can feel behind unlockable, named, visible tiers. No paid randomness, no chat, no streak pressure.

---

## 3. Facts the proposals rely on (short index)

| Precedent | Fact (as reported) | Source |
|---|---|---|
| Brotato | Red X appears 1s before a spawn; if the player stands on it, the enemy spawns elsewhere | [Steam](https://steamcommunity.com/app/1942280/discussions/0/3810656958845428240/) |
| Brotato | Elite/horde waves from Danger 2+, rolled 60% elite / 40% horde in fixed wave windows | [wiki](https://brotato.wiki.spellsandguns.com/Elite_and_Horde_Waves) |
| Thronefall | Pre-night preview of enemy count and type per spawn point; final waves come from all directions; Totend rotates direction | [Siliconera](https://www.siliconera.com/review-thronefall-is-a-beautifully-simplistic-rts-game/), [game.wiki](https://game.wiki/thronefall/totend) |
| OMD 3 / Deathtrap | Doors open progressively; Unstable Rifts appear at random spots mid-wave | [Steam guide](https://steamcommunity.com/sharedfiles/filedetails/?id=2658386189), [PC Gamer](https://www.pcgamer.com/games/action/orcs-must-die-deathtrap/) |
| Mindustry | Drop Zone Radius destroys buildings inside the spawn zone at wave start | [Rules API](https://mindustrygame.github.io/docs/mindustry/game/Rules.html) |
| Dungeon Keeper / DW2 | Tunnellers and Diggers breach walls to create new entry routes; flyers can't trigger floor traps | [DK Tunneller](https://dungeonkeeper.fandom.com/wiki/Tunneller), [DK Traps](https://dungeonkeeper.fandom.com/wiki/Traps) |
| Dungeon Defenders | Djinn destroy traps; Kobolds explode on defences; defence-unit cap | [Djinn](https://dungeondefenders.fandom.com/wiki/Djinn), [DU](https://dungeondefenders.fandom.com/wiki/Defense_Units) |
| BTD6 / TDS | Camo, Lead and Flying properties switch off specific towers; lead, pink and black added to counter dominant anti-MOAB towers | [Camo](https://bloons.fandom.com/wiki/Camo_Bloon), [TDS Hidden](https://tds.fandom.com/wiki/Hidden) |
| Risk of Rain 2 | Credit Director buys enemy "cards"; elites cost ×6 / ×36; "too cheap" rule | [wiki.gg](https://riskofrain2.wiki.gg/wiki/Directors) |
| Left 4 Dead | Intensity-driven Build Up / Peak / Relax cycle; harder difficulty means more frequent threats, not bigger ones | [L4D wiki](https://left4dead.fandom.com/wiki/The_Director) |
| Diablo III | Elite affix count rises with progress; some combinations are notoriously unfair | [Diablo wiki](https://diablo.fandom.com/wiki/Monster_Traits_(Diablo_III)) |
| Vampire Survivors | Evolutions (max weapon + passive + boss chest); Limit Break after max; Banish/Skip/Reroll; mini-boss HP × player level; Flower Wall / Bat Swarm events | [Limit Break](https://vampire-survivors.fandom.com/wiki/Limit_Break), [Steam](https://steamcommunity.com/app/1794680/discussions/0/3489752656787156939/), [Flower Wall](https://vampire.survivors.wiki/w/Flower_Wall_(event)) |
| DRG: Survivor | Branching overclocks at weapon levels 6, 12 and 18 | [wiki](https://deeprockgalactic.wiki.gg/wiki/Survivor:Overclocks) |
| HoloCure | Ring, Wall and Stampede formations | [wiki](https://holocure.fandom.com/wiki/Enemy) |
| Halls of Torment | Champions gain abilities their base type lacks; Agony rises with the clock | [Champion](https://hot.fandom.com/wiki/Champion), [Agony](https://hot.fandom.com/wiki/Agony) |
| Evil Genius 2 | Heat decides agent type and entry door; Rogues appear inside vault rooms | [Qnnit](https://qnnit.com/evil-genius-2-how-does-heat-work-anyway/) |
| DOORS | Opt-in modifiers with visible reward %, and badges at +50% and +150% | [DOORS wiki](https://doors-game.fandom.com/wiki/Modifiers) |
| TDS / 20MTD / DW2 | Named difficulty ladders unlocked by winning; DW2 Ascension adds +2 | [TDS](https://roblox.fandom.com/wiki/Paradoxum_Games/Tower_Defense_Simulator), [20MTD](https://20-minutes-till-dawn.fandom.com/wiki/Darkness), [SteamAH](https://steamah.com/dungeon-warfare-2-beginners-guide/) |
| Kahoot / Gimkit | Generated two-word nicknames, limited spins, then locked | [Kahoot](https://kahoot.com/blog/2017/11/09/generate-funny-nicknames-players-live-kahoots/), [Gimkit](https://help.gimkit.com/en/article/nickname-generator-1ng9lwx/) |
| Genre critiques | LoK: one build trivialises the game, and difficulty "does little"; Dungeons 4: slider has "no real effect" | [PC Invasion](https://www.pcinvasion.com/legend-of-keepers-review/), [Steam](https://steamcommunity.com/app/1643310/discussions/1/4516633504581444862/) |

Everything below this line is proposal.

---

## 4. Proposals

Findings key:
- **F1**: spikes on every spawn point, hardly took damage
- **F2**: enemy sources too predictable
- **F3**: upgrades exhausted by night 5–6
- **F4**: needs increasingly difficult enemies

Costs: **S** is under a day, **M** is a few days, **L** is a week or more.

### (A) Where enemies come from

**A1. Breach ring (replaces the 4 fixed gates).**
- **What:** Define 12 candidate breach points around the ring in `config.ts` in place of the gate array. Each night opens a seeded subset: 2 on night 1, rising to 4 by night 6. These counts are placeholders. At least one breach moves each night, so no two consecutive nights share their full set.
- **Build-phase preview:** Show the active breaches with a red arrow, a hero count, and type icons (melee, ranged, flyer, thief). Show a dotted flow-field preview from each breach to the vault, OMD-wisp style, turning red where heroes will break through.
- **Code changes:**
  - `makeHero` picks an active breach instead of `i·90°+45°`.
  - Thieves steer to the nearest *active* breach to exit.
  - Heist crews use the active breach farthest from the boss.
  - Rebuild the flow fields per night for the active set.
- **Fixes:** F1, F2.
- **Precedent:** Thronefall preview and Totend rotation; OMD 3 progressive doors; Rogue Tower's moving portals.
- **Cost:** M.
- **Risks:**
  - On its own it does nothing while selling refunds 100%, because the player moves every spike for free. It must ship with D1.
  - With 12 points, `gateClear` exclusion zones eat much more of the grid. Check that the vault approaches stay buildable.

**A2. Breach zones shred buildings.**
- **What:** Replace the flat `gateClear` 3.5 with a larger no-build radius around *active* breaches, drawn as hatched tiles during the build phase. The radius is a placeholder to tune: large enough that the three-spike seal at 3.66–4.79 no longer fits.
- **Surprise breaches (A3):** When one opens, every building inside its radius tears apart with a paper-rip effect and a partial refund.
- **Intended result:** Traps belong on the routes between breaches and the vault, where one trap line can serve several breaches. Stacking traps on the spawn tile stops working.
- **Fixes:** F1.
- **Precedent:** Mindustry Drop Zone Radius.
- **Cost:** S.
- **Risks:** Kids may feel robbed when a building tears. Always refund, and name the reason in a toast ("Breach! Your spike got wrecked").

**A3. Surprise breaches mid-night, from night 3 or 4.**
- **What:** One breach per night opens with no build-phase preview. Its telegraph lasts 3 seconds and has four parts:
  - a crack and glow on the ground
  - a siren sound
  - an edge-of-screen arrow
  - a killfeed line ("xX_Sneaky_Xx found a back door")
- If the boss stands on the mark when the timer ends, the breach is cancelled and pays a gem burst. This turns the telegraph into a skill moment.
- On Heroic and above, one surprise breach may open *inside* the walls near the vault, Evil Genius 2 Rogue-style, and it carries thieves.
- **Fixes:** F1, F2.
- **Precedent:** Brotato's red X and deny rule; OMD Deathtrap Unstable Rifts; EG2 Rogues.
- **Cost:** M.
- **Risks:**
  - An unwarned spawn reads as cheating. The telegraph is mandatory, and 3 seconds is deliberately longer than Brotato's 1 second, for kids on phones.
  - Never spawn within a minimum distance of the boss.

**A4. Formation events relative to the boss.**
- **What:** Generalise the existing squad spawner (ring at 15 units) into three formations:
  - **Ring:** shield knights close in slowly; tough, low damage, "break out".
  - **Wall:** a line of heroes sweeps across the arena.
  - **Stampede:** a fast wall of rogues.
- Announce each as an online-player moment ("xX_Raid_Xx started a RAID!").
- **Fixes:** F1 (traps can't answer these), F2.
- **Precedent:** HoloCure Rings, Walls and Stampedes; VS Flower Wall and Bat Swarm.
- **Cost:** S–M.
- **Risks:** Unit count. Formations should replace part of the ambient spawn budget (E1), not add to it.

**A5. Diggers (night 4+).**
- **What:** Weak heroes that tunnel under one wall segment, marked by a visible dirt mound trail, and surface inside the castle. Stronger heroes follow the new hole.
- Counter: kill the digger in transit (the mound is targetable), or build a Reinforced Wall upgrade (placeholder cost) that stops tunnelling, as DW2's barricades do.
- **Fixes:** F1, F2.
- **Precedent:** DK Tunneller, War for the Overworld dwarves, DW2 Digger.
- **Cost:** M, because a flow-field override is needed.
- **Risks:** If diggers can erase any layout, building becomes pointless. The reinforced-wall counter must exist.

**A6. Final night from everywhere.**
- **What:** Night 7 opens all 12 breaches in escalating pulses.
- **Fixes:** F2, F4.
- **Precedent:** They Are Billions' final swarm; Thronefall's final waves.
- **Cost:** S once A1 exists.
- **Risks:** Unit count. Use the budget director (E1), not 12× spawns.

### (B) Escalating enemies

**B1. Counter-hero roster, introduced one per night with a card.**
- **What:** At the start of each night, a "New challenger!" card shows the hero, its icon, and one line on how to beat it. Candidates, each tied to one building:

| Hero | Beats | How the boss beats it | Precedent |
|---|---|---|---|
| **Glider** (flyer) | Walls, spikes, pads, saws | Towers and the boss hit it | DK Fairy, DD Wyvern, TDS Flying |
| **Sapper** | Any building: runs to the nearest one and blows it up (needs D2) | Priority target with a lit-fuse icon | DD Kobold, OMD Kobold Sapper, Thronefall Exploder |
| **Shieldbearer** | Trap damage, until a boss hit or launch breaks the shield | Hit or launch it first | Rogue Tower shield layers, BTD6 Lead |
| **Trap Nerd** (engineer) | One trap, which it disarms for N seconds behind a wrench progress bar | Kill it before the bar fills | DD Djinn, DK Thief |
| **Hopper** | Spike pits and single walls, which it hops over | Boss AoE | OMD Gnolls |
| **Hunter** | The vault objective: it ignores the vault and dives the boss | Ranged pressure through Ground Pound | Thronefall Hunterlings, L4D Hunter |

- **Fixes:** F1, F4.
- **Cost:** S–M per hero on the existing hero-def pipeline. Gliders need a "skip ground collision and walls" flag in the steer code.
- **Risks:** A hard counter that makes a building useless teaches kids not to build. Every counter must be *slowed* or *delayed* by some building, and always killable by the boss.

**B2. Build-reactive counter weighting.**
- **What:** At dawn, compute each building type's share of kills for the night. The next night's director (E1) raises the weight of that type's counter card. Announce it in trash talk, for example:
  - "bring wings, they spam spikes lol"
  - "saw camper detected"
- **Fixes:** F1, F4.
- **Precedent:** EG2 Heat decides agent type and door. BTD6 is a *design-time* precedent: counters were added to beat popular towers, not at runtime.
- **Cost:** S on top of E1.
- **Risks:** Hidden rubber-banding feels like cheating. The announcement is part of the feature.

**B3. Hero affixes by night.**
- **What:** Affixes per hero: 0 on nights 1–2, 1 on nights 3–4, 2 on nights 5–7. Draw from a pool of about six affixes, each with one icon over the head:
  - **Speedy**
  - **Bouncy** (resists launch, blunting bowling)
  - **Buddy** (small heal aura, telegraphed and capped)
  - **Split** (becomes two noobs on death)
  - **Sticky** (leaves a slow trail)
  - **Stealthy** (towers can't see it until the boss is near)
- Ban crowd-control affixes paired with area-damage affixes on the same hero.
- **Fixes:** F4.
- **Precedent:** Diablo III affix scaling and its known bad combinations.
- **Cost:** M.
- **Risks:** Icon noise with hundreds of units. Affixes go only on non-noob cards.

**B4. A raid leader every night from night 2, and champion phases.**
- **What:**
  - One timed elite per night, with a random build-countering ability: dash, wall-jump, trap-disarm aura, or a heal bubble.
  - Champions on nights 3, 5 and 7 gain a new phase at 50% HP. Examples: the Chosen One stuns every tower within a radius for a few seconds, or summons a mini squad.
  - Champion HP scales with boss level at spawn, VS-style, with the multiplier kept modest. The audit notes that raising champion HP alone just lengthens a fight the boss already wins, so the phase ability matters more than the HP.
- **Fixes:** F4.
- **Precedent:**
  - HoT Champions gain abilities.
  - Brotato elites mutate 2–3 times.
  - TDS Fallen King stuns towers.
  - VS mini-boss HP × level.
- **Cost:** M.
- **Risks:** Mindustry-style spikes, where a boss wave is out of proportion to the waves before it. Ramp champions smoothly.

**B5. Smart heroes path around traps.**
- **What:** Give spikes and saws a non-zero cost in the flow field for tryhards and rogues only. Noobs stay dumb and funny.
- **Fixes:** F1, because a gate then needs walls plus traps, not three spikes.
- **Precedent:** None direct in the reports; this is the audit's lever.
- **Cost:** M, because it needs a second flow field per target.
- **Risks:** Performance on phones. Recompute only at night start and when a building is destroyed.

### (C) Upgrades that never run dry

**C1. Evolutions.**
- **What:** A level-5 weapon plus its paired level-5 passive, plus a champion chest, gives an evolved weapon with a visual change. That makes 8 recipes, one per weapon. Show every recipe in the level-up UI: the passive's card gets a glowing "evolves Fireball" tag. This raises the 49-pick ceiling and gives the player a goal after maxing.
- **Fixes:** F3.
- **Precedent:** VS evolutions; HoloCure super collabs.
- **Cost:** M. The art cost is 8 evolved attack effects.
- **Risks:** Wiki-dependence. Recipes must be visible in the game.

**C2. Branching choice at weapon levels 3 and 5.**
- **What:** A pick between two variants, for example Ground Pound "wider" vs "double tap". The value is replayability and meaningful choice rather than pool size.
- **Fixes:** F3.
- **Precedent:** DRG: Survivor overclocks at levels 6, 12 and 18.
- **Cost:** M, because it doubles weapon tuning surface.
- **Risks:** Balance surface area. Ship it for 3–4 weapons first.

**C3. Limit Break instead of the +40 HP snack.**
- **What:** After all picks are taken, each level-up offers small uncapped increments, such as +3% area or +2% damage (placeholders).
- **Fixes:** F3.
- **Precedent:** VS Limit Break.
- **Cost:** S.
- **Risks:** Uncapped power needs a director that follows it (E2), or it feeds the power fantasy that is already too strong.

**C4. Retune the XP curve and decouple it from tier.**
- **What:**
  - Divide gem value by `tier.spawn`, so harder tiers stop accelerating the power spike.
  - Steepen `xpToNext` from about level 25 so that the ratio of XP needed for all picks to the season's supply is at least 1.0 on Normal. It is 0.67 today.
  - Tune this against the audit's per-night XP model, not by eye. Do not touch the early curve; the audit shows exhaustion is decided by levels 35–46.
- **Fixes:** F3.
- **Precedent:** The audit's model. None needed from competitors.
- **Cost:** S.
- **Risks:** It slows the feel-good early-mid game if applied too low in the curve.

**C5. Reroll, Banish and Skip.**
- **What:** Free, earned in play, a few charges per run.
- **Fixes:** F3, because the player can steer toward evolutions.
- **Precedent:** VS.
- **Cost:** S.
- **Risks:** None significant. They must never be purchasable.

### (D) Buildings strong but not dominant

**D1. Refund only what you placed this build phase.**
- **What:** A building placed this build phase refunds 100%. One that survived a night refunds 50% (placeholder). This gives gold a cost when adapting to new breaches.
- **Fixes:** F1, and it is what makes A1 bite.
- **Precedent:** The audit's lever. Brotato's rising prices are a related economy lever.
- **Cost:** S, in `sell` in `game.ts`.
- **Risks:** Kids who misplace a building feel punished. The same-phase undo stays free.

**D2. Building HP and dawn repair.**
- **What:** Buildings get HP. Sappers, knights and champion stomps damage them. Repair costs gold at dawn. Destroyed buildings leave rubble that is cheap to rebuild. Trap lifetime stops being infinite.
- **Fixes:** F1.
- **Precedent:** DD Djinn and Kobolds; OMD Sappers vs barricades.
- **Cost:** M, because it needs a building HP bar and a hero targeting mode.
- **Risks:** Makes the build phase heavier. Keep repair to one "Repair all: Xg" button.

**D3. Trap damage stops scaling with Might, frenzy and crit.**
- **What:** Buildings get their own upgrade track, a per-type level bought with gold during the build phase. Today trap damage reaches ×1.75 to ×2.9 of the listed value.
- **Fixes:** F1.
- **Precedent:** The audit's lever.
- **Cost:** S, in the `damage()` call path.
- **Risks:** Traps feel weaker late. That is intended; the gold track gives them back power the player chooses to pay for.

**D4. Rising price per copy.**
- **What:** Each further spike costs a little more within a season. This is simpler for kids than a defence-unit cap.
- **Fixes:** F1.
- **Precedent:** Brotato's per-wave price inflation; DD's DU cap as the alternative.
- **Cost:** S.
- **Risks:** It needs the price to be shown clearly on each build button.

**D5. Gold kept is worth something.**
- **What:**
  - Stars measure absolute gold at dawn, not gold relative to `nightStartGold`.
  - Unspent gold adds to season score.
  - Tribute pays a bonus for gold defended (nothing stolen).
  - Optional Kingdom Rush-style "Bring it on!" button: start the night early for bonus gold.
- **Fixes:** F1, because spending everything on traps stops being strictly best.
- **Precedent:** Kingdom Rush early call; Thronefall's economy-first advice.
- **Cost:** S.
- **Risks:** Hoarding kids take more damage. That is a real trade-off, which is the point.

**D6. Combo credits boss-caused launches.**
- **What:** Trap kills extend the combo timer but don't add to the multiplier. The combo stops rewarding a passive saw-and-pad build.
- **Fixes:** F1, as a reward change.
- **Precedent:** The audit's lever.
- **Cost:** S.
- **Risks:** The 468× combos will shrink. Rescale the combo UI's thresholds so big numbers still appear.

### (E) Difficulty and director systems

**E1. Credit director (replaces `min(14, 0.9 + t/40) × tier.spawn`).**
- **What:**
  - Each hero is a card with a cost. Placeholder costs: noob 1, archer 2, knight 4, healer 5, tryhard 8, counter heroes 6–10.
  - An affix multiplies cost, using RoR2's ×6 / ×36 as the starting shape.
  - The night's budget grows with night number and with time inside the night.
  - A "too cheap" rule stops buying cards below a floor late in the season, so night 6 fields fewer noobs and more tryhards and elites instead of more bodies.
  - The director also buys formations (A4) and raid leaders (B4).
- **Fixes:** F4, and it holds a phone unit-count ceiling.
- **Precedent:** RoR2 Director.
- **Cost:** L. This is the core spawner rewrite and the backbone of B2, B3 and A6.
- **Risks:**
  - Tuning. Calibrate from human telemetry, not the bot, which died on nights 2–3 while the human won easily.
  - Log the budget spend per night to the summary screen.

**E2. Budget follows the player's power.**
- **What:** Add to the budget coefficient a term for boss level (or picks taken) and total building value. A stronger build draws stronger raids. Never reduce boss stats.
- **Fixes:** F3, F4.
- **Precedent:** Dome Keeper run weight; VS mini-boss HP × level.
- **Cost:** S on top of E1.
- **Risks:** It can feel like "why get stronger?". Keep the weight partial so power always nets out ahead.

**E3. HYPE meter (visible pacing).**
- **What:** An intensity score built from boss damage taken, vault coins lost, and heroes near the boss.
  - Low intensity for too long pulls the next raid leader or surprise breach forward.
  - After a peak, a short Relax window.
  - Shown as a "HYPE" bar in the fiction of heroes getting angry. More frequent threats, never bigger stats.
- **Fixes:** F1 (hardly took damage), F4.
- **Precedent:** L4D Director; EG2 Heat.
- **Cost:** M.
- **Risks:** Hidden adaptation reads as unfair. The meter is always visible.

**E4. Tiers change content, not just scalars.**
- **What:**
  - Chill / Normal / Heroic / Legendary set the budget multiplier, the card whitelist, the affix cap, the surprise-breach count, and breach telegraph length.
  - `contactCap` scales by `tier.damage`.
  - Hero HP gets a per-night multiplicative step on top of the time term, to close the audit's ×12.9 vs ×4.15 gap.
- **Fixes:** F4.
- **Precedent:** TDS harder modes add abilities; the Dungeons 4 and LoK critiques of sliders that only change numbers.
- **Cost:** S–M.
- **Risks:** Over-tuning Normal for an adult tester. Keep Normal kid-winnable and put the owner's challenge in Heroic and above plus F1.

**E5. Retries are limited or marked.**
- **What:** Allow 2 retries per season (placeholder), or mark the summary "retried". Chill stays unlimited.
- **Fixes:** Stakes.
- **Precedent:** The audit's lever.
- **Cost:** S.
- **Risks:** Frustration for younger kids. That is why Chill keeps unlimited retries.

### (F) Retention for kids 10–14

**F1. Named, unlockable difficulty ladder.**
- **What:** Beating a season unlocks "Season +1", up to about 10 levels. Each adds one modifier a kid can read, shown as an icon:
  - "Heroes bring a Trap Nerd"
  - "+1 surprise breach"
  - "Champions have 2 phases"
- Each level has a named signature champion.
- **Fixes:** F4, and it gives a long-term goal.
- **Precedent:** TDS 8 named tiers; 20MTD Darkness; DW2 Ascension.
- **Cost:** M.
- **Risks:** Soulstone-style stacking bloat. Use one ladder, not ladder plus curses plus tiers at launch.

**F2. Opt-in curses with a visible bonus %, and badges.**
- **What:** Curses chosen before the season, such as "Gliders from night 1" or "No launch pads". Badges at +50% and +150%, and a Chaos button that picks 5 random curses.
- **Fixes:** F4, for adult and expert play.
- **Precedent:** DOORS modifiers; Hades Pact; Thronefall mutators.
- **Cost:** M.
- **Risks:** Self-imposed difficulty is "not as satisfying" as fixed challenge (DW2 thread). Treat curses as an extra, never as the answer to "too easy".

**F3. Endless Night 8+.**
- **What:** After night 7 the director keeps climbing past the player's power. The score is the night reached.
- **Fixes:** F3, which becomes the start of the endgame.
- **Precedent:** TTD Endless; ASTD Infinite; VS cycles.
- **Cost:** S once E1 exists.
- **Risks:** Long sessions. Offer a clean "cash out" at each dawn.

**F4. Daily seed.**
- **What:** One shared seed per day fixes the breach pattern and curses, so kids can compare "did you beat today's?". No streaks and nothing lost by missing a day.
- **Precedent:** ASTD daily challenge; ICO Children's Code guidance on nudges.
- **Cost:** S, *if* all spawn randomness goes through a seeded RNG. I have not verified that it does. `makeHero` offsets and breach choice must be seeded.
- **Risks:** Nothing significant beyond the seeding requirement.

**F5. Kid-safe leaderboards and share cards.**
- **What:**
  - Local and friend-code boards only at first.
  - Generated two-word names ("Crispy Goblin"), 3 spins, then locked. No free text anywhere.
  - An end-of-run card showing combo, noobs bowled, and the seed code.
- **Precedent:** Kahoot/Gimkit names; TTD clip culture.
- **Cost:**
  - S for share cards and local boards.
  - L for online boards (server work, plus the legal read the audience report flags under COPPA).
- **Risks:** Privacy compliance needs a lawyer, not this document.

**F6. Deterministic unlocks.**
- **What:** New bosses, boss skins, and building skins unlocked by achievements ("win with Gloop on Season +3", "cancel 10 surprise breaches"). Never crates.
- **Precedent:** The crates in TTD and Five Nights TD are the trap to avoid.
- **Cost:** M.
- **Risks:** None significant, beyond keeping unlocks free of randomness.

---

## 5. Recommended v3 build order

### Phase 1: "the next playtest is harder and different" (about 1–2 weeks)

This is the smallest set that breaks the degenerate strategy and extends the upgrade curve. Each item is aimed at a quantity the audit shows the exploit depends on.

1. **A1 breach ring with build-phase preview**, plus **D1 reduced refund**, shipped together. Neither works alone.
2. **A2 larger no-build radius**, plus **A3 one surprise breach per night from night 4**, with a 3s telegraph and building shred.
3. **B1 three counter heroes:** Glider, Shieldbearer and Trap Nerd. These don't need building HP. Introduce one per night from night 2, each with an intro card.
4. **D3** decouple trap damage from Might, frenzy and crits. **D6** boss-only combo multiplier.
5. **C4** decouple XP from tier and steepen the curve from level 25. **C3** Limit Break replacing the snack.
6. **E4 partial:** `contactCap × tier.damage`, plus a per-night HP step.
7. **Telemetry on the summary screen**, so the next playtest produces numbers, not impressions:
   - damage taken per night
   - share of kills by buildings
   - time at which all 49 picks were taken
   - surprise breaches cancelled

**Success criteria for the owner's playtest, on Normal:**
- took damage every night from night 3
- rebuilt at least part of the defence every night
- upgrades not exhausted before night 7
- the owner can name at least two nights that "felt different"

Also ask a 10–14 year-old to play Chill and Normal. Keeping Normal winnable for kids is a constraint, not a nice-to-have.

### Phase 2: the escalation engine

- **E1** credit director (replaces the spawn formula) and **E2** power-following budget.
- **B2** build-reactive counters, **B3** affixes, **B4** raid leaders and champion phases.
- **A4** formations and **A6** final night from everywhere.
- **D2** building HP, with Sapper and Hopper added to the roster, and **A5** Diggers.
- **C1** evolutions, with recipes shown in the UI.
- **D5** gold-kept scoring.

### Phase 3: the long tail

- **F1** Season+ ladder, **F3** Endless, **F4** daily seed, **F5** share cards and local boards.
- **E3** HYPE meter.
- **C2** branching choices, **C5** reroll and banish.
- **F2** curses.
- A nemesis champion who remembers a player's build (Shadow of Mordor, EG2 Super Agents).
- Online leaderboards only after the legal review.

---

## 6. Open questions for the owner

1. **Preview or surprise?** Should the next night's breaches be shown during the build phase, so building is planned (Thronefall, Kingdom Rush), or only when the night starts, so building protects the vault as a zone (DOORS-style)? My recommendation is to show most breaches and keep one surprise per night from night 4. The choice decides how A1 and A3 are built.
2. **Can buildings be destroyed?** Yes unlocks Sappers, repair economy and Diggers (D2, A5). No means counters must only bypass or disarm temporarily.
3. **Who is Normal for?** Should Normal be where a first-time 10–12 year-old usually wins, with your level of challenge in Heroic and above plus the Season+ ladder? Or should Normal itself be tuned to challenge you? This sets every Phase 1 tuning target.
4. **Is the 7-night season still the unit of play?** Or should Endless and Season+ be the main loop after the first win? This decides whether F1 and F3 are Phase 2 or Phase 3.
5. **Online leaderboards: in scope?** They need a server and a privacy and legal review. Friend-code and local boards need neither.