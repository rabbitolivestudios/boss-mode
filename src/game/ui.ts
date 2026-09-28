import { BOSSES, DEFAULT_TIER, DIFFICULTIES, NIGHTS, OPEN_TIERS, PASSIVES, TREASURE, WEAPONS, type BossId, type Difficulty } from './config';
import { bossPortrait } from './bossart';
import type { Choice, Game, Summary } from './game';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

function fmt(t: number): string {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** `unlocked` is the highest difficulty index the player may pick (a win unlocks the next one). */
interface Best { time: number; kills: number; combo: number; wins: number; unlocked: number }

function loadBest(): Best {
  try {
    const raw = localStorage.getItem('boss-mode-best');
    if (raw) {
      const saved = JSON.parse(raw) as Partial<Best> & { ladder?: number };
      // Saves from before the ladder moved up one step (Chill was inserted at the bottom) shift by one;
      // a win recorded before tiers existed at all counts as a win on the old Normal.
      const old = saved.unlocked ?? (saved.wins ? 1 : 0);
      const unlocked = saved.ladder === 2 ? old : old + 1;
      return { time: 0, kills: 0, combo: 0, wins: 0, ...saved, unlocked: Math.max(OPEN_TIERS, unlocked) };
    }
  } catch { /* storage can be blocked; bests are a nicety */ }
  return { time: 0, kills: 0, combo: 0, wins: 0, unlocked: OPEN_TIERS };
}

function saveBest(b: Best): void {
  try { localStorage.setItem('boss-mode-best', JSON.stringify({ ...b, ladder: 2 })); } catch { /* ignore */ }
}

export class Ui {
  private cardKeys: ((e: KeyboardEvent) => void) | null = null;
  private lastAbilities = '';
  private comboTimer = 0;
  private portraits = new Map<BossId, HTMLCanvasElement>();
  /** The difficulty picked on the title screen. */
  difficulty: Difficulty = DIFFICULTIES[DEFAULT_TIER];

  showTitle(onPick: (b: BossId) => void): void {
    $('hud').classList.add('hidden');
    for (const id of ['levelup', 'pause', 'end']) $(id).classList.add('hidden');
    $('title').classList.remove('hidden');
    const pick = $('boss-pick');
    pick.innerHTML = '';
    for (const id of Object.keys(BOSSES) as BossId[]) {
      const b = BOSSES[id];
      const w = WEAPONS[b.start];
      const btn = document.createElement('button');
      btn.className = 'boss-card';
      btn.innerHTML = `<span class="em">${b.emoji}</span><span class="nm">${b.name}</span><span class="tt">${b.title}</span><span class="st">${w.icon} ${w.name}<br>❤️ ${b.hp} · 👟 ${b.speed}</span>`;
      const art = this.portraits.get(id) ?? bossPortrait(id);
      this.portraits.set(id, art);
      art.className = 'portrait';
      btn.querySelector('.em')?.replaceWith(art);
      btn.onclick = () => onPick(id);
      pick.appendChild(btn);
    }
    const best = loadBest();
    this.drawDifficulty(best.unlocked);
    $('best').textContent = best.kills ? `Best: ${fmt(best.time)} survived · ${best.kills} heroes · ${best.combo}x combo · ${best.wins} wins` : '';
  }

  private drawDifficulty(unlocked: number): void {
    const box = $('difficulty');
    box.innerHTML = '';
    if (DIFFICULTIES.indexOf(this.difficulty) > unlocked) this.difficulty = DIFFICULTIES[DEFAULT_TIER];
    DIFFICULTIES.forEach((d, i) => {
      const btn = document.createElement('button');
      const locked = i > unlocked;
      btn.className = `diff${d === this.difficulty ? ' on' : ''}${locked ? ' locked' : ''}`;
      btn.textContent = locked ? `🔒 ${d.name}` : d.name;
      btn.title = locked ? `Win on ${DIFFICULTIES[i - 1].name} to unlock` : '';
      btn.disabled = locked;
      btn.onclick = () => { this.difficulty = d; this.drawDifficulty(unlocked); };
      box.appendChild(btn);
    });
    const next = DIFFICULTIES[unlocked + 1];
    $('difficulty-hint').textContent = next ? `Win on ${DIFFICULTIES[unlocked].name} to unlock ${next.name}` : 'Every difficulty unlocked!';
  }

  hud(show: boolean): void {
    $('hud').classList.toggle('hidden', !show);
  }

  startRun(): void {
    $('title').classList.add('hidden');
    $('end').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('killfeed').innerHTML = '';
    this.lastAbilities = '';
  }

  levelUp(choices: Choice[], onChoose: (c: Choice) => void): void {
    const wrap = $('cards');
    wrap.innerHTML = '';
    const pickAt = (i: number) => {
      if (!choices[i]) return;
      if (this.cardKeys) window.removeEventListener('keydown', this.cardKeys);
      this.cardKeys = null;
      $('levelup').classList.add('hidden');
      onChoose(choices[i]);
    };
    choices.forEach((c, i) => {
      const btn = document.createElement('button');
      btn.className = 'card';
      let icon = '🍗', name = 'Snack', lv = 'HEAL', desc = 'Heal 40 HP', isNew = false;
      if (c.kind === 'weapon') {
        const w = WEAPONS[c.id];
        icon = w.icon; name = w.name; desc = w.blurb[c.level - 1];
        isNew = c.level === 1; lv = isNew ? 'NEW!' : `LV ${c.level}`;
      } else if (c.kind === 'passive') {
        const p = PASSIVES[c.id];
        icon = p.icon; name = p.name; desc = p.blurb; lv = `LV ${c.level}`; isNew = c.level === 1;
      }
      btn.innerHTML = `<span class="ic">${icon}</span><span class="txt"><span class="nm">${name}</span> <span class="lv${isNew ? ' new' : ''}">${lv}</span><br><span class="ds">${desc}</span></span><span class="key">press ${i + 1}</span>`;
      btn.onclick = () => pickAt(i);
      wrap.appendChild(btn);
    });
    this.cardKeys = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 3) pickAt(n - 1);
    };
    window.addEventListener('keydown', this.cardKeys);
    $('levelup').classList.remove('hidden');
  }

  update(g: Game): void {
    $('xpfill').style.width = `${Math.min(100, (g.xp / g.xpNeed) * 100)}%`;
    $('lvl').textContent = `LV ${g.level}`;
    $('hpfill').style.width = `${Math.max(0, (g.hp / g.maxHp) * 100)}%`;
    $('hptext').textContent = `${Math.max(0, Math.ceil(g.hp))} / ${Math.round(g.maxHp)}`;
    $('timer').textContent = g.night === NIGHTS.length - 1 ? `NIGHT ${g.night + 1}` : `NIGHT ${g.night + 1} · ${fmt(g.nightLeft())}`;
    $('vaultfill').style.width = `${Math.min(100, (g.treasure / TREASURE.start) * 100)}%`;
    $('vaulttext').textContent = `💰 ${g.treasure}`;
    const thieves = g.heroes.some((h) => h.alive && h.carry > 0);
    $('vaultbox').classList.toggle('alarm', thieves);
    this.drawMarkers(g);
    $('kills').textContent = `💀 ${g.kills}`;
    $('vignette').style.opacity = g.hurt > 0 ? '1' : g.hp / g.maxHp < 0.3 ? '0.45' : '0';
    $('frenzy').style.opacity = g.frenzy > 0 ? '1' : '0';

    const rage = g.rage / 100;
    $('ragefill').style.height = `${rage * 100}%`;
    $('roar').classList.toggle('ready', rage >= 1);

    const champ = g.champions[0];
    $('champbar').classList.toggle('hidden', !champ);
    if (champ) {
      $('champname').textContent = `⚔️ ${champ.tag ?? 'Champion'}`;
      $('champfill').style.width = `${Math.max(0, (champ.hp / champ.maxHp) * 100)}%`;
    }

    const sig = [...g.weapons].map(([k, w]) => k + w.level).join() + '|' + [...g.passives].map(([k, l]) => k + l).join();
    if (sig !== this.lastAbilities) {
      this.lastAbilities = sig;
      const box = $('abilities');
      box.innerHTML = '';
      for (const [id, w] of g.weapons) box.insertAdjacentHTML('beforeend', `<div class="ab" title="${WEAPONS[id].name}">${WEAPONS[id].icon}<i>${w.level}</i></div>`);
      for (const [id, l] of g.passives) box.insertAdjacentHTML('beforeend', `<div class="ab passive" title="${PASSIVES[id].name}">${PASSIVES[id].icon}<i>${l}</i></div>`);
    }
  }

  private markerEls: HTMLDivElement[] = [];

  private drawMarkers(g: Game): void {
    const box = $('markers');
    const list = g.markers();
    while (this.markerEls.length < list.length) {
      const el = document.createElement('div');
      box.appendChild(el);
      this.markerEls.push(el);
    }
    this.markerEls.forEach((el, i) => {
      const m = list[i];
      el.hidden = !m;
      if (!m) return;
      el.className = `marker ${m.kind}`;
      el.innerHTML = `${m.kind === 'vault' ? '💰' : m.kind === 'breach' ? '🚨' : '💸'}<i style="transform: rotate(${m.angle}rad) translateX(26px)"></i>`;
      el.style.transform = `translate(${m.x}px, ${m.y}px)`;
    });
  }

  clearBanner(): void {
    $('banner').classList.remove('show');
  }

  banner(title: string, sub: string): void {
    const b = $('banner');
    $('banner-title').textContent = title;
    $('banner-sub').textContent = sub;
    b.classList.remove('show');
    void b.offsetWidth; // restart the CSS animation
    b.classList.add('show');
  }

  killfeed(text: string): void {
    const feed = $('killfeed');
    const el = document.createElement('div');
    el.className = 'kf';
    el.textContent = text;
    feed.prepend(el);
    while (feed.children.length > 5) feed.lastElementChild?.remove();
    setTimeout(() => el.remove(), 3000);
  }

  combo(n: number): void {
    const el = $('combo');
    window.clearTimeout(this.comboTimer);
    if (n <= 0) { this.comboTimer = window.setTimeout(() => el.classList.remove('on'), 400); return; }
    const word = n >= 40 ? 'LEGENDARY!' : n >= 25 ? 'UNSTOPPABLE!' : n >= 15 ? 'STRIKE!' : n >= 8 ? 'BOWLING!' : 'CRASH!';
    el.innerHTML = `${n}x <small>${word}</small>`;
    el.classList.add('on');
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  pause(show: boolean): void {
    $('pause').classList.toggle('hidden', !show);
  }

  end(s: Summary, onAgain: () => void, onRetry?: () => void): void {
    $('levelup').classList.add('hidden');
    const boss = BOSSES[s.boss];
    $('end-title').textContent = s.win ? 'VICTORY!' : s.reason === 'vault' ? 'ROBBED!' : 'DEFEATED!';
    const worst = [...s.escapes].sort((a, b) => b.gold - a.gold)[0];
    $('end-sub').textContent = s.win
      ? `${boss.name} crushed the Chosen One and kept ${s.treasure} gold!`
      : s.reason === 'vault'
        ? `The heroes stole ALL of ${boss.name}'s treasure!${worst ? ` ${worst.tag} got away with the most.` : ''}`
        : `The heroes got ${boss.name}... this time.`;
    const best = loadBest();
    const rec = (v: number, b: number) => (v > b ? ' 🏆' : '');
    $('end-stats').innerHTML = `
      <div><b>${fmt(s.time)}${rec(s.time, best.time)}</b>survived</div>
      <div><b>${s.kills}${rec(s.kills, best.kills)}</b>heroes beaten</div>
      <div><b>${s.bestCombo}x${rec(s.bestCombo, best.combo)}</b>best combo</div>
      <div><b>💰 ${s.treasure}</b>gold kept</div>`;
    const tier = DIFFICULTIES.indexOf(s.difficulty);
    const unlocks = s.win && tier === best.unlocked && tier + 1 < DIFFICULTIES.length;
    if (unlocks) $('end-sub').textContent += ` ${DIFFICULTIES[tier + 1].name.toUpperCase()} mode unlocked!`;
    saveBest({
      unlocked: unlocks ? tier + 1 : best.unlocked,
      time: Math.max(best.time, s.time), kills: Math.max(best.kills, s.kills),
      combo: Math.max(best.combo, s.bestCombo), wins: best.wins + (s.win ? 1 : 0),
    });
    $('end').classList.remove('hidden');
    $('btn-again').onclick = onAgain;
    const retry = $('btn-retry');
    retry.hidden = !onRetry;
    if (onRetry) retry.onclick = onRetry;
  }
}
