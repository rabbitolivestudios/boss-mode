import { icon, type IconName } from './icons';

/**
 * Chart kit for the dashboard: plain HTML and SVG, every mark with a hover tooltip, every chart
 * with a table view. Values are printed in text ink, never in a series colour. The three series
 * slots are the brand palette validated on the dark surface (gold, pink, cyan); magnitude uses
 * one hue from faint to full.
 */

export const esc = (v: unknown): string =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export const fmt = (n: number | null | undefined, digits = 0): string =>
  n === null || n === undefined ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: digits });

export const pct = (n: number | null | undefined): string => (n === null || n === undefined ? '–' : `${fmt(n, 1)}%`);

export interface Series { key: string; label: string; slot: 1 | 2 | 3 }

export function card(o: { title: string; ic: IconName; hint?: string; body: string; table?: string; cls?: string }): string {
  return `<section class="card ${o.cls ?? ''}"><header class="card-head">${icon(o.ic, 'ic head-ic')}<div><h2>${esc(o.title)}</h2>` +
    `${o.hint ? `<p class="hint">${esc(o.hint)}</p>` : ''}</div></header>${o.body}` +
    `${o.table ? `<details class="table-view"><summary>${icon('chart', 'ic tiny')} See the numbers</summary>${o.table}</details>` : ''}</section>`;
}

export function table(head: string[], rows: (string | number)[][]): string {
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')
  }</tbody></table></div>`;
}

export const empty = (text = 'Nothing in this period yet.'): string => `<p class="empty">${icon('info', 'ic tiny')} ${esc(text)}</p>`;

/** A 14-point trend line for a stat card; flat when there is no data. */
export function sparkline(values: number[], slot: 1 | 2 | 3): string {
  const v = values.length ? values : [0];
  const max = Math.max(1, ...v), W = 110, H = 34;
  const pts = v.map((y, i) => `${(i / Math.max(1, v.length - 1)) * W},${H - 3 - (y / max) * (H - 6)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--series-${slot})" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/></svg>`;
}

export function kpi(o: { ic: IconName; label: string; value: string; spark: number[]; slot: 1 | 2 | 3; now: number; before: number | null; note: string }): string {
  let delta = '<span class="delta flat">No earlier period to compare</span>';
  if (o.before !== null) {
    if (o.before === 0 && o.now === 0) delta = '<span class="delta flat">Same as the period before</span>';
    else if (o.before === 0) delta = `<span class="delta up">${icon('up', 'ic tiny')} New this period</span>`;
    else {
      const change = ((o.now - o.before) / o.before) * 100;
      delta = `<span class="delta ${change >= 0 ? 'up' : 'down'}">${icon(change >= 0 ? 'up' : 'down', 'ic tiny')} ${change >= 0 ? '+' : ''}${fmt(change, 0)}% vs period before</span>`;
    }
  }
  return `<article class="kpi"><div class="kpi-top"><span class="kpi-ic slot-${o.slot}">${icon(o.ic)}</span><span class="kpi-label">${esc(o.label)}</span></div>` +
    `<div class="kpi-mid"><span class="kpi-value">${esc(o.value)}</span>${sparkline(o.spark, o.slot)}</div>${delta}<p class="kpi-note">${esc(o.note)}</p></article>`;
}

/** Horizontal bars for one measure: length against a shared max. `lead` may hold a flag or an icon. */
export function bars(items: { label: string; lead?: string; value: number; text: string; tip: string; sub?: string }[], opts: { max?: number; slot?: 1 | 2 | 3 } = {}): string {
  if (!items.length) return empty();
  const max = opts.max ?? Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars">${items.map((i) => {
    const w = Math.max(0, Math.min(100, (i.value / max) * 100));
    return `<div class="bar-row" data-tip="${esc(i.tip)}"><div class="bar-line"><span class="bar-label">${i.lead ?? ''}${esc(i.label)}</span><span class="bar-value">${esc(i.text)}</span></div>` +
      `<span class="bar-track"><span class="bar-fill" style="width:${w}%;background:var(--series-${opts.slot ?? 1})"></span></span>${i.sub ? `<span class="bar-sub">${esc(i.sub)}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

export function legend(series: Series[]): string {
  return `<div class="legend">${series.map((s) => `<span><i style="background:var(--series-${s.slot})"></i>${esc(s.label)}</span>`).join('')}</div>`;
}

/** Part-to-whole per row: segments with a surface gap, a legend, and the counts in text. */
export function stacked(rows: { label: string; parts: Record<string, number>; note?: string }[], series: Series[], unit = ''): string {
  if (!rows.some((r) => Object.values(r.parts).some((v) => v > 0))) return empty();
  return legend(series) + `<div class="bars">${rows.map((r) => {
    const total = series.reduce((a, s) => a + (r.parts[s.key] ?? 0), 0);
    const segs = total ? series.filter((s) => (r.parts[s.key] ?? 0) > 0).map((s) => {
      const v = r.parts[s.key] ?? 0;
      return `<span class="seg" style="flex:${v};background:var(--series-${s.slot})" data-tip="${esc(`${r.label} · ${s.label}: ${fmt(v, 1)}${unit} (${pct((v / total) * 100)})`)}"></span>`;
    }).join('') : '';
    const text = r.note ?? series.map((s) => fmt(r.parts[s.key] ?? 0, 1) + unit).join(' / ');
    return `<div class="bar-row"><div class="bar-line"><span class="bar-label">${esc(r.label)}</span><span class="bar-value">${esc(text)}</span></div><span class="bar-track stack">${segs}</span></div>`;
  }).join('')}</div>`;
}

/** Stacked columns per day (two series), with a scale on the left and first/last date labels. */
export function dailyColumns(days: { date: string; a: number; b: number; tip: string }[], series: [Series, Series]): string {
  if (!days.some((d) => d.a + d.b > 0)) return empty('No players in this period yet.');
  // An even top keeps the middle label a whole number (1, 1, 0 read as a bug on a one-player day).
  const top = Math.max(2, ...days.map((d) => d.a + d.b)), max = top + (top % 2);
  const col = (d: (typeof days)[number]) => `<span class="col" data-tip="${esc(d.tip)}"><span class="col-stack" style="height:${((d.a + d.b) / max) * 100}%">` +
    `${d.b ? `<span class="col-seg" style="flex:${d.b};background:var(--series-${series[1].slot})"></span>` : ''}` +
    `${d.a ? `<span class="col-seg" style="flex:${d.a};background:var(--series-${series[0].slot})"></span>` : ''}</span></span>`;
  return legend(series) + `<div class="columns" role="img" aria-label="${esc(series[0].label)} and ${esc(series[1].label)} per day">` +
    `<div class="col-axis-y"><span>${fmt(max)}</span><span>${fmt(max / 2)}</span><span>0</span></div>` +
    `<div class="col-plot">${days.map(col).join('')}</div></div>` +
    `<div class="col-axis-x"><span>${esc(days[0].date.slice(5).replace('-', '/'))}</span><span>${esc(days[days.length - 1].date.slice(5).replace('-', '/'))}</span></div>`;
}

/** A ring with the total in the middle and a legend that carries icons, counts and shares. */
export function donut(parts: { label: string; ic: IconName; value: number; slot: 1 | 2 | 3 }[], centerLabel: string): string {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (!total) return empty();
  const R = 52, C = 2 * Math.PI * R, GAP = parts.filter((p) => p.value).length > 1 ? 3 : 0;
  let offset = 0;
  const arcs = parts.filter((p) => p.value).map((p) => {
    const len = (p.value / total) * C;
    const arc = `<circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--series-${p.slot})" stroke-width="18" stroke-dasharray="${Math.max(0, len - GAP)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 70 70)"><title>${esc(`${p.label}: ${p.value} (${pct((p.value / total) * 100)})`)}</title></circle>`;
    offset += len;
    return arc;
  }).join('');
  return `<div class="donut"><svg viewBox="0 0 140 140" role="img" aria-label="${esc(centerLabel)}">${arcs}` +
    `<text x="70" y="70" class="donut-total" text-anchor="middle">${fmt(total)}</text><text x="70" y="90" class="donut-label" text-anchor="middle">${esc(centerLabel)}</text></svg>` +
    `<ul class="donut-legend">${parts.map((p) => `<li data-tip="${esc(`${p.label}: ${p.value} sessions`)}"><span class="kpi-ic slot-${p.slot}">${icon(p.ic)}</span>` +
      `<span><b>${esc(p.label)}</b><small>${fmt(p.value)} sessions</small></span><span class="donut-pct">${pct((p.value / total) * 100)}</span></li>`).join('')}</ul></div>`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Weekday by hour: one hue, fainter for fewer sessions, so the busy evenings stand out. */
export function heatmap(cells: { weekday: number; hour: number; sessions: number }[]): string {
  if (!cells.length) return empty();
  const grid = new Map(cells.map((c) => [`${c.weekday}:${c.hour}`, c.sessions]));
  const max = Math.max(1, ...cells.map((c) => c.sessions));
  const level = (n: number) => (n ? 1 + Math.min(3, Math.floor((n / max) * 4 - 1e-9)) : 0);
  // Monday first, as a week reads.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows = order.map((w) => `<div class="hm-row"><span class="hm-day">${DAYS[w]}</span>${
    Array.from({ length: 24 }, (_, h) => {
      const n = grid.get(`${w}:${h}`) ?? 0;
      return `<span class="hm-cell l${level(n)}" data-tip="${DAYS[w]} ${String(h).padStart(2, '0')}:00 · ${n} session${n === 1 ? '' : 's'}"></span>`;
    }).join('')}</div>`).join('');
  return `<div class="heatmap" role="img" aria-label="Sessions by weekday and hour"><div class="hm-row hm-hours"><span class="hm-day"></span>${
    Array.from({ length: 24 }, (_, h) => `<span class="hm-h">${h % 6 === 0 ? `${String(h).padStart(2, '0')}h` : ''}</span>`).join('')}</div>${rows}</div>` +
    `<div class="hm-legend">${icon('clock', 'ic tiny')} Chicago time <span class="hm-scale">Fewer <i class="hm-cell l1"></i><i class="hm-cell l2"></i><i class="hm-cell l3"></i><i class="hm-cell l4"></i> More</span></div>`;
}

/** Stages in order, each a share of the first, with the step-to-step conversion underneath. */
export function funnel(steps: { label: string; ic: IconName; n: number }[]): string {
  const first = steps[0]?.n ?? 0;
  if (!first) return empty('No one has opened the game in this period yet.');
  return `<div class="funnel">${steps.map((s, i) => {
    const prev = i ? steps[i - 1].n : s.n;
    const conv = i ? `${fmt(s.n)} of ${fmt(prev)} from the step before · ${pct(prev ? (s.n / prev) * 100 : 0)}` : `${fmt(s.n)} sessions start here`;
    return `<div class="fn-step" data-tip="${esc(`${s.label}: ${s.n} sessions (${pct((s.n / first) * 100)} of all)`)}"><div class="bar-line"><span class="bar-label">${icon(s.ic, 'ic step-ic')}${esc(s.label)}</span><span class="fn-n">${fmt(s.n)}</span></div>` +
      `<span class="bar-track"><span class="bar-fill" style="width:${(s.n / first) * 100}%;background:var(--seq-${Math.min(4, i)})"></span></span><span class="bar-sub">${esc(conv)}</span></div>`;
  }).join('')}</div>`;
}

export const flag = (cc: string): string =>
  /^[A-Z]{2}$/.test(cc) && cc !== 'XX' ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🏳️';

const regions = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
export const countryName = (cc: string): string => (cc === 'XX' ? 'Unknown' : regions?.of(cc) ?? cc);

/** One tooltip for the whole page, following any element with a data-tip. */
export function tooltips(root: HTMLElement): void {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  document.body.append(tip);
  const show = (e: PointerEvent) => {
    const el = (e.target as Element).closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.transform = `translate(${Math.max(8, x)}px, ${e.clientY + 16}px)`;
  };
  root.addEventListener('pointermove', show);
  // Touch screens have no hover: a tap shows the same tooltip.
  root.addEventListener('pointerdown', show);
  root.addEventListener('pointerleave', () => { tip.hidden = true; });
}
