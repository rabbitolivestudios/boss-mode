# Role-inversion games: research report for BOSS MODE

**How the research was done.** Every page fetch was blocked in this sandbox (fandom, steamcommunity, gamefaqs, namu.wiki, toucharcade, explorminate, evilgeniusgame.com). So every fact below comes from web-search result text for the cited URL, not from reading the full page. Where a search did not confirm something, the report says so. Labels: **[F]** fact with a source, **[I]** my inference, **[P]** proposal.

## Games studied

- **Dungeon Keeper 1/2 (Bullfrog, 1997/99).** The original "you are the dungeon" game. Heroes arrive through gates that can't be disabled, and Tunnellers dig their own way in. This is the closest match to the "spawn points are predictable" finding.
- **War for the Overworld (2015).** A Dungeon Keeper successor. Enemy dwarves tunnel past the player's defences.
- **Legend of Keepers (Goblinz, 2021).** Roguelite dungeon manager with 43 weeks per campaign, a morale-and-flee system, veteran and champion tiers, and ascension. Its reviews are the clearest case of "one dominant build trivialises the game".
- **Dungeons 2/3/4 (Realmforge/Kalypso).** Dungeon Keeper-like RTS. Dungeons 4 reviews directly criticise the lack of difficulty and the repetition.
- **Dungeon Warfare 1/2 (Valsar).** Trap tower defence that runs on phones, the closest mechanical match to BOSS MODE's build phase. It has Diggers, flyers, trap-tier progression and Ascension, plus a player thread titled "far too easy".
- **Evil Genius 2 (Rebellion, 2021).** The villain lair is raided by agents. Its Heat system decides which kind of agent comes and which door they use. This is the best model for escalation that reacts to what the player does.
- **Hostile Architect (SludgeBit, not yet released).** A 2D side-scrolling "build the level, heroes run it" game with exponential waves. No reviews exist yet.
- **Dungeon Maker: Dark Lord (GameCoaster, mobile).** A premium mobile game with a 100-day campaign where hero numbers and strength grow each day. Good evidence that long escalation works on a phone.
- **Despot's Game (2022).** A roguelike army builder with 100+ mutations. Reviewers still called it repetitive.
- **Overlord (2007).** The "be evil, or really evil" fantasy: minions, a corruption meter, dark humour. It is not a raid-defence game.
- **Super Dungeon Maker.** A Zelda-style maker. Enemy AI is pre-scripted and there is no real role inversion, so it is marginal here.
- **Shadow of Mordor (reference only).** Not a boss game, but its Nemesis system is the standard model for enemies that remember you.

## Mechanisms that matter

### 1. Where enemies come from

- **[F] Dungeon Keeper Hero Gates.** Hero parties spawn from Hero Gates "regardless of the dungeon layout". Wave timing is set per level. The gate can only be disabled by claiming all 12 surrounding tiles. [DK wiki: Hero Gate](https://dungeonkeeper.fandom.com/wiki/Hero_Gate)
- **[F] Dungeon Keeper Tunnellers.** Tunnellers "excavate tunnels to your dungeon so that heroes can invade" and lead stronger parties along the new path. They are weak fighters whose whole purpose is to "breach an unwary Keeper's dungeon". The counter is fortifying walls. [DK wiki: Tunneller](https://dungeonkeeper.fandom.com/wiki/Tunneller), [DK wiki: Heroes](https://dungeonkeeper.fandom.com/wiki/Heroes)
- **[F] War for the Overworld.** Dwarves "tunnelled through dungeon walls, going around all of the player's defenses". [LP Archive WFTO #7](https://lparchive.org/War-for-the-Overworld/Update%2007/)
- **[F] Dungeon Warfare 2 Diggers.** Diggers remove destructible walls. They stop at barricades, so players plan for the map "without the dirt" in advance. [Steam thread: diggers](https://steamcommunity.com/app/698540/discussions/0/1730963192553350890/)
- **[F] Evil Genius 2 entry doors.** Agent type sets the entry point:
  - Investigators come in through the Casino.
  - Saboteurs come in the back door and plant bombs.
  - Rogues appear directly in the Vault rooms to steal gold.
  - Agents of level 4–5, or anyone when Heat is over 200, "definitely start coming in the back".

  Sources: [Fandom summary via search](https://evilgenius.fandom.com/wiki/Agents_(EG2)), [Qnnit heat guide](https://qnnit.com/evil-genius-2-how-does-heat-work-anyway/)

### 2. Hero classes that counter the player's build

- **[F] Flyers ignore floor traps.** In Dungeon Keeper, step-on traps (Gas, Spike, Freeze) "cannot be triggered by flying creatures" such as the Fairy. The DK Thief can "discover hidden traps and doors". [DK wiki: Traps](https://dungeonkeeper.fandom.com/wiki/Traps), [DK wiki: Fairy](https://dungeonkeeper.fandom.com/wiki/Fairy). *Unverified:* which DK game the thief line refers to; the search text was ambiguous.
- **[F] Dungeon Warfare 2 flyers.** Flyers cross water. Most traps are "unreliable" against them, and Lightning or Bolt traps are recommended. [Steam: flying enemies](https://steamcommunity.com/app/698540/discussions/0/1710690176747920535/)
- **[F] Dungeon Warfare 2 roster.** Enemies include Digger, Thief, Master Thief, Wizard and Knight. Slime traps have an "unholy healing blocker", which implies healer enemies. [DW2 wiki: Enemies](https://dungeon-warfare-2.fandom.com/wiki/Enemies). *Unverified:* the exact healer class and its numbers.
- **[F] Dungeons 3.** Gunner-type heroes summon turrets, and players are told to kill healers first. [GamesFinder tips](https://gameslikefinder.com/article/dungeons-3-tips/)
- **[F] Legend of Keepers morale.** Morale acts as a second health bar. At 0 the hero flees and leaves the party, and lower morale makes the hero take more damage. [LoK wiki how-to](https://legendofkeepers.fandom.com/wiki/How_to_play_guide_for_Legend_of_Keepers). Heroes' "crazy amount of healing" and healing rooms were called unfair. [Softpedia](https://www.softpedia.com/reviews/games/pc/legend-of-keepers-review-532764.shtml)
- **[F] No trap-disarmer confirmed in Legend of Keepers.** The roster search (Barbarian, Priestess, Ninja, Paladin, Archmage…) showed no disarm or detect skill. Treat this as unverified, not as absent.

### 3. How raids escalate

- **[F] Legend of Keepers.**
  - The campaign runs 43 weeks.
  - Veterans and then champions appear after some weeks.
  - Higher-level heroes get **random passive abilities**.
  - Roughly every 6 weeks the player chooses between invader groups of different difficulty and reward.
  - Each master has 5 missions, then endless and ascension modes.

  Sources: [Gideon's Gaming](https://gideonsgaming.com/legend-of-keepers-review-villains-of-might-and-musk/), [PC Invasion](https://www.pcinvasion.com/legend-of-keepers-review/)
- **[F] Dungeon Warfare 2 Ascension.** After the boss levels, Ascension restarts every map at **+2 difficulty** and keeps a small share of rewards. Difficulty runes raise the challenge in exchange for more XP. [SteamAH guide](https://steamah.com/dungeon-warfare-2-beginners-guide/)
- **[F] Hostile Architect.** "An exponentially increasing amount of heroes" each wave, with a random shop selection of traps. [sludgebit.com](http://sludgebit.com/)
- **[F] Dungeon Maker: Dark Lord.** Hero numbers and strength increase by day. The goal is 100 days, and players report dying around day 80–120. [Game Solver](https://game-solver.com/dungeon-maker-dark-lord/), [TouchArcade forum](https://toucharcade.com/community/threads/dungeon-maker-dark-lord-by-gamecoaster.319369/page-71)
- **[F] Evil Genius 2 Heat.**
  - Heat rises over time on its own, and rises fast when the player runs schemes.
  - Each region is capped at 100. At 100 the region locks down for 5 minutes, then resets.
  - Higher Heat brings more, and larger, groups of agents.

  Sources: [Qnnit](https://qnnit.com/evil-genius-2-how-does-heat-work-anyway/), [Gamepur](https://www.gamepur.com/guides/how-to-make-agents-and-soldiers-arrive-less-frequently-in-evil-genius-2)
- **[F] Evil Genius 2 Super Agents.** Named Super Agents (Wrecking Bola, Agent X…) raid the lair when a scheme completes in their region. The player has **one minute** to start a counter-scheme that weakens their squad. [GameWatcher](https://www.gamewatcher.com/evil-genius-2-super-agents)

### 4. Reputation and nemesis

- **[F] Shadow of Mordor.** An enemy who kills you or survives an encounter gets promoted, grows stronger, remembers you in dialogue, and can come back with an acquired fear (for example, of fire). [GamesRadar](https://www.gamesradar.com/shadow-mordor-nemesis-system-amazing-how-works/)
- **[F] Evil Genius 2.** Investigators who escape with evidence raise Heat and summon specialist agents chosen according to the player's actions. [Fandom summary via search](https://evilgenius.fandom.com/wiki/Agents_(EG2))

### 5. What makes the villain fantasy fun

- **[F] Dungeon Keeper.** Slapping imps, possessing creatures in first person, and a "Pythonesque narrator" who adds "comedic insult to sadistic injury". [The Register](https://www.theregister.com/on-prem/2014/09/12/slap-my-imp-up-bullfrogs-dungeon-keeper/442269), [EIP Gaming](https://eip.gg/reviews/dungeon-keeper-review/)
- **[F] Overlord.** The corruption meter visibly darkens the Overlord's armour, and the game uses satirical dark humour. [Wikipedia](https://en.wikipedia.org/wiki/Overlord_(2007_video_game)), [TV Tropes](https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/OverlordI)

### 6. What reviewers criticised about difficulty

- **[F] Legend of Keepers.**
  - Morale builds are "brainless to play but have the highest results". Players won "by the 2nd room". [Steam thread](https://steamcommunity.com/app/1151080/discussions/0/1737758544555096556/)
  - Some monster combinations "reliably annihilate all highest-level heroes in the first room". Raising the difficulty "does little to remedy this", and battles become "a small chore". [PC Invasion](https://www.pcinvasion.com/legend-of-keepers-review/)
- **[F] Dungeons 4.** "Difficulty slider doesn't seem to have any real effect." On hard, one spell plus demons steamrolls everything. [Steam thread](https://steamcommunity.com/app/1643310/discussions/1/4516633504581444862/), [Metacritic user reviews](https://www.metacritic.com/game/dungeons-4/user-reviews/)
- **[F] Dungeon Warfare 2.** Even with difficulty runes on the top-tier maps, a player "basically win[s] all the time". Self-set difficulty was "not as satisfying" as a fixed challenge. [Steam thread](https://steamcommunity.com/app/698540/discussions/0/1733207382033259459/)
- **[F] Despot's Game.** Becomes "repetitive, somewhat frustrating, and not as challenging" even with 100+ mutations. [Wikipedia summary / reviews](https://en.wikipedia.org/wiki/Despot%27s_Game)

## What BOSS MODE should steal (ranked)

**1. [P] Breach points revealed after the build phase locks, plus hero Diggers.** *(Findings: "spikes on all the spawn points"; "where enemies come from is too predictable".)*
- **Why [I]:** Every source game that kept raids tense made the entry point something the player can't fully pre-trap. Dungeon Keeper and War for the Overworld use Tunnellers, Dungeon Warfare 2 uses Diggers, Evil Genius 2 uses back doors. Four fixed gates with a build phase before the night hands the player a solved problem.
- **The change:**
  - Replace the 4 fixed gates with, say, 8–12 candidate breach points on the ring.
  - Each night, a seeded subset is revealed only when "night starts", after building is locked.
  - From night 2, add a Digger class that tunnels through walls toward the vault, like a Dungeon Keeper Tunneller. The counter is a reinforced-wall upgrade, a scaled-down version of DK's fortify.
- **Tuning:** Numbers must come from playtest, not from this report.

**2. [P] Evil Genius-style "Heat" that sets where heroes enter and who comes.** *(Findings: predictability; "need increasingly difficult enemies".)*
- **The meter:** Heat, shown as "Hype" or "Viewers" to fit the online-player fiction, rises with gold hoarded, kills and combos.
- **What it changes [P]:**
  - At low Heat, heroes use ring gates only.
  - Higher Heat unlocks "back door" spawns *inside* the castle: thieves appearing next to the vault, as EG2's Rogues do [F].
  - Higher Heat also brings more specialists.
- **Why it helps [I]:** The player's success becomes the source of difficulty, which scales to a skilled adult without punishing a 10-year-old.

**3. [P] A counter-roster aimed at trap spam.** *(Finding: "hardly took any damage".)*
- **Flyer:** ignores floor traps (spike pit, launch pad), as the Dungeon Keeper Fairy does [F]. Only the Bone Archer tower and the boss can hit it.
- **Engineer/Tinkerer:** disables a trap for N seconds or permanently, the "detect traps" role of the DK Thief [F-partial].
- **Shieldbearer:** immune to spikes from the front.
- **Cleanser-healer:** Dungeons 3 and Legend of Keepers both make healers the priority target [F].
- **Build-reactive spawns [P]:** Weight the next night's mix toward counters for the building that got the most kills last night. Announce it in the killfeed ("xX_Pr0_Xx: bring wings, they spam spikes lol"), so the adaptation reads as fair and funny rather than hidden rubber-banding.

**4. [P] A Legend of Keepers-style hero tier ladder with random passives.** *(Finding: "increasingly difficult enemies".)*
- **Tiers:** Normal, then Veteran, then Champion. From about night 3, each tier rolls random passives (for example "Spike-proof boots", "Double jump", "Revive once"), as LoK does for higher-level heroes [F].
- **Party choice:** Before some nights, let the player pick between two invading "squads" with different risk and reward (LoK does this about every 6 weeks [F]). This gives kids agency over difficulty.

**5. [P] A named Nemesis champion.** *(Findings: escalation; replay motive.)*
- **The rule:** A champion who escapes, or who damaged the vault, gets promoted with a gamer tag and returns stronger on a later night with a trait learned from the player's build, as Shadow of Mordor [F] and EG2 Super Agents [F] do.
- **Counterplay:** A one-minute pre-night "sabotage" choice, taken from EG2's counter-scheme [F].
- **Kid-safety:** No open chat is needed; all barks come from a fixed list.

**6. [P] Ascension instead of a flat season end.** *(Finding: "exhausted all upgrades by night 5".)*
- **Evidence [F]:** Dungeon Warfare 2 (+2 on every map) and Legend of Keepers (ascension) both extend content by raising the floor, not by adding upgrades.
- **The change:** Beating a season unlocks "Season +1" with new modifiers.
- **Caution [I]:** Pairing this with fewer upgrade levels per night is outside my topic; the progression researcher should own it.

**7. [P] Lean harder into villain-comedy feedback.** A Dungeon Keeper-style sarcastic narrator on dawn screens, and a slap-like poke interaction [F: DK]. This isn't about difficulty, but it is what reviewers remember and why the genre is loved.

## Traps to avoid

- **A dominant build that wins in room one** (Legend of Keepers morale [F]). The spike-camping result is BOSS MODE's version of this. Any single building type needs a counter class in the roster.
- **A difficulty slider that only scales numbers** (Dungeons 4 [F]; LoK: raising difficulty "does little" [F]). More hero HP doesn't fix a solved layout. BOSS MODE's Chill-to-Legendary tiers are currently exactly this kind of slider [I].
- **Self-imposed difficulty as the fix** (Dungeon Warfare 2 runes, "not as satisfying" [F]). Difficulty has to come from the game, not from the player handicapping themselves.
- **Digging that erases building entirely** [I]. DW2 keeps a hard barricade counter to Diggers [F]. BOSS MODE needs one too, or the build phase becomes pointless and feels unfair to kids.
- **Invisible adaptation** [I]. Counters to the player's build must be announced, or kids will read them as cheating.
- **Heavy hero healing** (LoK's "absolute unfairness of healing rooms" [F]). Cap or telegraph healing.
- **Mutation count as a substitute for variety** (Despot's Game is still called repetitive at 100+ mutations [F]).
- **Readability on phones [I].** Back-door spawns and flyers need strong telegraphs (a ring pulse or siren 2–3 s before arrival) to stay readable with hundreds of units on screen.

## Sources

- https://dungeonkeeper.fandom.com/wiki/Hero_Gate
- https://dungeonkeeper.fandom.com/wiki/Tunneller
- https://dungeonkeeper.fandom.com/wiki/Heroes
- https://dungeonkeeper.fandom.com/wiki/Traps
- https://dungeonkeeper.fandom.com/wiki/Fairy
- https://lparchive.org/War-for-the-Overworld/Update%2007/
- https://legendofkeepers.fandom.com/wiki/How_to_play_guide_for_Legend_of_Keepers
- https://legendofkeepers.fandom.com/wiki/Heroes
- https://www.softpedia.com/reviews/games/pc/legend-of-keepers-review-532764.shtml
- https://www.pcinvasion.com/legend-of-keepers-review/
- https://gideonsgaming.com/legend-of-keepers-review-villains-of-might-and-musk/
- https://steamcommunity.com/app/1151080/discussions/0/1737758544555096556/
- https://gameslikefinder.com/article/dungeons-3-tips/
- https://steamcommunity.com/app/1643310/discussions/1/4516633504581444862/
- https://www.metacritic.com/game/dungeons-4/user-reviews/
- https://dungeon-warfare-2.fandom.com/wiki/Enemies
- https://steamcommunity.com/app/698540/discussions/0/1730963192553350890/
- https://steamcommunity.com/app/698540/discussions/0/1710690176747920535/
- https://steamcommunity.com/app/698540/discussions/0/1733207382033259459/
- https://steamah.com/dungeon-warfare-2-beginners-guide/
- https://evilgenius.fandom.com/wiki/Agents_(EG2)
- https://qnnit.com/evil-genius-2-how-does-heat-work-anyway/
- https://www.gamepur.com/guides/how-to-make-agents-and-soldiers-arrive-less-frequently-in-evil-genius-2
- https://www.gamewatcher.com/evil-genius-2-super-agents
- http://sludgebit.com/
- https://game-solver.com/dungeon-maker-dark-lord/
- https://toucharcade.com/community/threads/dungeon-maker-dark-lord-by-gamecoaster.319369/page-71
- https://en.wikipedia.org/wiki/Despot%27s_Game
- https://en.wikipedia.org/wiki/Overlord_(2007_video_game)
- https://tvtropes.org/pmwiki/pmwiki.php/VideoGame/OverlordI
- https://www.theregister.com/on-prem/2014/09/12/slap-my-imp-up-bullfrogs-dungeon-keeper/442269
- https://eip.gg/reviews/dungeon-keeper-review/
- https://www.gamesradar.com/shadow-mordor-nemesis-system-amazing-how-works/
- https://techraptor.net/gaming/reviews/super-dungeon-maker-review