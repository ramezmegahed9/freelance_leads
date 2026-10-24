(() => {
  const { leads, updated, csrf } = window.FL;
  const STATUSES = ['new', 'contacted', 'replied', 'call', 'proposal', 'won', 'lost', 'skip'];
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^https?:\/\//i.test(u || '') ? u : '';
  const digits = p => String(p).replace(/\(.*?\)/g, '').replace(/[^\d+]/g, '');
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : '';
  const uniq = k => [...new Set(leads.map(l => l[k]).filter(Boolean))].sort();
  const modal = $('#modal');
  let current = null, lang = 'en';

  $('#updated').textContent = updated ? `Last research run: ${updated}` : '';
  const fill = (sel, vals, fmt = v => v) => vals.forEach(v => $(sel).insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(fmt(v))}</option>`));
  fill('#f-status', STATUSES, cap);
  fill('#f-platform', uniq('platform'));
  fill('#f-type', uniq('type'));
  fill('#f-day', [...new Set(leads.map(l => l.added))].sort().reverse());

  const ago = d => {
    if (!d) return '';
    const days = Math.round((Date.now() - new Date(d + 'T12:00:00')) / 864e5);
    return days <= 0 ? 'today' : days === 1 ? '1 day ago' : `${days} days ago`;
  };

  function stats() {
    const has = l => (l.contacts?.emails?.length || 0) + (l.contacts?.phones?.length || 0) > 0;
    const items = [
      ['Total leads', leads.length], ['Added last run', leads.filter(l => l.added === updated).length],
      ['With email / phone', leads.filter(has).length],
      ['In pipeline', leads.filter(l => ['contacted', 'replied', 'call', 'proposal'].includes(l.status)).length],
      ['Won', leads.filter(l => l.status === 'won').length]
    ];
    $('#stats').innerHTML = items.map(([k, v]) => `<div class="stat"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  function tile(l) {
    const c = l.contacts || {};
    const ch = [c.emails?.length && 'Email', c.phones?.length && 'Phone', safeUrl(c.website) && 'Website'].filter(Boolean);
    return `<button class="tile st-${esc(l.status)}" data-id="${esc(l.id)}">
      <span class="tile-top"><span class="chip">${esc(l.platform)}</span><span class="status-dot">${esc(l.status)}</span></span>
      <span class="tile-name">${esc(l.company)}</span>
      <span class="tile-sector">${esc(l.type)}${l.country ? ' · ' + esc(l.country) : ''}</span>
      <span class="tile-sum">${esc(l.summary || l.need)}</span>
      <span class="tile-foot">${ch.map(s => `<i>${s}</i>`).join('')}<em>posted ${esc(l.posted || '?')}</em></span>
    </button>`;
  }

  function render() {
    const q = $('#q').value.trim().toLowerCase();
    const f = { platform: $('#f-platform').value, type: $('#f-type').value, status: $('#f-status').value, added: $('#f-day').value };
    const rows = leads.filter(l =>
      Object.entries(f).every(([k, v]) => !v || l[k] === v) &&
      (!q || [l.company, l.need, l.country, l.city, l.summary, (l.stack || []).join(' ')].join(' ').toLowerCase().includes(q)));
    $('#grid').innerHTML = rows.map(tile).join('');
    $('#empty').hidden = rows.length > 0;
    stats();
  }

  const link = (label, url) => { const u = safeUrl(url); return u ? `<a class="pill-link" href="${esc(u)}" target="_blank" rel="noopener">${label}</a>` : ''; };
  const msg = l => lang === 'ar' ? (l.message_ar || '') : (l.message_en || '');
  const subj = l => lang === 'ar' ? (l.email_subject_ar || l.email_subject || '') : (l.email_subject || '');

  const msgBlock = l => `
    <div class="lang"><button data-lang="en" class="${lang === 'en' ? 'on' : ''}">English</button><button data-lang="ar" class="${lang === 'ar' ? 'on' : ''}">عربي</button></div>
    <div class="msg" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" lang="${lang}"><p>${esc(msg(l)).replace(/\n/g, '<br>')}</p><button class="btn small" data-copy="message">${lang === 'ar' ? 'نسخ الرسالة' : 'Copy message'}</button></div>`;

  function detail(l) {
    const c = l.contacts || {}, s = l.source || {};
    const emails = c.emails || [], phones = c.phones || [];
    const links = [link('Website', c.website), link('LinkedIn', c.linkedin), link('Facebook', c.facebook), link('Instagram', c.instagram), link('Other', c.other)].filter(Boolean).join('');
    const mailto = e => `mailto:${encodeURIComponent(e)}?subject=${encodeURIComponent(subj(l))}&body=${encodeURIComponent(msg(l))}`;
    const wa = p => `https://wa.me/${digits(p).replace('+', '')}?text=${encodeURIComponent(msg(l))}`;
    const opts = STATUSES.map(x => `<option value="${x}" ${x === l.status ? 'selected' : ''}>${cap(x)}</option>`).join('');
    const tab = current._tab || 'overview';
    const on = t => tab === t ? 'class="on"' : '';
    const hid = t => tab === t ? '' : 'hidden';

    return `
      <header class="m-head">
        <div>
          <div class="m-tags"><span class="chip">${esc(l.platform)}</span><span class="chip soft">${esc(l.type)}</span><span class="muted">posted ${esc(l.posted || '?')} · ${ago(l.posted)}</span></div>
          <h2 id="m-title">${esc(l.company)}</h2>
          <p class="muted">${[l.country, l.city, l.budget && 'Budget: ' + l.budget].filter(Boolean).map(esc).join(' · ')}</p>
        </div>
        <button class="x" data-close aria-label="Close">×</button>
      </header>

      <nav class="tabs" role="tablist">
        <button role="tab" ${on('overview')} data-tab="overview">Overview</button>
        <button role="tab" ${on('email')} data-tab="email">Email <small>${emails.length}</small></button>
        <button role="tab" ${on('mobile')} data-tab="mobile">Mobile <small>${phones.length}</small></button>
        <button role="tab" ${on('source')} data-tab="source">Source</button>
      </nav>

      <section class="pane" data-pane="overview" ${hid('overview')}>
        ${(l.stack || []).length ? `<div class="services">${l.stack.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
        <h3>What they need</h3><p>${esc(l.need)}</p>
        <h3>Contact person</h3><p>${esc([c.name, c.role].filter(Boolean).join(' — ') || '—')}</p>
        ${links ? `<div class="links">${links}</div>` : ''}
        <h3>Message</h3>${msgBlock(l)}
      </section>

      <section class="pane" data-pane="email" ${hid('email')}>
        ${emails.length ? emails.map(e => `<div class="row"><a href="mailto:${esc(e)}">${esc(e)}</a><span><button class="btn small" data-copy-text="${esc(e)}">Copy</button> <a class="btn small dark" href="${esc(mailto(e))}">Open email</a></span></div>`).join('')
          : `<p class="muted">No public email in the post. Reply on the source post or use Mobile.</p>`}
        <h3>Subject</h3>
        <div class="row"><span dir="auto">${esc(subj(l))}</span><button class="btn small" data-copy="subject">Copy</button></div>
        <h3>Message</h3>${msgBlock(l)}
      </section>

      <section class="pane" data-pane="mobile" ${hid('mobile')}>
        ${phones.length ? phones.map(p => `<div class="row"><a href="tel:${esc(digits(p))}">${esc(p)}</a><span><button class="btn small" data-copy-text="${esc(p)}">Copy</button> <a class="btn small dark" target="_blank" rel="noopener" href="${esc(wa(p))}">WhatsApp</a></span></div>`).join('')
          : `<p class="muted">No public number in the post.</p>`}
        ${safeUrl(c.whatsapp) ? `<div class="row"><span>WhatsApp link</span><a class="btn small dark" target="_blank" rel="noopener" href="${esc(c.whatsapp)}">Open</a></div>` : ''}
        <h3>Message</h3>${msgBlock(l)}
      </section>

      <section class="pane" data-pane="source" ${hid('source')}>
        <div class="src">
          <span class="muted">${esc(s.platform || l.platform)} · ${esc(s.date || l.posted || '')}${s.poster ? ' · by ' + esc(s.poster) : ''}</span>
          <b>${esc(s.title || 'Original post')}</b>
          ${s.excerpt ? `<p dir="auto">${esc(s.excerpt)}</p>` : ''}
          ${safeUrl(s.url) ? `<a class="btn small dark" href="${esc(s.url)}" target="_blank" rel="noopener">Open original post</a>` : ''}
        </div>
        ${(l.extra_sources || []).length ? `<ul class="ev">${l.extra_sources.map(e => `<li>${link(esc(e.title), e.url) || esc(e.title)} <span class="muted">${esc(e.date || '')}</span></li>`).join('')}</ul>` : ''}
      </section>

      <footer class="m-foot">
        <label>Status<select class="status">${opts}</select></label>
        <label class="grow">Notes<textarea class="note" rows="2" placeholder="Who you spoke to, price sent, next step…">${esc(l.note)}</textarea></label>
      </footer>`;
  }

  function paint() { $('#m-body').innerHTML = detail(current); }
  function open(id) {
    current = leads.find(l => l.id === id);
    if (!current) return;
    current._tab = 'overview';
    paint(); modal.showModal();
  }

  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => el.hidden = true, 1800); }
  const copy = t => navigator.clipboard.writeText(t).then(() => toast('Copied'));

  async function save(patch) {
    const l = current;
    try {
      const r = await fetch('api.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, csrf, ...patch }) });
      if (!r.ok) throw new Error(r.status);
      Object.assign(l, patch); render(); toast('Saved');
    } catch (e) { toast('Could not save. Please log in again'); }
  }

  $('#grid').addEventListener('click', e => { const t = e.target.closest('.tile'); if (t) open(t.dataset.id); });

  modal.addEventListener('click', e => {
    if (e.target === modal || e.target.closest('[data-close]')) return modal.close();
    const tab = e.target.closest('[data-tab]');
    if (tab) { current._tab = tab.dataset.tab; return paint(); }
    const lg = e.target.closest('[data-lang]');
    if (lg) { lang = lg.dataset.lang; return paint(); }
    const c = e.target.closest('[data-copy],[data-copy-text]');
    if (c) copy(c.dataset.copyText ?? (c.dataset.copy === 'subject' ? subj(current) : msg(current)));
  });
  modal.addEventListener('change', e => {
    if (e.target.matches('.status')) save({ status: e.target.value });
    if (e.target.matches('.note')) save({ note: e.target.value });
  });

  ['#q', '#f-platform', '#f-type', '#f-status', '#f-day'].forEach(s => $(s).addEventListener('input', render));
  render();
})();
