// Humlefliken: "Aromer du gillar" och "Humleprofiler".
// Profilerna kommer från öppna dataset: hops-json (MIT, Stuart Taylor) och common-beer-data (MIT, Wall Brew Co.).
(() => {
  const nf0 = new Intl.NumberFormat('sv-SE');
  const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf1 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
  const tecken = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + nf2.format(Math.abs(v));
  const TYP = { arom: 'Arom', bittring: 'Bittring', 'båda': 'Båda' };
  const URS = { USA: 'USA', UK: 'England', DE: 'Tyskland', CZ: 'Tjeckien', NZ: 'Nya Zeeland', AU: 'Australien', SI: 'Slovenien', FR: 'Frankrike', PL: 'Polen', ZA: 'Sydafrika', AR: 'Argentina', 'USA/DE': 'USA/Tyskland', 'JP/USA': 'Japan/USA' };
  function el(tag, attrs = {}, ...barn) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
    }
    for (const b of barn) if (b !== null && b !== undefined) e.append(b);
    return e;
  }
  const visa = (val) => window.visaITopplista && window.visaITopplista(val);
  const alfa = (r) => (r.alfa_min == null ? '–' : r.alfa_min === r.alfa_max ? `${nf1.format(r.alfa_min)} %` : `${nf1.format(r.alfa_min)}–${nf1.format(r.alfa_max)} %`);
  window.OLB_HUMLE = { TYP, URS, alfa };

  // ---------- Aromer du gillar ----------
  function byggAromer(ob, fore) {
    const lista = el('div', { class: 'ob-aromlista' });
    const bas = el('b', { text: '–' });
    const kort = el('section', { class: 'ob-card', id: 'aromer-kort' },
      el('h2', { text: 'Aromer du gillar' }),
      el('p', { class: 'ob-note' }, 'Humlens aromkategorier, jämfört med ditt snitt för öl där humlen är känd (', bas,
        '). Ett öl räknas till en arom om någon av dess humlesorter har den. Klicka för att se ölen i topplistan.'),
      lista);
    ob.insertBefore(kort, fore);
    function rita() {
      const d = window.dash.data('aromer');
      if (d.status !== 'ok' || !d.data.length) { lista.replaceChildren(el('p', { class: 'ob-muted', text: 'Ingen aromdata än – kommer med nästa nattliga uppdatering.' })); return; }
      bas.textContent = nf2.format(d.data[0].bas);
      const max = Math.max(0.1, ...d.data.map((r) => Math.abs(r.diff)));
      lista.replaceChildren(...d.data.map((r) => {
        const b = el('button', { type: 'button', class: 'ob-aromrad', title: `Visa öl med aromen ${r.arom}` },
          el('span', { class: 'ob-aromnamn', text: r.arom }),
          el('span', { class: 'ob-aromaxel' },
            el('span', { class: `ob-aromstapel ${r.diff >= 0 ? 'plus' : 'minus'}`, style: `width:${(Math.abs(r.diff) / max) * 50}%` })),
          el('span', { class: 'ob-aromvarde', text: tecken(r.diff) }),
          el('span', { class: 'ob-muted ob-aromantal', text: `${nf2.format(r.snittbetyg)} · ${nf0.format(r.checkins)} st` }));
        b.addEventListener('click', () => visa({ arom: r.arom }));
        return b;
      }));
    }
    window.dash.onData(rita);
    rita();
  }

  // ---------- Humleprofiler ----------
  function byggProfiler(ob, fore) {
    const KOL = [
      { k: 'humle', t: 'Humle', typ: 'text' },
      { k: 'ursprung', t: 'Ursprung', typ: 'text', cls: 'ob-hide-narrow' },
      { k: 'typ', t: 'Typ', typ: 'text', cls: 'ob-hide-narrow' },
      { k: 'alfa_max', t: 'Alfa', typ: 'tal', cls: 'num ob-hide-narrow' },
      { k: 'aromer', t: 'Aromer', typ: 'text' },
      { k: 'antal_ol', t: 'Öl', typ: 'tal', cls: 'num' },
      { k: 'snittbetyg', t: 'Ditt snitt', typ: 'tal', cls: 'num' },
    ];
    const sort = { k: 'antal_ol', dir: 'desc' };
    const tbody = el('tbody');
    const sok = el('input', { class: 'ob-search', type: 'search', placeholder: 'Sök humle eller arom', 'aria-label': 'Sök humle eller arom' });
    const ths = KOL.map((c) => {
      const b = el('button', { type: 'button', text: c.t });
      const th = el('th', { class: c.cls, 'aria-sort': c.k === sort.k ? 'descending' : 'none' }, b);
      b.addEventListener('click', () => {
        if (sort.k === c.k) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
        else { sort.k = c.k; sort.dir = c.typ === 'text' ? 'asc' : 'desc'; }
        ths.forEach((x, i) => x.setAttribute('aria-sort', KOL[i].k !== sort.k ? 'none' : sort.dir === 'asc' ? 'ascending' : 'descending'));
        rita();
      });
      return th;
    });
    const kort = el('section', { class: 'ob-card ob-profiler', id: 'humleprofil-kort' },
      el('h2', { text: 'Humleprofiler' }),
      el('p', { class: 'ob-note' }, 'Alla humlesorter i dina öl, med typ, alfasyra och aromer från de öppna dataseten ',
        el('a', { href: 'https://github.com/stuartraetaylor/hops-json', target: '_blank', rel: 'noopener', text: 'hops-json' }), ' och ',
        el('a', { href: 'https://github.com/Wall-Brew-Co/common-beer-data', target: '_blank', rel: 'noopener', text: 'common-beer-data' }),
        ' (MIT-licens). Nyare sorter saknas ofta där. Klicka på en sort för att se ölen.'),
      el('div', { class: 'ob-tools' }, sok),
      el('div', { class: 'ob-tablewrap' }, el('table', { class: 'ob-table' }, el('thead', {}, el('tr', {}, ...ths)), tbody)));
    ob.insertBefore(kort, fore);
    sok.addEventListener('input', rita);
    function rita() {
      const d = window.dash.data('humleprofil');
      if (d.status !== 'ok') { tbody.replaceChildren(el('tr', {}, el('td', { colspan: '7', class: 'ob-muted', text: 'Ingen profildata än – kommer med nästa nattliga uppdatering.' }))); return; }
      const q = sok.value.trim().toLowerCase();
      const rader = d.data.filter((r) => !q || `${r.humle} ${r.aromer || ''}`.toLowerCase().includes(q));
      const k = KOL.find((x) => x.k === sort.k);
      rader.sort((a, b) => {
        const va = a[sort.k], vb = b[sort.k];
        if (va == null || va === '') return 1; if (vb == null || vb === '') return -1;
        const diff = k.typ === 'text' ? String(va).localeCompare(String(vb), 'sv') : va - vb;
        return (sort.dir === 'asc' ? diff : -diff) || b.antal_ol - a.antal_ol;
      });
      tbody.replaceChildren(...rader.map((r) => {
        const namn = el('button', { type: 'button', class: 'ob-landknapp', text: r.humle, title: `Visa öl med ${r.humle}` });
        namn.addEventListener('click', () => visa({ humle: r.humle }));
        const info = el('td', {}, namn);
        if (r.ersattning) info.append(el('div', { class: 'ob-why', text: `Ersättare: ${r.ersattning}` }));
        if (r.arom_en) info.title = r.arom_en;
        return el('tr', {},
          info,
          el('td', { class: 'ob-hide-narrow ob-muted', text: URS[r.ursprung] || r.ursprung || '' }),
          el('td', { class: 'ob-hide-narrow ob-muted', text: TYP[r.typ] || '–' }),
          el('td', { class: 'num ob-hide-narrow', text: alfa(r) }),
          el('td', { class: 'ob-muted', text: r.aromer || '–' }),
          el('td', { class: 'num', text: nf0.format(r.antal_ol) }),
          el('td', { class: 'num' }, nf2.format(r.snittbetyg), el('div', { class: `ob-why ${r.diff >= 0 ? 'ob-plus' : 'ob-minus'}`, text: tecken(r.diff) })));
      }));
    }
    window.dash.onData(rita);
    rita();
  }

  window.__byggHumle = (ob) => {
    const fore = ob.querySelector('#bryggerier-kort');
    byggAromer(ob, fore);
    byggProfiler(ob, fore);
  };
})();
