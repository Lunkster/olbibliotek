// Ölstilsfliken: "Stilguide" – dina Untappd-stilar med beskrivningar från Catalog.beer (CC BY 4.0).
(() => {
  const nf0 = new Intl.NumberFormat('sv-SE');
  const nf1 = new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf3 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  function el(tag, attrs = {}, ...barn) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
    }
    for (const b of barn) if (b !== null && b !== undefined) e.append(b);
    return e;
  }
  // Ungefärlig ölfärg för SRM-värden
  const SRM = [[2, '#F8F753'], [3, '#F6F513'], [4, '#ECE61A'], [6, '#D5BC26'], [8, '#BF923B'], [10, '#BF813A'], [13, '#BC6733'], [17, '#8D4C32'], [20, '#5D341A'], [24, '#4E2A0C'], [29, '#4A2727'], [35, '#361F1B'], [40, '#261716']];
  const srmFarg = (v) => (SRM.find(([g]) => v <= g) || SRM[SRM.length - 1])[1];
  const spann = (s, f = nf1, enhet = '') => (s && s.min != null ? (s.min === s.max ? `${f.format(s.min)}${enhet}` : `${f.format(s.min)}–${f.format(s.max)}${enhet}`) : null);

  window.__byggStilguide = (ob) => {
    const guide = new Map((window.OLB_STILGUIDE || []).map((g) => [g.id, g]));
    // Stil per öl för vaga Untappd-kategorier, grupperat på Untappd-stil
    const perOl = new Map();
    for (const o of window.OLB_OLSTIL || []) { if (!perOl.has(o.untappd_stil)) perOl.set(o.untappd_stil, []); perOl.get(o.untappd_stil).push(o); }
    const lista = el('div', { class: 'ob-stilguide' });
    const sok = el('input', { class: 'ob-search', type: 'search', placeholder: 'Sök stil', 'aria-label': 'Sök stil' });
    const sortering = el('select', { class: 'ob-select', 'aria-label': 'Sortera' },
      el('option', { value: 'checkins', text: 'Flest check-ins först' }),
      el('option', { value: 'snitt', text: 'Högst snittbetyg först' }),
      el('option', { value: 'namn', text: 'Bokstavsordning' }));
    const antal = el('span', { class: 'ob-count' });
    const kort = el('section', { class: 'ob-card', id: 'stilguide-kort' },
      el('h2', { text: 'Stilguide' }),
      el('p', { class: 'ob-note' }, 'Alla stilar du druckit, med beskrivning och typvärden från ',
        el('a', { href: 'https://catalog.beer/style', target: '_blank', rel: 'noopener', text: 'Catalog.beer' }),
        ' (', el('a', { href: 'https://creativecommons.org/licenses/by/4.0/', target: '_blank', rel: 'noopener', text: 'CC BY 4.0' }),
        ', bygger på Brewers Association och BJCP; texterna är på engelska). Untappds stilnamn är kopplade till guiden automatiskt och för hand, så enstaka kopplingar kan vara ungefärliga. Klicka på en stil för att fälla ut den.'),
      el('div', { class: 'ob-tools' }, sok, sortering, antal),
      lista);
    ob.insertBefore(kort, ob.querySelector('#bryggerier-kort'));

    function detalj(r, g) {
      const kropp = el('div', { class: 'ob-stilkropp' });
      const bedomda = perOl.get(r.stil) || [];
      if (!g) {
        kropp.append(el('p', { class: 'ob-muted', text: bedomda.length
          ? 'Untappds kategori är för vag för en egen stil i guiden. Så här har ölen bedömts utifrån sina beskrivningar och webben:'
          : 'Ingen motsvarighet i stilguiden för den här stilen.' }));
      } else {
        kropp.append(el('p', { class: 'ob-stilguidenamn' }, el('b', { text: g.namn }), g.familj_namn ? ` · ${g.familj_namn}` : '', g.kalla ? el('span', { class: 'ob-muted', text: ` · ${g.kalla}` }) : null));
        if (g.beskrivning) kropp.append(el('p', { text: g.beskrivning }));
        const sinnen = [['Arom', g.arom], ['Smak', g.smak], ['Utseende', g.utseende], ['Munkänsla', g.munkansla]].filter(([, t]) => t);
        if (sinnen.length) kropp.append(el('dl', { class: 'ob-sinnen' }, ...sinnen.flatMap(([k, t]) => [el('dt', { text: k }), el('dd', { text: t })])));
        const s = g.specs || {};
        const varden = [];
        const abv = spann(s.abv, nf1, ' %');
        if (abv) varden.push(['Alkoholhalt', `${abv}${r.ditt_abv != null ? ` (dina öl: ${nf1.format(r.ditt_abv)} %)` : ''}`]);
        const ibu = spann(s.ibu, nf0); if (ibu) varden.push(['IBU', ibu]);
        const og = spann(s.og, nf3); if (og) varden.push(['OG', og]);
        if (s.srm && s.srm.min != null) {
          const ruta = el('span', { class: 'ob-srm', style: `background: linear-gradient(90deg, ${srmFarg(s.srm.min)}, ${srmFarg(s.srm.max)})` });
          varden.push(['Färg (SRM)', el('span', {}, ruta, ` ${spann(s.srm, nf0)}`)]);
        }
        if (varden.length) kropp.append(el('dl', { class: 'ob-varden' }, ...varden.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', {}, v)])));
        if (g.exempel) kropp.append(el('p', { class: 'ob-muted' }, el('b', { text: 'Exempel: ' }), g.exempel));
      }
      if (bedomda.length) {
        kropp.append(el('ul', { class: 'ob-olstil' }, ...bedomda.map((o) => el('li', {},
          el('a', { href: `https://untappd.com/beer/${o.ol_id}`, target: '_blank', rel: 'noopener', text: o.ol }), ' → ',
          el('b', { text: o.guide_namn }),
          el('div', { class: 'ob-why', text: `${o.motivering || ''}${o.kalla ? ` (källa: ${o.kalla})` : ''}` })))));
        const kvar = r.unika_ol - bedomda.length;
        if (kvar > 0) kropp.append(el('p', { class: 'ob-muted', text: `${nf0.format(kvar)} öl i kategorin kunde inte bedömas – för lite information i beskrivningen och på webben.` }));
      }
      const visa = el('button', { type: 'button', class: 'ob-btn', text: `Visa dina ${nf0.format(r.unika_ol)} öl i stilen` });
      visa.addEventListener('click', () => window.visaITopplista && window.visaITopplista({ understil: r.stil }));
      kropp.append(el('div', { class: 'ob-tools' }, visa));
      return kropp;
    }

    function rita() {
      const d = window.dash.data('stilar_detalj');
      if (d.status !== 'ok') { lista.replaceChildren(el('p', { class: 'ob-muted', text: 'Ingen stildata än – kommer med nästa nattliga uppdatering.' })); antal.textContent = ''; return; }
      const q = sok.value.trim().toLowerCase();
      const rader = d.data.filter((r) => !q || `${r.stil} ${(guide.get(r.stil_id) || {}).namn || ''}`.toLowerCase().includes(q));
      const s = sortering.value;
      rader.sort((a, b) => (s === 'namn' ? a.stil.localeCompare(b.stil, 'sv') : s === 'snitt' ? (b.snittbetyg ?? -1) - (a.snittbetyg ?? -1) : b.checkins - a.checkins));
      antal.textContent = `${nf0.format(rader.length)} stilar`;
      const oppna = new Set([...lista.querySelectorAll('details[open]')].map((x) => x.dataset.stil));
      lista.replaceChildren(...rader.map((r) => {
        const g = guide.get(r.stil_id);
        const det = el('details', { class: 'ob-stilrad', 'data-stil': r.stil, open: oppna.has(r.stil) },
          el('summary', {},
            el('span', { class: 'ob-stilnamn', text: r.stil }),
            el('span', { class: 'ob-muted ob-stilguidekort', text: g ? g.namn : perOl.has(r.stil) ? `Olika stilar (${perOl.get(r.stil).length} bedömda öl)` : '–' }),
            el('span', { class: 'ob-stilsiffror', text: `${nf0.format(r.checkins)} st · ${r.snittbetyg == null ? '–' : nf2.format(r.snittbetyg)}` })));
        let byggd = false;
        det.addEventListener('toggle', () => { if (det.open && !byggd) { det.append(detalj(r, g)); byggd = true; } });
        if (det.open) { det.append(detalj(r, g)); byggd = true; }
        return det;
      }));
    }
    sok.addEventListener('input', rita);
    sortering.addEventListener('change', rita);
    window.dash.onData(rita);
    rita();
  };
})();
