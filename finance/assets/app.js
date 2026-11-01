/* Dashboard Finance — single page app (vanilla JS) */
(() => {
'use strict';

const S = {
  books: null, services: [], categories: [],
  view: 'overview',
  period: { mode: 'month', anchor: monthStart(new Date()) },
  incomeTab: 'projects',
  filters: { q: '', service: '', status: '', kind: '', eq: '', ecat: '' },
};
const main = document.getElementById('main');
const modal = document.getElementById('modal');

/* ---------- helpers ---------- */
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return ymd(new Date()); }
function monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
function monthEnd(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function parse(s) { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtDate(s) { if (!s) return '—'; const d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()] + ' ' + d.getFullYear(); }
function monLabel(d) { return MON[d.getMonth()] + ' ' + d.getFullYear(); }
function cur() { return S.books?.settings?.currency || 'EGP'; }
function num(n) { return Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
function money(n, small = true) { return (n < 0 ? '−' : '') + num(Math.abs(n)) + (small ? ` <small>${esc(cur())}</small>` : ' ' + cur()); }
function short(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return String(Math.round(n));
}
function sum(arr, f) { return arr.reduce((t, x) => t + (Number(f(x)) || 0), 0); }
function initials(s) { return String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase(); }
function svg(p, s = 18) { return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`; }
const IC = {
  plus: '<path d="M12 5v14M5 12h14"/>', left: '<path d="M15 18l-6-6 6-6"/>', right: '<path d="M9 18l6-6-6-6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  wallet: '<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
  up: '<path d="M7 17 17 7M8 7h9v9"/>', down: '<path d="M17 7 7 17M16 17H7V8"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
};
function toast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast on' + (err ? ' err' : '');
  clearTimeout(t._t); t._t = setTimeout(() => t.className = 'toast', 2400);
}

/* ---------- api ---------- */
async function api(op, data) {
  const r = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ csrf: FIN.csrf, op, data }) });
  if (r.status === 401) { location.href = 'index.php'; throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Could not save.');
  if (j.books) S.books = j.books;
  return j;
}
async function load() {
  const r = await fetch('api.php', { credentials: 'same-origin', cache: 'no-store' });
  if (r.status === 401) { location.href = 'index.php'; return; }
  const j = await r.json();
  S.books = j.books; S.services = j.services; S.categories = j.categories;
}

/* ---------- period ---------- */
const SPAN = { month: 1, q: 3, h: 6, year: 12 };
function range(p = S.period) {
  if (p.mode === 'all') return { from: '0000-01-01', to: '9999-12-31', label: 'All time', months: lastMonths(12) };
  let start, end;
  if (p.mode === 'year') { start = new Date(p.anchor.getFullYear(), 0, 1); end = new Date(p.anchor.getFullYear(), 11, 31); }
  else { start = addMonths(p.anchor, -(SPAN[p.mode] - 1)); end = monthEnd(p.anchor); }
  const label = p.mode === 'month' ? monLabel(p.anchor) : p.mode === 'year' ? String(p.anchor.getFullYear()) : `${MON[start.getMonth()]} – ${monLabel(p.anchor)}`;
  const months = [];
  for (let d = new Date(start); d <= end; d = addMonths(d, 1)) months.push(new Date(d));
  return { from: ymd(start), to: ymd(end), label, months: months.length < 3 ? lastMonths(6, p.anchor) : months };
}
function prevRange() {
  if (S.period.mode === 'all') return null;
  const n = S.period.mode === 'year' ? 12 : SPAN[S.period.mode];
  return range({ mode: S.period.mode, anchor: addMonths(S.period.anchor, -n) });
}
function lastMonths(n, end = monthStart(new Date())) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(addMonths(end, -i)); return out; }
function inR(d, r) { return !!d && d >= r.from && d <= r.to; }

/* ---------- derived data ---------- */
function allPayments() {
  const out = [];
  for (const p of S.books.projects) for (const x of p.payments || []) out.push({ ...x, project: p });
  return out;
}
function received(r) { return sum(allPayments().filter(x => inR(x.paid_on, r)), x => x.amount); }
function spent(r) { return sum(S.books.expenses.filter(e => inR(e.date, r)), e => e.amount); }
function projReceived(p) { return sum((p.payments || []).filter(x => x.paid_on), x => x.amount); }
function projScheduled(p) { return sum(p.payments || [], x => x.amount); }
function projRemaining(p) {
  if (p.status === 'cancelled') return 0;
  if (p.kind === 'monthly') return sum((p.payments || []).filter(x => !x.paid_on), x => x.amount);
  return Math.max(0, Math.max(p.total, projScheduled(p)) - projReceived(p));
}
function cashOnHand() {
  const s = S.books.settings, from = s.opening_date || '0000-01-01', t = today();
  const r = { from, to: t };
  return Number(s.opening_balance || 0) + received(r) - spent(r);
}
function openItems() {
  return allPayments().filter(x => !x.paid_on && x.project.status !== 'cancelled').sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
}
function pct(a, b) { if (!b) return a ? null : 0; return Math.round(((a - b) / Math.abs(b)) * 100); }
function chg(a, b, goodUp = true) {
  const p = pct(a, b);
  if (p === null) return '<span class="chip brand">new</span>';
  const good = goodUp ? p >= 0 : p <= 0;
  return `<span class="chip ${p === 0 ? '' : good ? 'up' : 'down'}">${p > 0 ? '↑' : p < 0 ? '↓' : ''} ${Math.abs(p)}%</span>`;
}

/* ---------- shell ---------- */
function setView(v) {
  if (!['overview', 'income', 'expenses', 'settings'].includes(v)) v = 'overview';
  S.view = v;
  document.querySelectorAll('.nav a').forEach(a => { const on = a.dataset.view === v; a.classList.toggle('on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
  render();
}
function render() {
  if (!S.books) return;
  ({ overview: vOverview, income: vIncome, expenses: vExpenses, settings: vSettings })[S.view]();
}
function periodCtl() {
  const r = range(), m = S.period.mode;
  const nextOff = m !== 'all' && r.to >= ymd(monthEnd(new Date()));
  return `<div class="period">
    <div class="seg" role="group" aria-label="Period">
      ${[['month', 'Month'], ['q', '3 months'], ['h', '6 months'], ['year', 'Year'], ['all', 'All']].map(([k, l]) => `<button type="button" data-mode="${k}" class="${m === k ? 'on' : ''}" aria-pressed="${m === k}">${l}</button>`).join('')}
    </div>
    ${m === 'all' ? '' : `<div class="stepper"><button type="button" data-step="-1" aria-label="Previous period">${svg(IC.left, 16)}</button><b>${esc(r.label)}</b><button type="button" data-step="1" aria-label="Next period" ${nextOff ? 'disabled' : ''}>${svg(IC.right, 16)}</button></div>`}
  </div>`;
}
function bindPeriod() {
  main.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
    S.period.mode = b.dataset.mode;
    if (S.period.mode !== 'all' && S.period.anchor > monthStart(new Date())) S.period.anchor = monthStart(new Date());
    render();
  });
  main.querySelectorAll('[data-step]').forEach(b => b.onclick = () => {
    const n = S.period.mode === 'year' ? 12 : SPAN[S.period.mode];
    S.period.anchor = addMonths(S.period.anchor, n * Number(b.dataset.step));
    render();
  });
}
function greet() { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

/* ---------- overview ---------- */
function vOverview() {
  const r = range(), pr = prevRange();
  const inc = received(r), exp = spent(r), net = inc - exp;
  const pInc = pr ? received(pr) : null, pExp = pr ? spent(pr) : null, pNet = pr ? pInc - pExp : null;
  const open = openItems(), t = today();
  const overdue = open.filter(x => x.due && x.due < t);
  const receivable = sum(S.books.projects, projRemaining);
  const cash = cashOnHand();
  const margin = inc ? Math.round((net / inc) * 100) : 0;

  main.innerHTML = `
  <div class="head">
    <div><h1>${greet()} 👋</h1><p>Here’s where Dashboard’s money stands — ${esc(r.label.toLowerCase() === 'all time' ? 'all time' : r.label)}.</p></div>
    <div class="head-actions">${periodCtl()}</div>
  </div>
  <div class="kpis">
    <div class="card kpi hero">
      <div class="kpi-top">Cash on hand <span class="kpi-ic">${svg(IC.wallet)}</span></div>
      <div class="kpi-val num">${money(cash)}</div>
      <div class="kpi-foot"><button class="btn small dark" style="background:#fff;color:var(--brand);border-color:#fff" data-add="income">${svg(IC.plus, 14)} Income</button><button class="btn small" style="background:transparent;color:#fff;border-color:rgba(255,255,255,.5)" data-add="expense">${svg(IC.plus, 14)} Expense</button></div>
    </div>
    <div class="card kpi"><div class="kpi-top">Income <span class="kpi-ic">${svg(IC.up)}</span></div><div class="kpi-val num">${money(inc)}</div><div class="kpi-foot">${pr ? chg(inc, pInc) + ' vs previous' : 'received'}</div></div>
    <div class="card kpi"><div class="kpi-top">Expenses <span class="kpi-ic">${svg(IC.down)}</span></div><div class="kpi-val num">${money(exp)}</div><div class="kpi-foot">${pr ? chg(exp, pExp, false) + ' vs previous' : 'spent'}</div></div>
    <div class="card kpi"><div class="kpi-top">Net profit <span class="kpi-ic">${svg(IC.chart)}</span></div><div class="kpi-val num ${net < 0 ? 'neg' : ''}">${money(net)}</div><div class="kpi-foot">${inc ? `<span class="chip ${margin >= 0 ? 'up' : 'down'}">${margin}% margin</span>` : ''} ${pr ? chg(net, pNet) : ''}</div></div>
    <div class="card kpi"><div class="kpi-top">Receivables <span class="kpi-ic">${svg(IC.clock)}</span></div><div class="kpi-val num">${money(receivable)}</div><div class="kpi-foot">${overdue.length ? `<span class="chip down">${overdue.length} overdue · ${short(sum(overdue, x => x.amount))}</span>` : '<span class="chip up">Nothing overdue</span>'}</div></div>
  </div>

  <div class="grid-2">
    <section class="card"><div class="card-h"><h2>Income vs expenses</h2><div class="legend"><span><i class="lg-in"></i>Income</span><span><i class="lg-out"></i>Expenses</span></div></div>${chart(r.months)}</section>
    <section class="card"><div class="card-h"><h2>Payments to collect</h2><a class="btn small ghost" href="#income">View all</a></div>${collectList(open.slice(0, 6))}</section>
  </div>

  <div class="grid-2b">
    <section class="card"><div class="card-h"><h2>Income by service</h2><span class="muted">${esc(r.label)}</span></div>${hbars(groupBy(allPayments().filter(x => inR(x.paid_on, r)), x => x.project.service), '')}</section>
    <section class="card"><div class="card-h"><h2>Expenses by category</h2><span class="muted">${esc(r.label)}</span></div>${hbars(groupBy(S.books.expenses.filter(e => inR(e.date, r)), e => e.category), 'dark')}</section>
  </div>

  <section class="card"><div class="card-h"><h2>Recent activity</h2><span class="muted">${esc(r.label)}</span></div>${activity(r)}</section>`;
  bindPeriod(); bindChart();
  main.querySelectorAll('[data-add]').forEach(b => b.onclick = () => b.dataset.add === 'income' ? projectModal() : expenseModal());
  main.querySelectorAll('[data-proj]').forEach(el => el.onclick = () => projectModal(S.books.projects.find(p => p.id === el.dataset.proj)));
  main.querySelectorAll('[data-exp]').forEach(el => el.onclick = () => expenseModal(S.books.expenses.find(e => e.id === el.dataset.exp)));
}
function groupBy(rows, key) {
  const m = new Map();
  for (const x of rows) m.set(key(x), (m.get(key(x)) || 0) + Number(x.amount || 0));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
function hbars(rows, cls) {
  if (!rows.length) return '<div class="empty">Nothing in this period yet.</div>';
  const max = rows[0][1] || 1, total = sum(rows, r => r[1]);
  return `<div class="bars">${rows.map(([k, v]) => `<div class="hb-row"><span title="${esc(k)}">${esc(k)}</span><div class="hb ${cls}"><i style="width:${Math.max(2, v / max * 100)}%"></i></div><b class="num">${short(v)} <span class="muted">${Math.round(v / total * 100)}%</span></b></div>`).join('')}</div>`;
}
function collectList(rows) {
  if (!rows.length) return '<div class="empty">No pending payments. 🎉</div>';
  const t = today(), soon = ymd(new Date(Date.now() + 7 * 864e5));
  return `<div class="list">${rows.map(x => {
    const late = x.due && x.due < t, near = !late && x.due && x.due <= soon;
    return `<div class="li" data-proj="${esc(x.project.id)}" style="cursor:pointer">
      <div class="li-ic ${late ? 'late' : near ? 'soon' : 'in'}">${esc(initials(x.project.client))}</div>
      <div class="li-main"><b>${esc(x.project.client)}</b><span>${esc(x.label || 'Payment')} · ${late ? '<span class="neg">overdue ' + fmtDate(x.due) + '</span>' : x.due ? 'due ' + fmtDate(x.due) : 'no due date'}</span></div>
      <div class="li-amt num">${num(x.amount)}<span>${esc(cur())}</span></div></div>`;
  }).join('')}</div>`;
}
function activity(r) {
  const rows = [
    ...allPayments().filter(x => inR(x.paid_on, r)).map(x => ({ type: 'in', date: x.paid_on, title: x.project.client, sub: (x.label || 'Payment') + (x.project.title ? ' · ' + x.project.title : ''), cat: x.project.service, amount: x.amount, id: x.project.id })),
    ...S.books.expenses.filter(e => inR(e.date, r)).map(e => ({ type: 'out', date: e.date, title: e.title, sub: e.vendor || e.note || '', cat: e.category, amount: e.amount, id: e.id })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  if (!rows.length) return '<div class="empty">No money in or out in this period yet. Add income or an expense to get started.</div>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Item</th><th>Category</th><th>Type</th><th class="r">Amount</th></tr></thead><tbody>
    ${rows.map(x => `<tr class="click" ${x.type === 'in' ? 'data-proj' : 'data-exp'}="${esc(x.id)}"><td class="num">${fmtDate(x.date)}</td><td><b>${esc(x.title)}</b><span class="sub">${esc(x.sub)}</span></td><td>${esc(x.cat)}</td><td><span class="chip ${x.type === 'in' ? 'up' : 'down'}">${x.type === 'in' ? 'Income' : 'Expense'}</span></td><td class="r num"><b class="${x.type === 'in' ? 'pos' : ''}">${x.type === 'in' ? '+' : '−'}${num(x.amount)}</b></td></tr>`).join('')}
  </tbody></table></div>`;
}

/* ---------- chart (SVG grouped bars) ---------- */
function chart(months) {
  const data = months.map(m => {
    const r = { from: ymd(m), to: ymd(monthEnd(m)) };
    return { m, inc: received(r), exp: spent(r) };
  });
  const W = 720, H = 260, L = 44, B = 26, T = 10, ih = H - B - T, iw = W - L - 6;
  const max = Math.max(1, ...data.map(d => Math.max(d.inc, d.exp)));
  const step = niceStep(max / 4), top = Math.ceil(max / step) * step || 1;
  const n = data.length, slot = iw / n, bw = Math.min(26, slot * 0.3), gap = Math.min(6, slot * .06);
  const y = v => T + ih - (v / top) * ih;
  let g = '';
  for (let v = 0; v <= top + 1e-9; v += step) g += `<line class="gl" x1="${L}" x2="${W}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${short(v)}</text>`;
  const bars = data.map((d, i) => {
    const cx = L + slot * i + slot / 2;
    const hi = Math.max(d.inc ? 2 : 0, (d.inc / top) * ih), he = Math.max(d.exp ? 2 : 0, (d.exp / top) * ih);
    return `<g class="col" data-i="${i}">
      <rect class="bar" x="${cx - bw - gap / 2}" y="${T + ih - hi}" width="${bw}" height="${hi}" rx="6" fill="var(--brand)"/>
      <rect class="bar" x="${cx + gap / 2}" y="${T + ih - he}" width="${bw}" height="${he}" rx="6" fill="url(#stripe)"/>
      <text class="ax" x="${cx}" y="${H - 6}" text-anchor="middle">${MON[d.m.getMonth()]}${n > 12 || d.m.getMonth() === 0 || i === 0 ? ' ’' + String(d.m.getFullYear()).slice(2) : ''}</text>
      <rect class="hit" x="${L + slot * i}" y="${T}" width="${slot}" height="${ih}"/>
    </g>`;
  }).join('');
  chart._data = data;
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly income and expenses">
    <defs><pattern id="stripe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#14151A"/><rect width="2.4" height="6" fill="#5B5E68"/></pattern></defs>
    ${g}${bars}</svg><div class="tip" id="tip"></div></div>`;
}
function niceStep(raw) { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
function bindChart() {
  const wrap = main.querySelector('.chart'); if (!wrap) return;
  const tip = wrap.querySelector('#tip');
  wrap.querySelectorAll('.col').forEach(c => {
    c.addEventListener('mouseenter', () => {
      const d = chart._data[+c.dataset.i], net = d.inc - d.exp;
      tip.innerHTML = `<b>${monLabel(d.m)}</b>Income ${num(d.inc)}<br>Expenses ${num(d.exp)}<br>Net <span style="color:${net >= 0 ? '#7CE0A9' : '#FF9B91'}">${num(net)}</span>`;
      const box = c.querySelector('.hit').getBoundingClientRect(), wb = wrap.getBoundingClientRect();
      tip.style.left = (box.left - wb.left + box.width / 2) + 'px';
      tip.style.top = (Math.min(...[...c.querySelectorAll('.bar')].map(b => b.getBoundingClientRect().top)) - wb.top - 8) + 'px';
      tip.classList.add('on');
    });
    c.addEventListener('mouseleave', () => tip.classList.remove('on'));
  });
}

/* ---------- income ---------- */
function vIncome() {
  const P = S.books.projects, f = S.filters, t = today();
  const open = openItems(), overdue = open.filter(x => x.due && x.due < t);
  const mrr = sum(P.filter(p => p.kind === 'monthly' && p.status === 'active'), p => p.monthly_fee);
  const list = P.filter(p =>
    (!f.q || (p.client + ' ' + p.title + ' ' + p.description).toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.service || p.service === f.service) && (!f.status || p.status === f.status) && (!f.kind || p.kind === f.kind)
  ).sort((a, b) => (b.start || '').localeCompare(a.start || ''));

  main.innerHTML = `
  <div class="head"><div><h1>Income</h1><p>Projects, retainers and every payment that came in.</p></div>
    <div class="head-actions"><button class="btn primary" id="add">${svg(IC.plus, 16)} Add income</button></div></div>
  <div class="mini-stats">
    <div class="card"><span>Received (all time)</span><b class="num">${money(sum(allPayments().filter(x => x.paid_on), x => x.amount))}</b></div>
    <div class="card"><span>Still to collect</span><b class="num">${money(sum(P, projRemaining))}</b></div>
    <div class="card"><span>Overdue</span><b class="num ${overdue.length ? 'neg' : ''}">${money(sum(overdue, x => x.amount))}</b></div>
    <div class="card"><span>Active retainers / month</span><b class="num">${money(mrr)}</b></div>
  </div>
  <section class="card">
    <div class="toolbar">
      <div class="seg" role="tablist"><button type="button" data-tab="projects" class="${S.incomeTab === 'projects' ? 'on' : ''}">Projects</button><button type="button" data-tab="payments" class="${S.incomeTab === 'payments' ? 'on' : ''}">Payments log</button></div>
      <div class="search">${svg(IC.search, 16)}<input id="q" type="search" placeholder="Search client or project" value="${esc(f.q)}" aria-label="Search"></div>
      <select id="fs" aria-label="Service"><option value="">All services</option>${S.services.map(s => `<option ${f.service === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
      <select id="fk" aria-label="Type"><option value="">All types</option><option value="project" ${f.kind === 'project' ? 'selected' : ''}>One-time project</option><option value="monthly" ${f.kind === 'monthly' ? 'selected' : ''}>Monthly retainer</option></select>
      ${S.incomeTab === 'projects' ? `<select id="fst" aria-label="Status"><option value="">All statuses</option>${['active', 'done', 'paused', 'cancelled'].map(s => `<option value="${s}" ${f.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select>` : ''}
    </div>
    ${S.incomeTab === 'projects' ? projectsTable(list) : paymentsTable(list)}
  </section>`;

  main.querySelector('#add').onclick = () => projectModal();
  main.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { S.incomeTab = b.dataset.tab; vIncome(); });
  const q = main.querySelector('#q');
  q.oninput = () => { f.q = q.value; const pos = q.selectionStart; vIncome(); const n = main.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); };
  main.querySelector('#fs').onchange = e => { f.service = e.target.value; vIncome(); };
  main.querySelector('#fk').onchange = e => { f.kind = e.target.value; vIncome(); };
  main.querySelector('#fst')?.addEventListener('change', e => { f.status = e.target.value; vIncome(); });
  main.querySelectorAll('[data-proj]').forEach(el => el.onclick = () => projectModal(P.find(p => p.id === el.dataset.proj)));
}
function projectsTable(list) {
  if (!list.length) return `<div class="empty">${S.books.projects.length ? 'No projects match these filters.' : 'No income yet. Click “Add income” to add your first client.'}</div>`;
  return `<div class="tbl-wrap"><table><thead><tr><th>Client / project</th><th>Service</th><th>Type</th><th class="r">Value</th><th class="r">Received</th><th class="r">Remaining</th><th>Collected</th><th>Status</th></tr></thead><tbody>
  ${list.map(p => {
    const rec = projReceived(p), rem = projRemaining(p);
    const base = p.kind === 'monthly' ? projScheduled(p) : Math.max(p.total, projScheduled(p));
    const pc = base ? Math.min(100, Math.round(rec / base * 100)) : 0;
    return `<tr class="click" data-proj="${esc(p.id)}">
      <td><b>${esc(p.client)}</b><span class="sub">${esc(p.title || p.description || '—')}</span></td>
      <td>${esc(p.service)}</td>
      <td>${p.kind === 'monthly' ? '<span class="chip brand">Monthly</span>' : '<span class="chip">Project</span>'}</td>
      <td class="r num">${p.kind === 'monthly' ? num(p.monthly_fee) + '<span class="muted">/mo</span>' : num(p.total)}</td>
      <td class="r num"><b class="pos">${num(rec)}</b></td>
      <td class="r num">${rem ? `<b>${num(rem)}</b>` : '<span class="muted">0</span>'}</td>
      <td><div class="prog"><div class="hb"><i style="width:${pc}%"></i></div><small>${pc}%</small></div></td>
      <td><span class="status st-${esc(p.status)}">${esc(p.status[0].toUpperCase() + p.status.slice(1))}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}
function paymentsTable(list) {
  const ids = new Set(list.map(p => p.id)), t = today();
  const rows = allPayments().filter(x => ids.has(x.project.id)).sort((a, b) => (b.paid_on || b.due || '').localeCompare(a.paid_on || a.due || ''));
  if (!rows.length) return '<div class="empty">No payments yet.</div>';
  return `<div class="tbl-wrap"><table><thead><tr><th>Date received</th><th>Client</th><th>Payment</th><th>Due</th><th>Status</th><th class="r">Amount</th></tr></thead><tbody>
  ${rows.map(x => {
    const st = x.paid_on ? '<span class="chip up">Received</span>' : x.due && x.due < t ? '<span class="chip down">Overdue</span>' : '<span class="chip warn">Pending</span>';
    return `<tr class="click" data-proj="${esc(x.project.id)}"><td class="num">${x.paid_on ? fmtDate(x.paid_on) : '—'}</td><td><b>${esc(x.project.client)}</b><span class="sub">${esc(x.project.title || x.project.service)}</span></td><td>${esc(x.label || 'Payment')}</td><td class="num">${fmtDate(x.due)}</td><td>${st}</td><td class="r num"><b class="${x.paid_on ? 'pos' : ''}">${num(x.amount)}</b></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

/* ---------- project modal ---------- */
function projectModal(p) {
  const isNew = !p;
  const d = p ? JSON.parse(JSON.stringify(p)) : { client: '', title: '', service: 'Website', kind: 'project', total: '', monthly_fee: '', start: today(), status: 'active', description: '', payments: [] };
  modal.innerHTML = `<form method="dialog" novalidate>
    <div class="m-head"><h2 id="modal-title">${isNew ? 'Add income' : esc(d.client)}</h2><button type="button" class="btn icon ghost" data-close aria-label="Close">${svg(IC.x)}</button></div>
    <div class="m-body">
      <div class="kind">
        <label><input type="radio" name="kind" value="project" ${d.kind === 'project' ? 'checked' : ''}><span><b>One-time project</b><small>Website, branding, app… paid in installments</small></span></label>
        <label><input type="radio" name="kind" value="monthly" ${d.kind === 'monthly' ? 'checked' : ''}><span><b>Monthly retainer</b><small>Social media, ads management… paid every month</small></span></label>
      </div>
      <div class="f-grid">
        <label>Client name<input name="client" required value="${esc(d.client)}" placeholder="e.g. Baccah Group"></label>
        <label>Project name<input name="title" value="${esc(d.title)}" placeholder="e.g. Corporate website"></label>
        <label>Service<select name="service">${S.services.map(s => `<option ${d.service === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>
        <label class="only-project">Total project value (${esc(cur())})<input name="total" type="number" min="0" step="any" inputmode="decimal" value="${esc(d.total)}" placeholder="0"></label>
        <label class="only-monthly">Monthly fee (${esc(cur())})<input name="monthly_fee" type="number" min="0" step="any" inputmode="decimal" value="${esc(d.monthly_fee)}" placeholder="0"></label>
        <label>Start date<input name="start" type="date" value="${esc(d.start)}"></label>
        <label>Status<select name="status">${['active', 'done', 'paused', 'cancelled'].map(s => `<option value="${s}" ${d.status === s ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}</select></label>
        <label class="full">Description<textarea name="description" placeholder="Scope, notes, anything useful">${esc(d.description)}</textarea></label>
      </div>
      <div class="pay-box">
        <div class="pay-head"><h3>Payments</h3><div class="acts">
          <button type="button" class="btn small only-project" data-split="50,50">Split 50 / 50</button>
          <button type="button" class="btn small only-project" data-split="30,40,30">30 / 40 / 30</button>
          <button type="button" class="btn small only-monthly" id="add-month">${svg(IC.plus, 14)} Add month</button>
          <button type="button" class="btn small" id="add-pay">${svg(IC.plus, 14)} Add payment</button>
        </div></div>
        <div class="pay-sum" id="pay-sum"></div>
        <div id="pays"></div>
      </div>
    </div>
    <div class="m-foot">${isNew ? '' : `<button type="button" class="btn danger" id="del">${svg(IC.trash, 16)} Delete</button>`}
      <div class="right"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">Save</button></div></div>
  </form>`;
  const form = modal.querySelector('form'), pays = modal.querySelector('#pays');
  const kind = () => form.kind.value;
  const syncKind = () => {
    modal.querySelectorAll('.only-project').forEach(el => el.hidden = kind() !== 'project');
    modal.querySelectorAll('.only-monthly').forEach(el => el.hidden = kind() !== 'monthly');
    if (kind() === 'monthly' && d.service === 'Website' && !d.id) form.service.value = 'Social Media';
  };
  const readRows = () => [...pays.querySelectorAll('.pay-row')].map(row => ({
    id: row.dataset.id || '', label: row.querySelector('[name=pl]').value, amount: row.querySelector('[name=pa]').value,
    due: row.querySelector('[name=pd]').value, paid_on: row.querySelector('[name=pc]').checked ? (row.querySelector('[name=pp]').value || today()) : null,
  }));
  const drawRows = rows => {
    pays.innerHTML = rows.length ? rows.map((x, i) => `<div class="pay-row ${x.paid_on ? 'is-paid' : ''}" data-id="${esc(x.id || '')}">
      <label>Payment<input name="pl" value="${esc(x.label)}" placeholder="e.g. Deposit"></label>
      <label>Amount<input name="pa" type="number" min="0" step="any" inputmode="decimal" value="${esc(x.amount)}"></label>
      <label>Due date<input name="pd" type="date" value="${esc(x.due || '')}"></label>
      <label>Received on<span class="paid-cell"><input name="pc" type="checkbox" ${x.paid_on ? 'checked' : ''} aria-label="Received"><input name="pp" type="date" value="${esc(x.paid_on || '')}" ${x.paid_on ? '' : 'disabled'}></span></label>
      <button type="button" class="btn icon ghost del" data-rm="${i}" aria-label="Remove payment">${svg(IC.trash, 16)}</button></div>`).join('')
      : '<div class="pay-empty">No payments yet — use “Split 50 / 50” or add them one by one.</div>';
    pays.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { const r = readRows(); r.splice(+b.dataset.rm, 1); drawRows(r); });
    pays.querySelectorAll('[name=pc]').forEach(c => c.onchange = () => {
      const row = c.closest('.pay-row'), dt = row.querySelector('[name=pp]');
      dt.disabled = !c.checked; if (c.checked && !dt.value) dt.value = today(); row.classList.toggle('is-paid', c.checked); drawSum();
    });
    pays.querySelectorAll('input').forEach(i => i.addEventListener('input', drawSum));
    drawSum();
  };
  const drawSum = () => {
    const r = readRows(), sch = sum(r, x => x.amount), got = sum(r.filter(x => x.paid_on), x => x.amount);
    const total = Number(form.total.value || 0);
    let extra = '';
    if (kind() === 'project' && total && Math.abs(total - sch) > 0.009) extra = `<span class="${sch > total ? 'neg' : ''}">${sch > total ? 'Over' : 'Not scheduled yet'}: <b>${num(Math.abs(total - sch))}</b></span>`;
    modal.querySelector('#pay-sum').innerHTML = `<span>Scheduled: <b class="num">${num(sch)}</b></span><span>Received: <b class="num pos">${num(got)}</b></span><span>Remaining: <b class="num">${num(Math.max(kind() === 'project' ? Math.max(total, sch) : sch, 0) - got)}</b></span>${extra}`;
  };
  drawRows(d.payments);
  syncKind();
  form.querySelectorAll('[name=kind]').forEach(r => r.onchange = () => { syncKind(); drawSum(); });
  form.total.oninput = drawSum;
  modal.querySelectorAll('[data-split]').forEach(b => b.onclick = () => {
    const total = Number(form.total.value || 0);
    if (!total) { toast('Enter the total project value first', true); form.total.focus(); return; }
    const existing = readRows();
    if (existing.some(x => x.paid_on) && !confirm('Replace the current payments? Received ones will be removed.')) return;
    const parts = b.dataset.split.split(',').map(Number), names = parts.length === 2 ? ['Deposit', 'Final payment'] : ['Deposit', 'Second payment', 'Final payment'];
    let left = total;
    drawRows(parts.map((pc, i) => { const amt = i === parts.length - 1 ? Math.round(left * 100) / 100 : Math.round(total * pc) / 100; left -= amt; return { label: `${names[i]} (${pc}%)`, amount: amt, due: i === 0 ? form.start.value : '', paid_on: null }; }));
  });
  modal.querySelector('#add-pay').onclick = () => { const r = readRows(); r.push({ label: '', amount: '', due: '', paid_on: null }); drawRows(r); pays.querySelector('.pay-row:last-child [name=pl]').focus(); };
  modal.querySelector('#add-month').onclick = () => {
    const r = readRows();
    const last = [...r].reverse().find(x => x.due);
    const base = last ? addMonths(parse(last.due), 1) : monthStart(parse(form.start.value || today()));
    const dueDay = last ? parse(last.due).getDate() : parse(form.start.value || today()).getDate();
    const due = new Date(base.getFullYear(), base.getMonth(), Math.min(dueDay, monthEnd(base).getDate()));
    r.push({ label: monLabel(due), amount: form.monthly_fee.value || '', due: ymd(due), paid_on: null });
    drawRows(r);
  };
  modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => modal.close());
  modal.querySelector('#del')?.addEventListener('click', async () => {
    if (!confirm(`Delete “${d.client}” and all its payments?`)) return;
    try { await api('delete_project', { id: d.id }); modal.close(); toast('Deleted'); render(); } catch (e) { toast(e.message, true); }
  });
  form.onsubmit = async e => {
    e.preventDefault();
    if (!form.client.value.trim()) { form.client.focus(); toast('Client name is required', true); return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await api('project', {
        id: d.id, kind: kind(), client: form.client.value, title: form.title.value, service: form.service.value,
        total: form.total.value, monthly_fee: form.monthly_fee.value, start: form.start.value, status: form.status.value,
        description: form.description.value, payments: readRows().filter(x => x.label || Number(x.amount)),
      });
      modal.close(); toast('Saved'); render();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  modal.showModal();
  if (isNew) form.client.focus();
}

/* ---------- expenses ---------- */
function vExpenses() {
  const r = range(), f = S.filters;
  const inPeriod = S.books.expenses.filter(e => inR(e.date, r));
  const list = inPeriod.filter(e => (!f.eq || (e.title + ' ' + e.vendor + ' ' + e.note).toLowerCase().includes(f.eq.toLowerCase())) && (!f.ecat || e.category === f.ecat))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.updated || '').localeCompare(a.updated || ''));
  const groups = groupBy(inPeriod, e => e.category);
  const monthsN = S.period.mode === 'all' ? Math.max(1, new Set(S.books.expenses.map(e => e.date.slice(0, 7))).size) : (S.period.mode === 'year' ? 12 : SPAN[S.period.mode]);

  main.innerHTML = `
  <div class="head"><div><h1>Expenses</h1><p>Everything the company pays for — ${esc(r.label)}.</p></div>
    <div class="head-actions">${periodCtl()}<button class="btn primary" id="add">${svg(IC.plus, 16)} Add expense</button></div></div>
  <div class="mini-stats">
    <div class="card"><span>Total spent</span><b class="num">${money(sum(inPeriod, e => e.amount))}</b></div>
    <div class="card"><span>Average / month</span><b class="num">${money(sum(inPeriod, e => e.amount) / monthsN)}</b></div>
    <div class="card"><span>Biggest category</span><b>${groups[0] ? esc(groups[0][0]) : '—'}</b></div>
    <div class="card"><span>Entries</span><b class="num">${inPeriod.length}</b></div>
  </div>
  <div class="grid-2">
    <section class="card">
      <div class="toolbar">
        <div class="search">${svg(IC.search, 16)}<input id="q" type="search" placeholder="Search expenses" value="${esc(f.eq)}" aria-label="Search"></div>
        <select id="fc" aria-label="Category"><option value="">All categories</option>${S.categories.map(c => `<option ${f.ecat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      </div>
      ${list.length ? `<div class="tbl-wrap"><table><thead><tr><th>Date</th><th>Expense</th><th>Category</th><th class="r">Amount</th></tr></thead><tbody>
        ${list.map(e => `<tr class="click" data-exp="${esc(e.id)}"><td class="num">${fmtDate(e.date)}</td><td><b>${esc(e.title)}</b><span class="sub">${esc(e.vendor || e.note || '')}</span></td><td>${esc(e.category)}</td><td class="r num"><b>${num(e.amount)}</b></td></tr>`).join('')}
      </tbody></table></div>` : `<div class="empty">${S.books.expenses.length ? 'No expenses in this period / filter.' : 'No expenses yet. Click “Add expense”.'}</div>`}
    </section>
    <section class="card"><div class="card-h"><h2>By category</h2></div>${hbars(groups, 'dark')}</section>
  </div>`;
  bindPeriod();
  main.querySelector('#add').onclick = () => expenseModal();
  const q = main.querySelector('#q');
  q.oninput = () => { f.eq = q.value; const pos = q.selectionStart; vExpenses(); const n = main.querySelector('#q'); n.focus(); n.setSelectionRange(pos, pos); };
  main.querySelector('#fc').onchange = e => { f.ecat = e.target.value; vExpenses(); };
  main.querySelectorAll('[data-exp]').forEach(el => el.onclick = () => expenseModal(S.books.expenses.find(x => x.id === el.dataset.exp)));
}
function expenseModal(x) {
  const isNew = !x || !x.id;
  const d = x || { title: '', category: 'Software & Tools', amount: '', date: today(), vendor: '', note: '' };
  modal.innerHTML = `<form method="dialog" novalidate>
    <div class="m-head"><h2 id="modal-title">${isNew ? 'Add expense' : 'Edit expense'}</h2><button type="button" class="btn icon ghost" data-close aria-label="Close">${svg(IC.x)}</button></div>
    <div class="m-body"><div class="f-grid">
      <label class="full">What was it for?<input name="title" required value="${esc(d.title)}" placeholder="e.g. Office rent, Adobe CC, laptop"></label>
      <label>Amount (${esc(cur())})<input name="amount" type="number" min="0" step="any" inputmode="decimal" required value="${esc(d.amount)}"></label>
      <label>Date paid<input name="date" type="date" value="${esc(d.date)}"></label>
      <label>Category<select name="category">${S.categories.map(c => `<option ${d.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
      <label>Paid to (optional)<input name="vendor" value="${esc(d.vendor)}" placeholder="Vendor or person"></label>
      <label class="full">Note (optional)<textarea name="note">${esc(d.note)}</textarea></label>
    </div></div>
    <div class="m-foot">${isNew ? '' : `<button type="button" class="btn danger" id="del">${svg(IC.trash, 16)} Delete</button>`}
      ${isNew ? '' : `<button type="button" class="btn" id="dup">Duplicate</button>`}
      <div class="right"><button type="button" class="btn" data-close>Cancel</button><button type="submit" class="btn primary">Save</button></div></div>
  </form>`;
  const form = modal.querySelector('form');
  modal.querySelectorAll('[data-close]').forEach(b => b.onclick = () => modal.close());
  modal.querySelector('#del')?.addEventListener('click', async () => {
    if (!confirm('Delete this expense?')) return;
    try { await api('delete_expense', { id: d.id }); modal.close(); toast('Deleted'); render(); } catch (e) { toast(e.message, true); }
  });
  modal.querySelector('#dup')?.addEventListener('click', () => { modal.close(); expenseModal({ ...d, id: undefined, date: today() }); });
  form.onsubmit = async e => {
    e.preventDefault();
    if (!form.title.value.trim()) { form.title.focus(); toast('Add what the expense was for', true); return; }
    if (!(Number(form.amount.value) > 0)) { form.amount.focus(); toast('Enter an amount', true); return; }
    const btn = form.querySelector('[type=submit]'); btn.disabled = true;
    try {
      await api('expense', { id: x?.id, title: form.title.value, amount: form.amount.value, date: form.date.value, category: form.category.value, vendor: form.vendor.value, note: form.note.value });
      modal.close(); toast('Saved'); render();
    } catch (err) { toast(err.message, true); btn.disabled = false; }
  };
  modal.showModal();
  form.title.focus();
}

/* ---------- settings ---------- */
function vSettings() {
  const s = S.books.settings;
  main.innerHTML = `
  <div class="head"><div><h1>Settings</h1><p>Starting balance, currency, password and backups.</p></div></div>
  <div class="settings">
    <section class="card"><div class="card-h"><h2>Starting balance</h2></div>
      <form id="fs">
        <p class="muted">The money the company had on a given date. Cash on hand = this balance + income received since − expenses paid since.</p>
        <label>Balance (${esc(cur())})<input name="opening_balance" type="number" step="any" inputmode="decimal" value="${esc(s.opening_balance)}"></label>
        <label>As of date<input name="opening_date" type="date" value="${esc(s.opening_date)}"></label>
        <label>Currency label<input name="currency" maxlength="6" value="${esc(s.currency)}"></label>
        <button class="btn primary" type="submit">Save</button>
      </form></section>
    <section class="card"><div class="card-h"><h2>Change password</h2></div>
      <form id="fp" autocomplete="off">
        <label>Current password<input name="current" type="password" required autocomplete="current-password"></label>
        <label>New password<input name="new" type="password" minlength="8" required autocomplete="new-password"></label>
        <button class="btn primary" type="submit">Update password</button>
      </form></section>
    <section class="card"><div class="card-h"><h2>Backup</h2></div>
      <p class="muted" style="margin-bottom:14px">A daily snapshot is saved on the server automatically. You can also download everything as a JSON file.</p>
      <a class="btn" href="api.php?export=1">Download backup</a>
      <p class="muted" style="margin-top:14px">${S.books.projects.length} projects · ${allPayments().length} payments · ${S.books.expenses.length} expenses${S.books.updated ? ' · last change ' + fmtDate(S.books.updated.slice(0, 10)) : ''}</p>
    </section>
  </div>`;
  main.querySelector('#fs').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    try { await api('settings', { opening_balance: f.opening_balance.value, opening_date: f.opening_date.value, currency: f.currency.value }); toast('Saved'); vSettings(); } catch (err) { toast(err.message, true); }
  };
  main.querySelector('#fp').onsubmit = async e => {
    e.preventDefault(); const f = e.target;
    try { await api('password', { current: f.current.value, new: f.new.value }); f.reset(); toast('Password updated'); } catch (err) { toast(err.message, true); }
  };
}

/* ---------- boot ---------- */
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });
window.addEventListener('hashchange', () => setView(location.hash.slice(1)));
load().then(() => setView(location.hash.slice(1) || 'overview')).catch(() => { main.innerHTML = '<div class="loading">Could not load data. Refresh the page.</div>'; });
})();
