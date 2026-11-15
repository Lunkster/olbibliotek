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
  // Sök i Systembolagets ölsortiment (Henrik: /sortiment/ol/?q= ger bättre träffar än det allmänna söket)
  const sbLank = (namn) => 'https://www.systembolaget.se/sortiment/ol/?q=' +
    encodeURIComponent(String(namn || '').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim());
  const lank = (href, text, cls) => el('a', { href, target: '_blank', rel: 'noopener', class: cls, text });

  window.__startForslag = ({ forslag = [], venuer = [] } = {}) => {
    forslag.forEach((r, i) => { r.rang = i + 1; });
    const ob = document.querySelector('#dash-root .ob');
    const head = ob.querySelector('.ob-head');


    // Sektion
    const venueText = venuer.map((v) => v.ol
      ? `${v.namn} (${nf0.format(v.ol)} öl, meny ${v.uppdaterad || 'okänt datum'})`
      : `${v.namn} (ingen meny i Untappd)`);
    // Flerval med kryssrutor och räknare (används för ställen och öltyper). Inget valt = alla.
    function flerval(etikettAlla, plural, alternativ, aria) {
      const valda = new Set();
      const etikett = el('span', { text: etikettAlla });
      const rensa = el('button', { type: 'button', class: 'ob-btn', text: 'Rensa' });
      const rader = alternativ.map((v) => {
        const ruta = el('input', { type: 'checkbox', value: v });
        ruta.addEventListener('change', () => { if (ruta.checked) valda.add(v); else valda.delete(v); andrad(); });
        const tal = el('span', { class: 'ob-muted' });
        const rad = el('label', { class: 'ob-multi-rad' }, ruta, ` ${v} `, tal);
        rad._v = v; rad._ruta = ruta; rad._tal = tal;
        return rad;
      });
      const elem = el('details', { class: 'ob-multi' },
        el('summary', { class: 'ob-select', 'aria-label': aria }, etikett),
        el('div', { class: 'ob-multi-lista' }, el('div', { class: 'ob-multi-topp' }, rensa), ...rader));
      function andrad() {
        const v = [...valda];
        etikett.textContent = !v.length ? etikettAlla : v.length <= 2 ? v.join(', ') : `${v.length} ${plural}`;
        visas = STEG; rita();
      }
      rensa.addEventListener('click', () => { valda.clear(); rader.forEach((r) => { r._ruta.checked = false; }); andrad(); });
      document.addEventListener('click', (e) => { if (elem.open && !elem.contains(e.target)) elem.open = false; });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && elem.open) { elem.open = false; elem.querySelector('summary').focus(); } });
      return {
        elem, valda,
        // Visa antal i nuvarande urval; dölj alternativ med 0 som inte är valda
        raknaOm(antal) {
          for (const r of rader) {
            const n = antal.get(r._v) || 0;
            r._tal.textContent = `(${n})`;
            r.hidden = n === 0 && !r._ruta.checked;
          }
        },
      };
    }
    const venueFilter = flerval('Alla ställen', 'ställen', venuer.filter((v) => v.ol).map((v) => v.namn), 'Finns på');
    const stilar = [...new Set(forslag.map((r) => r.stilfamilj).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'));
    const stilFilter = flerval('Alla öltyper', 'öltyper', stilar, 'Öltyp');
    const pastallen = (r) => (r.finns_pa ? r.finns_pa.split(', ') : []);
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
      el('div', { class: 'ob-tools' }, venueFilter.elem, stilFilter.elem, sok, antal),
      el('div', { class: 'ob-tablewrap' }, el('table', { class: 'ob-table' },
        el('thead', {}, el('tr', {}, ...KOLUMNER.map(rubrik))),
        tbody)),
      el('div', { class: 'ob-tools' }, mer));
    ob.append(sec);

    let visas = STEG;

    function urval() {
      const q = sok.value.trim().toLowerCase();
      const okSok = (r) => !q || `${r.namn} ${r.bryggeri || ''}`.toLowerCase().includes(q);
      const okVenue = (r) => !venueFilter.valda.size || pastallen(r).some((v) => venueFilter.valda.has(v));
      const okStil = (r) => !stilFilter.valda.size || stilFilter.valda.has(r.stilfamilj);
      // Räknarna: varje filter räknas på de andra filtren (inte på sig själv)
      const perStil = new Map(), perVenue = new Map();
      for (const r of forslag) {
        if (!okSok(r)) continue;
        if (okVenue(r) && r.stilfamilj) perStil.set(r.stilfamilj, (perStil.get(r.stilfamilj) || 0) + 1);
        if (okStil(r)) for (const v of pastallen(r)) perVenue.set(v, (perVenue.get(v) || 0) + 1);
      }
      stilFilter.raknaOm(perStil);
      venueFilter.raknaOm(perVenue);
      return forslag.filter((r) => okSok(r) && okVenue(r) && okStil(r));
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
          el('td', {}, lank(sbLank(r.namn), 'Sök', 'ob-link')));
      }));
      mer.hidden = rader.length <= visas;
    }
    sok.addEventListener('input', () => { visas = STEG; rita(); });
    mer.addEventListener('click', () => { visas += STEG; rita(); });

    rita();  // flikarna (flikar.js) visar och döljer sektionen
  };
})();
