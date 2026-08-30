/* =========================================================================
   MERIDIAN — prototype application shell, router and views.
   Vanilla JS, no build step, no external runtime dependencies.
   ========================================================================= */
(function () {
'use strict';

const D = window.DB;
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

/* ------------------------------------------------------------ formatting */
// Indian digit grouping, always 2 decimals for money.
function inr(n, dp) {
  dp = dp === undefined ? 2 : dp;
  const neg = n < 0; n = Math.abs(n);
  let [i, f] = n.toFixed(dp).split('.');
  let last3 = i.slice(-3), rest = i.slice(0, -3);
  if (rest) last3 = ',' + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const out = rest + last3 + (f ? '.' + f : '');
  return (neg ? '−' : '') + out;
}
const cr  = (n) => inr(n / 1e7, 2);                       // rupees → crore
const sgn = (n, dp) => (n > 0 ? '+' : n < 0 ? '−' : '') + inr(Math.abs(n), dp === undefined ? 2 : dp);
const initials = (s) => s.replace(/[^A-Za-z ]/g, '').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

function toast(msg) {
  const t = $('#toast');
  t.innerHTML = '<span class="dot dot--pine"></span>' + esc(msg);
  t.hidden = false; requestAnimationFrame(() => t.classList.add('on'));
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.hidden = true, 220); }, 2600);
}

/* --------------------------------------------------------------- icons */
const I = {
  grid:  '<path d="M2 2h5v5H2zM9 2h5v5H9zM2 9h5v5H2zM9 9h5v5H9z" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  users: '<circle cx="6" cy="5.5" r="2.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.6 14c.4-2.7 2.3-4.2 4.4-4.2S10 11.3 10.4 14M11 4.2a2.3 2.3 0 010 4.5M12.2 13.9c-.2-1.6-.8-2.9-1.8-3.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  card:  '<rect x="1.5" y="3.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M1.5 6.8h13" stroke="currentColor" stroke-width="1.4"/>',
  book:  '<path d="M2.5 2.5h5c1 0 1.5.6 1.5 1.4v9.6c0-.8-.5-1.4-1.5-1.4h-5zM13.5 2.5h-5c-1 0-1.5.6-1.5 1.4v9.6c0-.8.5-1.4 1.5-1.4h5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
  send:  '<path d="M14 2L1.8 7.2l4.6 1.6M14 2L9.5 14l-3.1-5.2M14 2L6.4 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  close: '<path d="M2.5 2.5h11v11h-11z" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5 8.2l2 2 4-4.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  shield:'<path d="M8 1.6l5 1.9v4c0 3.3-2.1 5.6-5 6.9-2.9-1.3-5-3.6-5-6.9v-4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  tick:  '<path d="M1.5 5.2l2.6 2.9L8.7 1.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  up:    '<path d="M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 2.5v7M5 5.5L8 2.5l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
};

/* ------------------------------------------------------------ navigation */
const ROUTES = [
  { g:'Operate',  id:'dashboard', t:'Dashboard',        ic:'grid'  },
  { g:'Operate',  id:'customers', t:'Customer 360',     ic:'users' },
  { g:'Operate',  id:'accounts',  t:'Accounts & deposits', ic:'card' },
  { g:'Operate',  id:'payments',  t:'Payments',         ic:'send', badge:3 },
  { g:'Control',  id:'ledger',    t:'General ledger',   ic:'book'  },
  { g:'Control',  id:'close',     t:'Financial close',  ic:'close' },
  { g:'Control',  id:'audit',     t:'Audit & security', ic:'shield'}
];

function buildNav() {
  const nav = $('#nav'); nav.innerHTML = '';
  let last = null;
  ROUTES.forEach(r => {
    if (r.g !== last) { nav.appendChild(el(`<div class="navgroup__t">${esc(r.g)}</div>`)); last = r.g; }
    const b = el(
      `<button class="navlink" data-route="${r.id}">
         <svg viewBox="0 0 16 16" aria-hidden="true">${I[r.ic]}</svg>
         <span>${esc(r.t)}</span>
         ${r.badge ? `<span class="badge">${r.badge}</span>` : ''}
       </button>`);
    b.addEventListener('click', () => { location.hash = '#/' + r.id; });
    nav.appendChild(b);
  });
}

/* ----------------------------------------------------------------- chart */
/* Two series, one shared axis (both ₹ crore). Legend + direct end labels +
   crosshair tooltip. Grid recessive, marks thin. */
function lineChart(opts) {
  const W = 100, H = 34;                             // viewBox units
  const pad = { l: 7, r: 19, t: 3, b: 6 };           // right pad carries the end labels
  const series = opts.series, labels = opts.labels;
  const all = series.flatMap(s => s.v);
  const lo = Math.min(...all), hi = Math.max(...all);
  const min = lo - (hi - lo) * 0.30, max = hi + (hi - lo) * 0.14;
  const x = i => pad.l + i * (W - pad.l - pad.r) / (labels.length - 1);
  const y = v => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);

  const ticks = 4, tickVals = [];
  for (let i = 0; i <= ticks; i++) tickVals.push(min + (max - min) * i / ticks);

  const wrap = el(`<div class="chart"></div>`);
  const legend = el(`<div class="legend">${series.map(s =>
    `<span class="legend__i"><span class="legend__s" style="background:${s.c}"></span>${esc(s.n)}</span>`).join('')}</div>`);
  wrap.appendChild(legend);

  const svg = el(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.alt || '')}"></svg>`);
  const ns = 'http://www.w3.org/2000/svg';
  const mk = (n, a) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); return e; };

  tickVals.forEach(v => {
    svg.appendChild(mk('line', { class:'gridline', x1:pad.l, x2:W - pad.r, y1:y(v), y2:y(v) }));
    const t = mk('text', { x:pad.l - 1.6, y:y(v) + 1, 'text-anchor':'end', class:'axis' });
    t.textContent = Math.round(v / 1000) + 'k';
    t.setAttribute('style','font-size:2.4px;fill:#8A9099');
    svg.appendChild(t);
  });

  labels.forEach((l, i) => {
    if (i % 2) return;
    const t = mk('text', { x:x(i), y:H - 0.8, 'text-anchor':'middle' });
    t.textContent = l;
    t.setAttribute('style','font-size:2.5px;fill:#8A9099');
    svg.appendChild(t);
  });

  // Lines only — two overlapping area fills read as banding and obscure the
  // gap between the series, which is the thing the chart is actually about.
  series.forEach(s => {
    const d = s.v.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(' ');
    svg.appendChild(mk('path', { d, class:'dataline', stroke:s.c }));
    // direct end label — identity never rests on colour alone
    const lastI = s.v.length - 1;
    svg.appendChild(mk('circle', { cx:x(lastI), cy:y(s.v[lastI]), r:'0.62', fill:s.c,
                                   stroke:'#fff', 'stroke-width':'2', 'vector-effect':'non-scaling-stroke' }));
    const lab = mk('text', { x:x(lastI) + 1.7, y:y(s.v[lastI]) + 0.95, class:'endlbl' });
    lab.textContent = inr(s.v[lastI], 0);
    lab.setAttribute('style', `font-size:2.7px;font-weight:600;fill:${s.c}`);
    svg.appendChild(lab);
  });

  const cross = mk('line', { class:'crosshair', y1:pad.t, y2:H - pad.b, x1:0, x2:0 });
  svg.appendChild(cross);
  const dots = series.map(s => { const c = mk('circle', { r:'0.8', fill:s.c, stroke:'#fff',
    'stroke-width':'2', 'vector-effect':'non-scaling-stroke', opacity:'0' }); svg.appendChild(c); return c; });

  wrap.appendChild(svg);
  const tip = el('<div class="chart__tip"></div>'); wrap.appendChild(tip);

  const hit = mk('rect', { x:0, y:0, width:W, height:H, fill:'transparent' });
  svg.appendChild(hit);

  function move(ev) {
    const r = svg.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width * W;
    let i = Math.round((px - pad.l) / ((W - pad.l - pad.r) / (labels.length - 1)));
    i = Math.max(0, Math.min(labels.length - 1, i));
    cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.classList.add('on');
    dots.forEach((c, k) => { c.setAttribute('cx', x(i)); c.setAttribute('cy', y(series[k].v[i])); c.setAttribute('opacity','1'); });
    tip.innerHTML = `<div class="t">${esc(labels[i])}-2026</div>` + series.map(s =>
      `<div class="r"><span><span class="legend__s" style="display:inline-block;background:${s.c};margin-right:6px"></span>${esc(s.n)}</span><b>₹${inr(s.v[i],0)} Cr</b></div>`).join('');
    tip.style.left = (x(i) / W * 100) + '%';
    tip.style.top  = (y(Math.max(...series.map(s => s.v[i]))) / H * 100) + '%';
    tip.classList.add('on');
  }
  svg.addEventListener('mousemove', move);
  svg.addEventListener('mouseleave', () => {
    cross.classList.remove('on'); tip.classList.remove('on'); dots.forEach(c => c.setAttribute('opacity','0'));
  });
  return wrap;
}

function spark(vals, colour) {
  const W = 200, H = 26, lo = Math.min(...vals), hi = Math.max(...vals);
  const x = i => i * W / (vals.length - 1);
  const y = v => H - 3 - (hi === lo ? 0.5 : (v - lo) / (hi - lo)) * (H - 10);
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return `<svg class="stat__spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${d} L${W} ${H} L0 ${H} Z" fill="${colour}" opacity=".07"/>
    <path d="${d}" fill="none" stroke="${colour}" stroke-width="1.3" vector-effect="non-scaling-stroke"
          stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

/* ================================ VIEWS ================================= */
const V = {};

/* ------------------------------------------------------------- dashboard */
V.dashboard = () => {
  const wrap = el('<div></div>');
  wrap.appendChild(el(`
    <div class="phead rv">
      <div>
        <h1>Operations dashboard</h1>
        <p>Position as at close of business 29-Aug-2026, with intraday movement to 14:45 IST. All figures on the bank's base currency, INR.</p>
      </div>
      <div class="phead__act">
        <div class="seg"><button class="on">Bank</button><button>Region</button><button>Branch</button></div>
        <button class="btn btn--line btn--sm">Export</button>
      </div>
    </div>`));

  const cols = ['#127A5B', '#2C6FB0', '#AD7A10', '#2C6FB0', '#127A5B', '#A32C1E'];
  const kpi = el('<div class="grid grid--kpi rv"></div>');
  D.kpis.forEach((k, i) => {
    const good = k.inverse ? k.d < 0 : k.d > 0;
    kpi.appendChild(el(`
      <div class="stat">
        <div class="stat__k">${esc(k.k)}</div>
        <div class="stat__v">${k.u === '%' ? inr(k.v, 2) : '₹' + inr(k.v, 0)}<span class="u">${k.u === '%' ? '%' : ' Cr'}</span></div>
        <div class="stat__d"><span class="chg ${good ? 'chg--up' : 'chg--dn'}">${sgn(k.d, 2)}${k.u === '%' ? ' pp' : '%'}</span> ${esc(k.note)}</div>
        ${spark(k.spark, cols[i % cols.length])}
      </div>`));
  });
  wrap.appendChild(kpi);

  /* main row */
  const row = el('<div class="grid grid--2 rv"></div>');

  const chartPanel = el(`
    <div class="panel">
      <div class="panel__h">
        <h3>Deposits and advances</h3>
        <span class="sub">₹ crore · 12 months to Aug-2026</span>
        <div class="right"><span class="sub">hover the plot for monthly figures</span></div>
      </div>
      <div class="panel__b"></div>
    </div>`);
  $('.panel__b', chartPanel).appendChild(lineChart({
    labels: D.months,
    alt: 'Deposits grew from 41,820 to 50,240 crore; advances from 31,240 to 37,940 crore over twelve months.',
    series: [
      { n:'Deposits', v:D.deposits, c:'#127A5B' },
      { n:'Advances', v:D.advances, c:'#2C6FB0' }
    ]
  }));
  const credGap = D.deposits.map((d, i) => d - D.advances[i]);
  $('.panel__b', chartPanel).appendChild(el(`
    <div style="display:flex;gap:26px;margin-top:14px;padding-top:13px;border-top:1px solid var(--rule-2);font-size:12px;color:var(--ink-2)">
      <span>Credit–deposit ratio <b class="mono" style="color:var(--ink)">${(D.advances[11] / D.deposits[11] * 100).toFixed(1)}%</b></span>
      <span>Funding surplus <b class="mono" style="color:var(--ink)">₹${inr(credGap[11], 0)} Cr</b></span>
      <span>Deposit growth (12m) <b class="mono" style="color:var(--pine)">+${((D.deposits[11] / D.deposits[0] - 1) * 100).toFixed(1)}%</b></span>
    </div>`));
  row.appendChild(chartPanel);

  /* right column: close ring + funding mix */
  const rc = el('<div class="grid" style="gap:16px;align-content:start"></div>');
  const done = D.closeTasks.filter(t => t.done).length, total = D.closeTasks.length;
  const pct = done / total, C = 2 * Math.PI * 42;
  rc.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>August close</h3><div class="right"><span class="tag tag--warn">In progress</span></div></div>
      <div class="panel__b">
        <div class="ring">
          <svg viewBox="0 0 104 104">
            <circle class="ring__bg" cx="52" cy="52" r="42"></circle>
            <circle class="ring__fg" cx="52" cy="52" r="42" stroke-dasharray="${C}" stroke-dashoffset="${C}"></circle>
          </svg>
          <div>
            <div class="ring__c">${done}<span style="color:var(--ink-3)">/${total}</span></div>
            <div class="ring__l">tasks complete<br><span style="color:var(--ink-3)">Controller and CFO sign-off outstanding</span></div>
          </div>
        </div>
      </div>
    </div>`));

  // ₹ crore, taken straight from the deposit lines of the trial balance
  const bal = ac => (D.trialBalance.find(r => r.ac === ac) || { cr:0 }).cr / 1e7;
  const mix = [
    { k:'Term deposits', v:bal('21400'), c:'#127A5B' },
    { k:'Savings',       v:bal('21200'), c:'#2C6FB0' },
    { k:'Current',       v:bal('21001'), c:'#AD7A10' }
  ];
  const mixMax = Math.max(...mix.map(m => m.v));
  rc.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>Funding mix</h3><span class="sub">₹ crore</span></div>
      <div class="panel__b">
        ${mix.map(m => `
          <div class="hbar">
            <span class="hbar__k">${esc(m.k)}</span>
            <div class="hbar__t"><div class="hbar__f" style="width:0;background:${m.c}" data-w="${(m.v / mixMax * 100).toFixed(1)}%"></div></div>
            <span class="hbar__v">${inr(m.v, 0)}</span>
          </div>`).join('')}
        <p style="font-size:11.5px;color:var(--ink-3);margin-top:10px">Values shown in ₹ crore. CASA ratio 43.8%.</p>
      </div>
    </div>`));
  row.appendChild(rc);
  wrap.appendChild(row);

  /* exception queue */
  const sev = s => s === 'high' ? '<span class="tag tag--bad">High</span>' : s === 'med' ? '<span class="tag tag--warn">Medium</span>' : '<span class="tag tag--mute">Low</span>';
  wrap.appendChild(el(`
    <div class="panel rv" style="margin-top:16px">
      <div class="panel__h">
        <h3>Exception queue</h3>
        <span class="sub">${D.exceptions.length} open items requiring disposition</span>
        <div class="right">
          <div class="seg"><button class="on">All</button><button>Mine</button><button>Overdue</button></div>
        </div>
      </div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Reference</th><th>Type</th><th>Severity</th><th>Detail</th><th>Owner</th><th>Ageing</th><th></th></tr></thead>
          <tbody>
            ${D.exceptions.map(e => `
              <tr>
                <td class="id">${esc(e.id)}</td>
                <td>${esc(e.type)}</td>
                <td>${sev(e.sev)}</td>
                <td>${esc(e.desc)}<span class="sub2">${esc(e.ent)}</span></td>
                <td>${esc(e.owner)}</td>
                <td class="num">${esc(e.age)}</td>
                <td style="text-align:right"><button class="btn btn--line btn--sm" data-ack="${esc(e.id)}">Assign</button></td>
              </tr>`).join('')}
          </tbody>
        </table></div>
      </div>
    </div>`));

  setTimeout(() => {
    $('.ring__fg', wrap).style.strokeDashoffset = C * (1 - pct);
    $$('.hbar__f', wrap).forEach(f => f.style.width = f.dataset.w);
  }, 60);
  wrap.addEventListener('click', e => {
    const b = e.target.closest('[data-ack]');
    if (b) { b.textContent = 'Assigned'; b.disabled = true; toast(b.dataset.ack + ' assigned to you'); }
  });
  return wrap;
};

/* ------------------------------------------------------------- customers */
V.customers = () => {
  const wrap = el('<div></div>');
  wrap.appendChild(el(`
    <div class="phead rv">
      <div><h1>Customer 360</h1><p>A single record per customer across every product, with KYC state, risk rating, screening outcome and relationship exposure on one screen.</p></div>
      <div class="phead__act"><button class="btn btn--line btn--sm">Filter</button><button class="btn btn--primary btn--sm">New customer</button></div>
    </div>`));

  const row = el('<div class="grid grid--2 rv"></div>');
  const kycTag = k => k === 'Verified' ? '<span class="tag tag--ok">Verified</span>' : k === 'Pending' ? '<span class="tag tag--warn">Pending</span>' : '<span class="tag tag--bad">Review due</span>';
  const riskTag = r => r === 'Low' ? '<span class="tag tag--ok">Low</span>' : r === 'Medium' ? '<span class="tag tag--warn">Medium</span>' : '<span class="tag tag--bad">High</span>';

  const list = el(`
    <div class="panel">
      <div class="panel__h"><h3>Customers</h3><span class="sub">${D.customers.length} of 1,284,110 · select a row</span></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>CIF</th><th>Name</th><th>Segment</th><th>KYC</th><th>Risk</th><th class="num">Exposure ₹Cr</th></tr></thead>
          <tbody>${D.customers.map((c, i) => `
            <tr class="is-click" data-i="${i}">
              <td class="id">${esc(c.id)}</td>
              <td>${esc(c.name)}<span class="sub2">${esc(c.type)} · RM ${esc(c.rm)}</span></td>
              <td>${esc(c.seg)}</td>
              <td>${kycTag(c.kyc)}</td>
              <td>${riskTag(c.risk)}</td>
              <td class="num">${inr(c.exposure.dep + c.exposure.adv, 2)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`);
  row.appendChild(list);

  const detail = el('<div id="cdet"></div>');
  row.appendChild(detail);
  wrap.appendChild(row);

  function render(i) {
    const c = D.customers[i];
    detail.innerHTML = '';
    detail.appendChild(el(`
      <div class="panel">
        <div class="panel__h">
          <div class="avat">${initials(c.name)}</div>
          <div><h3>${esc(c.name)}</h3><span class="sub">${esc(c.id)} · customer since ${esc(c.since)}</span></div>
        </div>
        <div class="panel__b">
          <dl class="kv">
            <dt>Type</dt><dd>${esc(c.type)} · ${esc(c.seg)}</dd>
            <dt>KYC</dt><dd>${kycTag(c.kyc)} &nbsp; Risk ${riskTag(c.risk)}</dd>
            <dt>Screening</dt><dd>${c.screening === 'Clear' ? '<span class="tag tag--ok">Clear</span>' : `<span class="tag tag--bad">${esc(c.screening)}</span>`}</dd>
            <dt>Tax ID</dt><dd class="mono">${esc(c.pan)}</dd>
            <dt>Jurisdiction</dt><dd>${esc(c.country)}</dd>
            <dt>Contact</dt><dd class="mono" style="font-size:11.5px">${esc(c.contact.ph)}<br>${esc(c.contact.em)}</dd>
            <dt>Address</dt><dd>${esc(c.contact.addr)}</dd>
          </dl>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">
            <div style="border:1px solid var(--rule);border-radius:3px;padding:11px 13px">
              <div class="stat__k">Deposits</div><div class="mono" style="font-size:18px;margin-top:5px">₹${inr(c.exposure.dep, 2)} Cr</div>
            </div>
            <div style="border:1px solid var(--rule);border-radius:3px;padding:11px 13px">
              <div class="stat__k">Advances</div><div class="mono" style="font-size:18px;margin-top:5px">₹${inr(c.exposure.adv, 2)} Cr</div>
            </div>
          </div>
        </div>
      </div>`));

    const accs = D.accounts.filter(a => a.cif === c.id);
    detail.appendChild(el(`
      <div class="panel" style="margin-top:16px">
        <div class="panel__h"><h3>Linked accounts</h3><span class="sub">${accs.length}</span></div>
        <div class="panel__b panel__b--flush">
          ${accs.length ? `<div class="tw"><table class="tbl">
            <thead><tr><th>Account</th><th>Product</th><th>Ccy</th><th class="num">Balance</th></tr></thead>
            <tbody>${accs.map(a => `<tr><td class="id">${esc(a.no)}</td><td>${esc(a.prod)}</td><td class="mono">${esc(a.cur)}</td>
              <td class="num ${a.bal < 0 ? 'neg' : ''}">${inr(a.bal, 2)}</td></tr>`).join('')}</tbody></table></div>`
            : '<div class="empty">No accounts opened yet.</div>'}
        </div>
      </div>`));

    detail.appendChild(el(`
      <div class="panel" style="margin-top:16px">
        <div class="panel__h"><h3>Documents on file</h3><span class="sub">${c.docs.length}</span></div>
        <div class="panel__b">
          <ul class="files" style="margin:0">
            ${c.docs.map(d => `<li><span class="dot dot--blue"></span><span class="fn">${esc(d)}</span><span class="fs">PDF</span></li>`).join('')}
          </ul>
          ${c.kyc !== 'Verified' ? `<div class="note" style="margin-top:13px"><div><strong>Action required.</strong> Re-KYC is outstanding. Outward payments above ₹50,000 are held pending refresh.</div></div>` : ''}
        </div>
      </div>`));
  }

  list.addEventListener('click', e => {
    const tr = e.target.closest('tr[data-i]'); if (!tr) return;
    $$('tr[data-i]', list).forEach(r => r.style.background = '');
    tr.style.background = 'var(--brass-w)';
    render(+tr.dataset.i);
  });
  render(0);
  const first = $('tr[data-i="0"]', list); if (first) first.style.background = 'var(--brass-w)';
  return wrap;
};

/* -------------------------------------------------------------- accounts */
V.accounts = () => {
  const wrap = el('<div></div>');
  const totals = D.accounts.reduce((a, x) => { x.bal >= 0 ? a.d += x.bal : a.l += -x.bal; return a; }, { d:0, l:0 });
  wrap.appendChild(el(`
    <div class="phead rv">
      <div><h1>Accounts &amp; deposits</h1><p>Current, savings, term deposit and loan accounts on one product engine. Balances are live against the general ledger — no overnight batch to wait for.</p></div>
      <div class="phead__act"><button class="btn btn--line btn--sm">Open account</button></div>
    </div>`));

  const st = s => s === 'Active' ? '<span class="tag tag--ok">Active</span>' : s === 'Dormant' ? '<span class="tag tag--mute">Dormant</span>' : '<span class="tag tag--warn">Restricted</span>';
  wrap.appendChild(el(`
    <div class="grid grid--3 rv" style="margin-bottom:16px">
      <div class="stat"><div class="stat__k">Accounts in view</div><div class="stat__v">${D.accounts.length}</div><div class="stat__d">of 2,041,880 bank-wide</div></div>
      <div class="stat"><div class="stat__k">Credit balances</div><div class="stat__v" style="font-size:21px">₹${inr(totals.d, 2)}</div><div class="stat__d">deposit liabilities</div></div>
      <div class="stat"><div class="stat__k">Debit balances</div><div class="stat__v" style="font-size:21px">₹${inr(totals.l, 2)}</div><div class="stat__d">advances drawn</div></div>
    </div>`));

  wrap.appendChild(el(`
    <div class="panel rv">
      <div class="panel__h"><h3>Account register</h3><div class="right"><div class="seg"><button class="on">All</button><button>Deposits</button><button>Loans</button></div></div></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Account number</th><th>Holder</th><th>Product</th><th>Branch</th><th>Ccy</th><th class="num">Balance</th><th>Status</th></tr></thead>
          <tbody>${D.accounts.map(a => `
            <tr class="${a.no === 'SB 4021 0099 1187' ? 'is-click' : ''}" ${a.no === 'SB 4021 0099 1187' ? 'data-stmt="1"' : ''}>
              <td class="id">${esc(a.no)}</td>
              <td>${esc(a.nm)}<span class="sub2">${esc(a.cif)}</span></td>
              <td>${esc(a.prod)}</td>
              <td class="mono" style="font-size:11.5px">${esc(a.br)}</td>
              <td class="mono">${esc(a.cur)}</td>
              <td class="num ${a.bal < 0 ? 'neg' : ''}">${inr(a.bal, 2)}</td>
              <td>${st(a.st)}</td>
            </tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`));

  const s = D.statement['SB 4021 0099 1187'];
  wrap.appendChild(el(`
    <div class="panel rv" style="margin-top:16px">
      <div class="panel__h">
        <h3>Statement — SB 4021 0099 1187</h3><span class="sub">Vasanth R. Menon · last 6 movements</span>
        <div class="right"><button class="btn btn--line btn--sm">Download PDF</button></div>
      </div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Date</th><th>Reference</th><th>Narrative</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
          <tbody>${s.map(r => `
            <tr><td class="mono" style="font-size:11.5px">${esc(r.d)}</td><td class="id">${esc(r.ref)}</td><td>${esc(r.nar)}</td>
              <td class="num">${r.dr ? inr(r.dr, 2) : '—'}</td>
              <td class="num cr">${r.cr ? inr(r.cr, 2) : '—'}</td>
              <td class="num">${inr(r.bal, 2)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`));
  return wrap;
};

/* ---------------------------------------------------------------- ledger */
V.ledger = () => {
  const wrap = el('<div></div>');
  wrap.appendChild(el(`
    <div class="phead rv">
      <div><h1>General ledger</h1><p>Every posting is double entry and append-only. Entries are never edited or deleted — a correction is a reversal that posts its own entry. Each entry carries the hash of the one before it, so any tampering breaks the chain.</p></div>
      <div class="phead__act"><button class="btn btn--line btn--sm" id="verify">Verify chain</button><button class="btn btn--line btn--sm">Export journal</button></div>
    </div>`));

  wrap.appendChild(el(`
    <div class="grid grid--3 rv" style="margin-bottom:16px">
      <div class="stat"><div class="stat__k">Entries today</div><div class="stat__v">417</div><div class="stat__d">across 9 posting engines</div></div>
      <div class="stat"><div class="stat__k">Out of balance</div><div class="stat__v" style="color:var(--pine)">0</div><div class="stat__d">enforced at post time, not at close</div></div>
      <div class="stat"><div class="stat__k">Chain status</div><div class="stat__v" style="font-size:19px" id="chainstat">Not verified</div><div class="stat__d">last verified 30-Aug 06:00 by SYS.BATCH</div></div>
    </div>`));

  const panel = el(`
    <div class="panel rv">
      <div class="panel__h"><h3>Journal</h3><span class="sub">most recent first · business date 30-Aug-2026</span>
        <div class="right"><span class="tag tag--mute">Append-only</span></div></div>
      <div class="panel__b panel__b--flush"><div class="spine"></div></div>
    </div>`);
  const spine = $('.spine', panel);

  D.journal.forEach(j => {
    const dr = j.legs.reduce((a, l) => a + l.dr, 0), crT = j.legs.reduce((a, l) => a + l.cr, 0);
    spine.appendChild(el(`
      <div class="jentry">
        <div class="jentry__chain">
          <span class="jentry__node"></span>
          <div class="jentry__hash">
            <span class="lbl">Entry hash</span><b>${esc(j.hash)}</b>
            <span class="lbl" style="margin-top:7px;display:block">Previous</span>${esc(j.prev)}
          </div>
        </div>
        <div class="jentry__body">
          <div class="jentry__top">
            <span class="jentry__ref">${esc(j.ref)}</span>
            ${j.rev ? '<span class="tag tag--warn">Reversal</span>' : ''}
            <span class="tag tag--mute">${esc(j.src)}</span>
            <span class="jentry__when">${esc(j.ts)}</span>
          </div>
          <p class="jentry__nar" style="margin-bottom:9px">${esc(j.nar)}</p>
          <table class="legs">
            ${j.legs.map(l => `<tr>
              <td class="acct" style="width:70px">${esc(l.ac)}</td>
              <td class="nm">${esc(l.nm)}</td>
              <td class="num" style="width:130px">${l.dr ? inr(l.dr, 2) : ''}</td>
              <td class="num cr" style="width:130px">${l.cr ? inr(l.cr, 2) : ''}</td>
            </tr>`).join('')}
          </table>
          <div class="balrow"><span>Debits <b>${inr(dr, 2)}</b></span><span>Credits <b>${inr(crT, 2)}</b></span>
            <span>Difference <b style="color:${dr === crT ? 'var(--pine)' : 'var(--oxblood)'}">${inr(dr - crT, 2)}</b></span></div>
        </div>
      </div>`));
  });
  wrap.appendChild(panel);

  wrap.addEventListener('click', e => {
    if (!e.target.closest('#verify')) return;
    const nodes = $$('.jentry', wrap);
    nodes.forEach(n => n.classList.remove('ok'));
    $('#chainstat', wrap).textContent = 'Verifying…';
    nodes.forEach((n, i) => setTimeout(() => {
      n.classList.add('ok');
      if (i === nodes.length - 1) {
        $('#chainstat', wrap).innerHTML = '<span style="color:var(--pine)">Verified</span>';
        toast('Hash chain verified — ' + nodes.length + ' entries, no breaks');
      }
    }, 130 * i));
  });
  return wrap;
};

/* -------------------------------------------------------------- payments */
V.payments = () => {
  const wrap = el('<div></div>');
  wrap.appendChild(el(`
    <div class="phead rv">
      <div><h1>Payments</h1><p>One hub for every rail. Maker-checker is enforced by the platform: an operator can never release a payment they created, regardless of role or limit.</p></div>
      <div class="phead__act"><button class="btn btn--primary btn--sm">New payment</button></div>
    </div>`));

  const stTag = s => ({
    'Pending approval':'<span class="tag tag--warn">Pending approval</span>',
    'Approved':'<span class="tag tag--info">Approved</span>',
    'Settled':'<span class="tag tag--ok">Settled</span>',
    'Rejected':'<span class="tag tag--bad">Rejected</span>'
  })[s] || '';

  const pending = D.payments.filter(p => p.st === 'Pending approval');
  wrap.appendChild(el(`
    <div class="grid grid--3 rv" style="margin-bottom:16px">
      <div class="stat"><div class="stat__k">Awaiting approval</div><div class="stat__v">${pending.length}</div><div class="stat__d">oldest 47 minutes</div></div>
      <div class="stat"><div class="stat__k">Value pending</div><div class="stat__v" style="font-size:20px">₹${inr(pending.filter(p=>p.ccy==='INR').reduce((a,p)=>a+p.amt,0),0)}</div><div class="stat__d">INR leg only</div></div>
      <div class="stat"><div class="stat__k">Straight-through rate</div><div class="stat__v">96.4<span class="u">%</span></div><div class="stat__d">rolling 30 days</div></div>
    </div>`));

  const panel = el(`
    <div class="panel rv">
      <div class="panel__h"><h3>Payment queue</h3><span class="sub">signed in as OPS.RMENON — Payments Checker</span>
        <div class="right"><div class="seg"><button class="on">All rails</button><button>RTGS</button><button>NEFT</button><button>SWIFT</button></div></div></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Reference</th><th>Rail</th><th>Beneficiary</th><th class="num">Amount</th><th>Maker</th><th>Status</th><th>Control</th><th></th></tr></thead>
          <tbody>${D.payments.map(p => {
            const self = p.maker === 'OPS.RMENON';
            const act = p.st !== 'Pending approval'
              ? '<span style="color:var(--ink-3);font-size:11.5px">—</span>'
              : self
                ? '<span class="tag tag--mute" title="Segregation of duties">Blocked — own entry</span>'
                : `<button class="btn btn--pine btn--sm" data-app="${esc(p.id)}">Approve</button> <button class="btn btn--danger btn--sm" data-rej="${esc(p.id)}">Reject</button>`;
            return `<tr data-row="${esc(p.id)}">
              <td class="id">${esc(p.id)}</td>
              <td><span class="tag tag--mute">${esc(p.rail)}</span></td>
              <td>${esc(p.ben)}<span class="sub2 mono">${esc(p.bank)}</span></td>
              <td class="num">${esc(p.ccy)} ${inr(p.amt, 2)}</td>
              <td class="mono" style="font-size:11.5px">${esc(p.maker)}<span class="sub2">${esc(p.made)}</span></td>
              <td data-st>${stTag(p.st)}</td>
              <td style="max-width:230px;font-size:11.5px;color:var(--ink-2)">${esc(p.risk)}</td>
              <td style="text-align:right;white-space:nowrap" data-act>${act}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    </div>`);
  wrap.appendChild(panel);

  wrap.appendChild(el(`
    <div class="note rv" style="margin-top:16px">
      <div><strong>Why PAY-2026-0083310 cannot be approved here.</strong> It was created by OPS.RMENON, the operator currently signed in. Segregation of duties is enforced in the platform rather than in the user interface, so the block holds even if the request is replayed directly against the API.</div>
    </div>`));

  panel.addEventListener('click', e => {
    const a = e.target.closest('[data-app]'), r = e.target.closest('[data-rej]');
    const id = a ? a.dataset.app : r ? r.dataset.rej : null;
    if (!id) return;
    const tr = $(`tr[data-row="${id}"]`, panel);
    $('[data-st]', tr).innerHTML = a ? stTag('Approved') : stTag('Rejected');
    $('[data-act]', tr).innerHTML = '<span style="color:var(--ink-3);font-size:11.5px">—</span>';
    toast(id + (a ? ' approved and released' : ' rejected — maker notified'));
  });
  return wrap;
};

/* --------------------------------------------------------- financial close */
V.close = () => {
  const wrap = el('<div></div>');
  const drT = D.trialBalance.reduce((a, r) => a + r.dr, 0);
  const crT = D.trialBalance.reduce((a, r) => a + r.cr, 0);
  const done = D.closeTasks.filter(t => t.done).length;

  wrap.appendChild(el(`
    <div class="phead rv">
      <div><h1>Financial close</h1><p>Period close as a tracked workflow rather than a spreadsheet. Every task has an owner, a state and its supporting evidence attached to the task itself, so the audit file assembles as the close runs.</p></div>
      <div class="phead__act"><div class="seg"><button class="on">Aug-2026</button><button>Jul-2026</button></div><button class="btn btn--primary btn--sm">Submit for sign-off</button></div>
    </div>`));

  wrap.appendChild(el(`
    <div class="grid grid--3 rv" style="margin-bottom:16px">
      <div class="stat"><div class="stat__k">Tasks complete</div><div class="stat__v">${done}<span class="u">/ ${D.closeTasks.length}</span></div><div class="stat__d">3 blocking sign-off</div></div>
      <div class="stat"><div class="stat__k">Trial balance</div><div class="stat__v" style="font-size:19px;color:var(--pine)">In balance</div><div class="stat__d">difference ₹${inr(drT - crT, 2)}</div></div>
      <div class="stat"><div class="stat__k">Evidence attached</div><div class="stat__v">${D.closeTasks.reduce((a, t) => a + t.ev, 0)}</div><div class="stat__d">documents across ${D.closeTasks.filter(t => t.ev).length} tasks</div></div>
    </div>`));

  const row = el('<div class="grid grid--2 rv"></div>');

  row.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>Trial balance</h3><span class="sub">all accounts · INR</span>
        <div class="right"><span class="tag tag--ok">Dr = Cr</span></div></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>GL</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
          <tbody>
            ${D.trialBalance.map(r => `<tr><td class="id">${esc(r.ac)}</td><td>${esc(r.nm)}</td>
              <td class="num">${r.dr ? inr(r.dr, 2) : '—'}</td>
              <td class="num cr">${r.cr ? inr(r.cr, 2) : '—'}</td></tr>`).join('')}
            <tr style="background:var(--panel-2);font-weight:600">
              <td></td><td>Total</td><td class="num">${inr(drT, 2)}</td><td class="num">${inr(crT, 2)}</td></tr>
          </tbody>
        </table></div>
      </div>
    </div>`));

  const right = el('<div class="grid" style="gap:16px;align-content:start"></div>');
  right.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>Close checklist</h3><span class="sub">${done} of ${D.closeTasks.length}</span></div>
      <div class="panel__b panel__b--flush">
        <ul class="checklist">
          ${D.closeTasks.map(t => `<li class="${t.done ? 'done' : ''}">
            <span class="box"><svg viewBox="0 0 10 10">${I.tick}</svg></span>
            <span class="t">${esc(t.t)}</span>
            ${t.ev ? `<span class="tag tag--info">${t.ev} doc${t.ev > 1 ? 's' : ''}</span>` : ''}
            <span class="own">${esc(t.own)}</span>
          </li>`).join('')}
        </ul>
      </div>
    </div>`));

  right.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>Supporting documents</h3><span class="sub">attach evidence to “Suspense account clearance”</span></div>
      <div class="panel__b">
        <div class="drop" id="drop">
          <svg viewBox="0 0 16 16"><path d="M8 11V2.5M4.8 5.7L8 2.5l3.2 3.2M2 11v2.5h12V11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <p>Drop files here, or click to browse</p>
          <small>PDF, XLSX, CSV, PNG · up to 25 MB · retained with the period</small>
        </div>
        <input type="file" id="fin" multiple hidden>
        <ul class="files" id="flist"></ul>
      </div>
    </div>`));
  row.appendChild(right);
  wrap.appendChild(row);

  /* upload behaviour */
  const drop = $('#drop', wrap), fin = $('#fin', wrap), flist = $('#flist', wrap);
  const size = b => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';
  function add(files) {
    Array.from(files).forEach(f => {
      const li = el(`<li><span class="dot dot--pine"></span><span class="fn">${esc(f.name)}</span><span class="fs">${size(f.size)}</span><button class="x" aria-label="Remove">✕</button></li>`);
      $('.x', li).addEventListener('click', () => li.remove());
      flist.appendChild(li);
    });
    if (files.length) toast(files.length + ' document' + (files.length > 1 ? 's' : '') + ' attached to the close task');
  }
  drop.addEventListener('click', () => fin.click());
  fin.addEventListener('change', () => add(fin.files));
  ['dragenter','dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => add(e.dataTransfer.files));
  return wrap;
};

/* ----------------------------------------------------------------- audit */
V.audit = () => {
  const wrap = el('<div></div>');
  wrap.appendChild(el(`
    <div class="phead rv">
      <div><h1>Audit &amp; security</h1><p>Controls an examiner will ask about, surfaced as live state rather than a policy document. The audit trail is append-only and hash-chained on the same mechanism as the general ledger.</p></div>
      <div class="phead__act"><button class="btn btn--line btn--sm">Export evidence pack</button></div>
    </div>`));

  const row = el('<div class="grid grid--2 rv"></div>');
  const res = r => r === 'OK' ? '<span class="tag tag--ok">OK</span>' : '<span class="tag tag--bad">Denied</span>';
  row.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>Audit trail</h3><span class="sub">append-only · 8 of 41,208 events today</span></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Timestamp</th><th>Actor</th><th>Action</th><th>Object</th><th>Source</th><th>Result</th></tr></thead>
          <tbody>${D.audit.map(a => `<tr>
            <td class="mono" style="font-size:11px">${esc(a.ts)}</td>
            <td class="mono" style="font-size:11.5px">${esc(a.who)}</td>
            <td class="mono" style="font-size:11.5px">${esc(a.act)}</td>
            <td>${esc(a.obj)}</td>
            <td class="mono" style="font-size:11.5px;color:var(--ink-3)">${esc(a.ip)}</td>
            <td>${res(a.res)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`));

  const okc = D.controls.filter(c => c.ok).length;
  row.appendChild(el(`
    <div class="panel">
      <div class="panel__h"><h3>Control state</h3><span class="sub">${okc} of ${D.controls.length} green</span></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Control</th><th>Implementation</th><th>State</th></tr></thead>
          <tbody>${D.controls.map(c => `<tr>
            <td>${esc(c.c)}</td>
            <td style="color:var(--ink-2)">${esc(c.s)}</td>
            <td>${c.ok ? '<span class="tag tag--ok">Green</span>' : '<span class="tag tag--warn">Open</span>'}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`));
  wrap.appendChild(row);

  wrap.appendChild(el(`
    <div class="panel rv" style="margin-top:16px">
      <div class="panel__h"><h3>Role matrix</h3><span class="sub">least privilege · every role carries its own MFA requirement and transaction ceiling</span></div>
      <div class="panel__b panel__b--flush">
        <div class="tw"><table class="tbl">
          <thead><tr><th>Role</th><th>Permissions</th><th>Authentication</th><th class="num">Users</th><th>Ceiling</th></tr></thead>
          <tbody>${D.roles.map(r => `<tr>
            <td><strong>${esc(r.r)}</strong></td>
            <td style="color:var(--ink-2)">${r.perms.map(p => `<span class="tag tag--mute" style="margin:1px 3px 1px 0">${esc(p)}</span>`).join('')}</td>
            <td class="mono" style="font-size:11.5px">${esc(r.mfa)}</td>
            <td class="num">${r.users}</td>
            <td style="font-size:11.5px;color:var(--ink-2)">${esc(r.limit)}</td></tr>`).join('')}</tbody>
        </table></div>
      </div>
    </div>`));

  wrap.appendChild(el(`
    <div class="note rv" style="margin-top:16px">
      <div><strong>Prototype scope.</strong> The control table describes the target design for the production build, not the state of this demonstration environment. Penetration testing is deliberately shown as open — it is a scheduled activity, not a code feature, and the roadmap treats it as a release gate.</div>
    </div>`));
  return wrap;
};

/* ---------------------------------------------------------------- router */
function showApp() { $('#auth').hidden = true; $('#app').hidden = false; }

function route() {
  // A deep link (#/ledger, #/close …) must land on the screen itself, whether it
  // arrives as a fresh page load or as a hash change from the sign-in screen.
  if (location.hash.indexOf('#/') === 0) showApp();
  const id = (location.hash.replace('#/', '') || 'dashboard');
  const r = ROUTES.find(x => x.id === id) ? id : 'dashboard';
  $$('.navlink').forEach(b => b.classList.toggle('is-on', b.dataset.route === r));
  const view = $('#view');
  view.innerHTML = '';
  view.appendChild(V[r]());
  view.scrollTop = 0;
  window.scrollTo(0, 0);
  document.title = 'MERIDIAN — ' + (ROUTES.find(x => x.id === r) || {}).t;
}

/* -------------------------------------------------------------- guilloche */
function guilloche() {
  const svg = $('.guilloche'); if (!svg) return;
  const ns = 'http://www.w3.org/2000/svg';
  const cx = 300, cy = 400;
  for (let k = 0; k < 46; k++) {
    const p = document.createElementNS(ns, 'ellipse');
    p.setAttribute('cx', cx); p.setAttribute('cy', cy);
    p.setAttribute('rx', 120 + k * 5.2); p.setAttribute('ry', 300 - k * 2.4);
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '0.6');
    p.setAttribute('transform', `rotate(${k * 7.8} ${cx} ${cy})`);
    svg.appendChild(p);
  }
}

/* ------------------------------------------------------------------ auth */
function initAuth() {
  const step = n => $$('.step').forEach(s => s.hidden = (+s.dataset.step !== n));

  $('#go-mfa').addEventListener('click', () => {
    if (!$('#f-user').value.trim()) { $('#f-user').focus(); return; }
    step(2); setTimeout(() => $('#otp input').focus(), 60);
  });
  $('#back-1').addEventListener('click', () => step(1));

  const boxes = $$('#otp input');
  boxes.forEach((b, i) => {
    b.addEventListener('input', () => {
      b.value = b.value.replace(/\D/g, '').slice(0, 1);
      if (b.value && i < boxes.length - 1) boxes[i + 1].focus();
      if (boxes.every(x => x.value)) setTimeout(submitOtp, 120);
    });
    b.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !b.value && i) boxes[i - 1].focus();
    });
    b.addEventListener('paste', e => {
      const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      if (!t) return;
      e.preventDefault();
      t.split('').forEach((c, k) => { if (boxes[k]) boxes[k].value = c; });
      if (t.length === 6) setTimeout(submitOtp, 120);
      else boxes[Math.min(t.length, 5)].focus();
    });
  });

  function submitOtp() {
    const code = boxes.map(b => b.value).join('');
    if (code !== '123456') {
      $('#otp-err').hidden = false;
      boxes.forEach(b => b.value = ''); boxes[0].focus();
      return;
    }
    $('#otp-err').hidden = true;
    enterApp();
  }
  $('#go-app').addEventListener('click', submitOtp);

  // TOTP countdown — cosmetic, shows the factor is time-based
  let c = 24;
  setInterval(() => { c = c <= 1 ? 30 : c - 1; const n = $('#otp-count'); if (n) n.textContent = c; }, 1000);
}

function enterApp() {
  showApp();
  if (location.hash.indexOf('#/') !== 0) location.hash = '#/dashboard'; else route();
  toast('Signed in as OPS.RMENON — Operations Manager');
}

/* ------------------------------------------------------------------ boot */
buildNav();
guilloche();
initAuth();
window.addEventListener('hashchange', route);
$('#signout').addEventListener('click', () => {
  $('#app').hidden = true; $('#auth').hidden = false;
  $$('#otp input').forEach(b => b.value = '');
  $$('.step').forEach(s => s.hidden = (+s.dataset.step !== 1));
  // drop the deep link so a reload does not walk straight back into the session
  history.replaceState(null, '', location.pathname + location.search);
});
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); const s = $('.topbar__search input'); if (s) s.focus(); }
});

// Deep link straight into a screen (used for screenshots and demos).
if (location.hash && location.hash.startsWith('#/')) enterApp();

})();
