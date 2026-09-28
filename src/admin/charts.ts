/**
 * Small chart kit for the dashboard: HTML bars and one SVG column chart, every mark with a hover
 * tooltip and every chart with a table view. Values are always printed in text ink, never in the
 * series colour, and the three categorical slots are the validated reference palette.
 */

export const esc = (v: unknown): string =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

export const fmt = (n: number | null | undefined, digits = 0): string =>
  n === null || n === undefined ? '–' : n.toLocaleString('en-US', { maximumFractionDigits: digits });

export const pct = (n: number | null | undefined): string => (n === null || n === undefined ? '–' : `${fmt(n, 1)}%`);

export interface Series { key: string; label: string; slot: 1 | 2 | 3 }

/** A card with a title, a one-line reading hint, the chart, and a collapsible table of the same numbers. */
export function card(title: string, hint: string, chart: string, table: string, wide = false): string {
  return `<section class="card${wide ? ' wide' : ''}"><h2>${esc(title)}</h2><p class="hint">${esc(hint)}</p>${chart}` +
    `<details class="table-view"><summary>Table</summary>${table}</details></section>`;
}

export function table(head: string[], rows: (string | number)[][]): string {
  return `<table><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${esc(c)}</td>`).join('')}</tr>`).join('')
  }</tbody></table>`;
}

/** Horizontal bars for one measure: magnitude reads from length against a shared max. */
export function bars(items: { label: string; value: number; text: string; tip: string }[], opts: { max?: number; ordinal?: boolean } = {}): string {
  if (!items.length) return empty();
  const max = opts.max ?? Math.max(1, ...items.map((i) => i.value));
  return `<div class="bars">${items.map((i, n) => {
    const w = Math.max(0, Math.min(100, (i.value / max) * 100));
    // Ordinal stages (the funnel) step down one hue; everything else is the single series colour.
    const fill = opts.ordinal ? `var(--seq-${Math.min(4, n)})` : 'var(--series-1)';
    return `<div class="bar-row" data-tip="${esc(i.tip)}"><span class="bar-label">${esc(i.label)}</span>` +
      `<span class="bar-track"><span class="bar-fill" style="width:${w}%;background:${fill}"></span></span><span class="bar-value">${esc(i.text)}</span></div>`;
  }).join('')}</div>`;
}

/** Part-to-whole per row: segments separated by a surface gap, with a legend and counts in text. */
export function stacked(rows: { label: string; parts: Record<string, number>; note?: string }[], series: Series[], unit = ''): string {
  if (!rows.some((r) => Object.values(r.parts).some((v) => v > 0))) return empty();
  const legend = `<div class="legend">${series.map((s) => `<span><i style="background:var(--series-${s.slot})"></i>${esc(s.label)}</span>`).join('')}</div>`;
  return legend + `<div class="bars">${rows.map((r) => {
    const total = series.reduce((a, s) => a + (r.parts[s.key] ?? 0), 0);
    const segs = total ? series.filter((s) => (r.parts[s.key] ?? 0) > 0).map((s) => {
      const v = r.parts[s.key] ?? 0;
      return `<span class="seg" style="flex:${v};background:var(--series-${s.slot})" data-tip="${esc(`${r.label} · ${s.label}: ${fmt(v, 1)}${unit} (${pct((v / total) * 100)})`)}"></span>`;
    }).join('') : '';
    const text = r.note ?? series.map((s) => fmt(r.parts[s.key] ?? 0, 1) + unit).join(' / ');
    return `<div class="bar-row"><span class="bar-label">${esc(r.label)}</span><span class="bar-track stack">${segs}</span><span class="bar-value">${esc(text)}</span></div>`;
  }).join('')}</div>`;
}

/** Columns over days, one series, drawn in HTML so its text stays at reading size at any width. */
export function columns(days: { date: string; value: number; tip: string }[]): string {
  if (!days.some((d) => d.value > 0)) return empty();
  const max = Math.max(1, ...days.map((d) => d.value));
  return `<div class="columns" role="img" aria-label="Sessions per day"><span class="col-max">max ${fmt(max)}</span><div class="col-plot">${
    days.map((d) => `<span class="col" data-tip="${esc(d.tip)}"><span class="col-fill" style="height:${(d.value / max) * 100}%"></span></span>`).join('')
  }</div><div class="col-axis"><span>${esc(days[0].date)}</span><span>${esc(days[days.length - 1].date)}</span></div></div>`;
}

export function tile(label: string, value: string, sub = ''): string {
  return `<div class="tile"><div class="tile-label">${esc(label)}</div><div class="tile-value">${esc(value)}</div>${sub ? `<div class="tile-sub">${esc(sub)}</div>` : ''}</div>`;
}

const empty = (): string => '<p class="empty">No data in this period yet.</p>';

/** One tooltip for the whole page, following any element with a data-tip. */
export function tooltips(root: HTMLElement): void {
  const tip = document.createElement('div');
  tip.className = 'tooltip';
  tip.hidden = true;
  document.body.append(tip);
  root.addEventListener('pointermove', (e) => {
    const el = (e.target as Element).closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.getAttribute('data-tip');
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.transform = `translate(${Math.max(8, x)}px, ${e.clientY + 16}px)`;
  });
  root.addEventListener('pointerleave', () => { tip.hidden = true; });
}
