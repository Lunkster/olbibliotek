// Fliken "Borde testa": ölförslag från Supabase-vyn dryck.v_forslag (via exporten).
(() => {
  const BUTIKER = [
    { namn: 'Jönköping, Bataljonsgatan 5', url: 'https://www.systembolaget.se/butiker-ombud/butik/jonkopings-lan/jonkoping/bataljonsgatan-5-0601/' },
    { namn: 'Jönköping, Fiskargränd 5', url: 'https://www.systembolaget.se/butiker-ombud/butik/jonkopings-lan/jonkoping/fiskargrand-5-0602/' },
    { namn: 'Habo, Jönköpingsvägen 7 B', url: 'https://www.systembolaget.se/butiker-ombud/butik/jonkopings-lan/habo/jonkopingsvagen-7-b-0604/' },
  ];
  const STEG = 100;
  const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf1 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf0 = new Intl.NumberFormat('sv-SE');

  function el(tag, attrs = {}, ...barn) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
    }
    for (const b of barn) if (b !== null && b !== undefined) e.append(b);
    return e;
  }
  const lank = (href, text, cls) => el('a', { href, target: '_blank', rel: 'noopener', class: cls, text });

  window.__startForslag = ({ forslag = [], venuer = [] } = {}) => {
    forslag.forEach((r, i) => { r.rang = i + 1; });
    const ob = document.querySelector('#dash-root .ob');
    const head = ob.querySelector('.ob-head');
    const seg = head.querySelector('.ob-seg');

    // Flikar
    const knappStat = el('button', { type: 'button', role: 'tab', text: 'Statistik' });
    const knappForslag = el('button', { type: 'button', role: 'tab', text: 'Borde testa' });
    const nav = el('nav', { class: 'ob-tabs', role: 'tablist', 'aria-label': 'Vy' }, knappStat, knappForslag);
    head.after(nav);

    // Sektion
    const venueText = venuer.map((v) => v.ol
      ? `${v.namn} (${nf0.format(v.ol)} öl, meny ${v.uppdaterad || 'okänt datum'})`
      : `${v.namn} (ingen meny i Untappd)`);
    const selVar = el('select', { class: 'ob-select', 'aria-label': 'Var' },
      el('option', { value: '', text: 'Alla förslag' }),
      el('option', { value: '*', text: 'Finns på något av dina ställen' }),
      ...venuer.filter((v) => v.ol).map((v) => el('option', { value: v.namn, text: `Finns på ${v.namn}` })));
    const stilar = [...new Set(forslag.map((r) => r.stilfamilj).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'));
    const selStil = el('select', { class: 'ob-select', 'aria-label': 'Öltyp' },
      el('option', { value: '', text: 'Alla öltyper' }), ...stilar.map((s) => el('option', { value: s, text: s })));
    const sok = el('input', { class: 'ob-search', type: 'search', placeholder: 'Sök öl eller bryggeri', 'aria-label': 'Sök öl eller bryggeri' });
    const antal = el('span', { class: 'ob-count' });
    // Sortering: klick på rubrik sorterar, klick igen vänder. Text stigande först, siffror fallande först.
    const KOLUMNER = [
      { nyckel: 'rang', text: '#', cls: 'ob-rank', typ: 'tal', start: 'asc' },
      { nyckel: 'namn', text: 'Öl', typ: 'text' },
      { nyckel: 'stil', text: 'Stil', cls: 'ob-hide-narrow', typ: 'text' },
      { nyckel: 'abv', text: 'ABV', cls: 'num ob-hide-narrow', typ: 'tal' },
      { nyckel: 'globalt', text: 'Untappd', cls: 'num', typ: 'tal' },
      { nyckel: 'antal_betyg', text: 'Antal betyg', cls: 'num ob-hide-narrow', typ: 'tal' },
      { nyckel: 'finns_pa', text: 'Finns på', cls: 'ob-hide-narrow', typ: 'text' },
      { nyckel: null, text: 'Systembolaget' },
    ];
    const sortering = { nyckel: 'rang', riktning: 'asc' };
    const rubriker = [];
    function rubrik(k) {
      if (!k.nyckel) return el('th', { class: k.cls, text: k.text });
      const knapp = el('button', { type: 'button', text: k.text });
      const th = el('th', { class: k.cls, 'aria-sort': k.nyckel === 'rang' ? 'ascending' : 'none' }, knapp);
      knapp.addEventListener('click', () => {
        if (sortering.nyckel === k.nyckel) sortering.riktning = sortering.riktning === 'asc' ? 'desc' : 'asc';
        else { sortering.nyckel = k.nyckel; sortering.riktning = k.start || (k.typ === 'text' ? 'asc' : 'desc'); }
        rubriker.forEach(([kk, t]) => t.setAttribute('aria-sort', kk.nyckel !== sortering.nyckel ? 'none' : sortering.riktning === 'asc' ? 'ascending' : 'descending'));
        visas = STEG; rita();
      });
      rubriker.push([k, th]);
      return th;
    }
    const jamfor = (a, b) => {
      const k = KOLUMNER.find((x) => x.nyckel === sortering.nyckel);
      const va = a[k.nyckel], vb = b[k.nyckel];
      if (va == null || va === '') return vb == null || vb === '' ? a.rang - b.rang : 1;  // tomma sist
      if (vb == null || vb === '') return -1;
      const d = k.typ === 'text' ? String(va).localeCompare(String(vb), 'sv') : va - vb;
      return (sortering.riktning === 'asc' ? d : -d) || a.rang - b.rang;
    };
    const tbody = el('tbody');
    const mer = el('button', { type: 'button', class: 'ob-btn', text: 'Visa fler' });
    const sec = el('section', { class: 'ob-card ob-forslag', id: 'forslag' },
      el('h2', { text: 'Borde testa' }),
      el('p', { class: 'ob-note', text: 'Öl du inte druckit, rangordnade efter vad du brukar gilla: Untappds betyg (vägt mot hur många som betygsatt), dina favoritstilar, favoritbryggerier och humle, och öl som liknar sådant du gett högt betyg. Öl som finns på dina ställen får ett litet plus. Toppen läggs automatiskt i din önskelista i Untappd.' }),
      el('p', { class: 'ob-note' }, 'Bevakade ställen: ', venueText.join(' · ') || '—'),
      el('p', { class: 'ob-note' }, 'Systembolaget delar inte längre sitt sortiment maskinellt, så ”Sök” öppnar en sökning där du ser lagret i dina butiker: ',
        ...BUTIKER.flatMap((b, i) => [i ? ', ' : '', lank(b.url, b.namn)])),
      el('div', { class: 'ob-tools' }, selVar, selStil, sok, antal),
      el('div', { class: 'ob-tablewrap' }, el('table', { class: 'ob-table' },
        el('thead', {}, el('tr', {}, ...KOLUMNER.map(rubrik))),
        tbody)),
      el('div', { class: 'ob-tools' }, mer));
    ob.append(sec);

    const statDelar = [...ob.children].filter((c) => c !== head && c !== nav && c !== sec);
    let visas = STEG;

    function urval() {
      const q = sok.value.trim().toLowerCase();
      return forslag.filter((r) =>
        (!selVar.value || (selVar.value === '*' ? r.finns_pa : (r.finns_pa || '').split(', ').includes(selVar.value))) &&
        (!selStil.value || r.stilfamilj === selStil.value) &&
        (!q || `${r.namn} ${r.bryggeri || ''}`.toLowerCase().includes(q)));
    }
    function rita() {
      const rader = urval().sort(jamfor);
      antal.textContent = `Visar ${nf0.format(Math.min(visas, rader.length))} av ${nf0.format(rader.length)}`;
      tbody.replaceChildren(...rader.slice(0, visas).map((r) => {
        const namn = el('div', {}, lank(r.url, r.namn, 'ob-link'));
        if (r.pa_onskelistan) namn.append(' ', el('span', { class: 'ob-badge', text: 'Önskelista' }));
        const info = el('td', {}, namn, el('div', { class: 'ob-muted', text: [r.bryggeri, r.land].filter(Boolean).join(', ') }));
        if (r.varfor) info.append(el('div', { class: 'ob-why', text: r.varfor }));
        return el('tr', {},
          el('td', { class: 'ob-rank ob-muted', text: String(r.rang) }),
          info,
          el('td', { class: 'ob-hide-narrow ob-muted', text: r.stil || '' }),
          el('td', { class: 'num ob-hide-narrow', text: r.abv == null ? '–' : nf1.format(r.abv) + ' %' }),
          el('td', { class: 'num', text: r.globalt == null ? '–' : nf2.format(r.globalt) }),
          el('td', { class: 'num ob-hide-narrow ob-muted', text: r.antal_betyg == null ? '–' : nf0.format(r.antal_betyg) }),
          el('td', { class: 'ob-hide-narrow ob-muted', text: r.finns_pa || '' }),
          el('td', {}, lank(r.systembolaget, 'Sök', 'ob-link')));
      }));
      mer.hidden = rader.length <= visas;
    }
    [selVar, selStil].forEach((s) => s.addEventListener('change', () => { visas = STEG; rita(); }));
    sok.addEventListener('input', () => { visas = STEG; rita(); });
    mer.addEventListener('click', () => { visas += STEG; rita(); });

    function visa(flik) {
      const f = flik === 'forslag';
      statDelar.forEach((e) => { e.hidden = f; });
      sec.hidden = !f;
      if (seg) seg.hidden = f;
      knappStat.setAttribute('aria-selected', String(!f));
      knappForslag.setAttribute('aria-selected', String(f));
      if (f) history.replaceState(null, '', '#flik=forslag');
      else if (location.hash.includes('flik=forslag')) history.replaceState(null, '', '#kalla=' + window.dash.params().kalla);
      if (f) rita();
    }
    knappStat.addEventListener('click', () => visa('statistik'));
    knappForslag.addEventListener('click', () => visa('forslag'));
    visa(location.hash.includes('flik=forslag') ? 'forslag' : 'statistik');
  };
})();
