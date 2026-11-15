// Flikar med ikoner, hopfällbara rubriker och fliken Länder.
// Startas av shim.js efter att datan låsts upp (window.__startFlikar).
(() => {
  // ---------- Ikoner (egna, enkla SVG:er 24×24) ----------
  const IKON = {
    // Pintglas med skum
    oversikt: `<path d="M6 6.5 L7.6 21 Q7.7 22 8.8 22 H15.2 Q16.3 22 16.4 21 L18 6.5 Z" fill="#2a160b"/>
      <path d="M5.6 7 Q5.6 4.4 8 4.6 Q9.3 3 11.4 3.7 Q13 2.6 14.8 3.6 Q17.6 3.3 18.4 6 Q18.6 7.2 17.8 7.6 Q12 8.4 6 7.8 Q5.5 7.5 5.6 7 Z" fill="#F4E8CF" stroke="#C9B48A" stroke-width=".7"/>`,
    // Ölkupa (bägare på fot)
    stilar: `<path d="M5 4 H19 Q19.4 10 16.6 12.4 Q14.6 14 13 14.2 V18.6 Q15.8 19 16.4 20.4 Q16.6 21 16 21 H8 Q7.4 21 7.6 20.4 Q8.2 19 11 18.6 V14.2 Q9.4 14 7.4 12.4 Q4.6 10 5 4 Z" fill="#C8741A"/>
      <path d="M5.2 4 H18.8 Q18.9 5.6 18.6 6.6 H5.4 Q5.1 5.6 5.2 4 Z" fill="#F4E8CF"/>
      <path d="M5 4 H19 Q19.4 10 16.6 12.4 Q14.6 14 13 14.2 V18.6 Q15.8 19 16.4 20.4 Q16.6 21 16 21 H8 Q7.4 21 7.6 20.4 Q8.2 19 11 18.6 V14.2 Q9.4 14 7.4 12.4 Q4.6 10 5 4 Z" fill="none" stroke="#7a4a1c" stroke-width=".8"/>`,
    // Humlekotte
    humle: `<path d="M12 4.2 C15.8 4.8 17.2 8.6 16.6 12.4 C16 16 14 18.6 12 19.8 C10 18.6 8 16 7.4 12.4 C6.8 8.6 8.2 4.8 12 4.2 Z" fill="#6F9B3A"/>
      <path d="M7.5 9.4 Q12 11.6 16.5 9.4 M7.3 13 Q12 15.4 16.7 13 M8.8 16.4 Q12 18.2 15.2 16.4 M9.4 6.4 Q12 7.8 14.6 6.4" fill="none" stroke="#3f5f1e" stroke-width=".9"/>
      <path d="M12 4.2 Q12.6 2.4 14.6 2" fill="none" stroke="#3f5f1e" stroke-width="1" stroke-linecap="round"/>
      <path d="M13.4 3.2 Q16.6 1.6 18.4 3.8 Q16 5 13.4 3.2 Z" fill="#8DBA52"/>`,
    // Bryggeritunna (fat)
    bryggerier: `<path d="M6.4 4 H17.6 Q20.2 12 17.6 20 H6.4 Q3.8 12 6.4 4 Z" fill="#9A5A2A"/>
      <path d="M6.4 4 H17.6 Q20.2 12 17.6 20 H6.4 Q3.8 12 6.4 4 Z" fill="none" stroke="#4a2a12" stroke-width=".8"/>
      <path d="M5.2 8.2 H18.8 M4.9 15.8 H19.1" stroke="#3a3a3a" stroke-width="1.5"/>
      <path d="M9.6 4.2 Q8.6 12 9.6 19.8 M14.4 4.2 Q15.4 12 14.4 19.8" fill="none" stroke="#6b3a17" stroke-width=".6" opacity=".8"/>`,
    // Brittisk flagga (förenklad)
    lander: `<clipPath id="ikflagga"><rect x="2" y="5" width="20" height="14" rx="1.5"/></clipPath>
      <g clip-path="url(#ikflagga)">
        <rect x="2" y="5" width="20" height="14" fill="#012169"/>
        <path d="M2 5 L22 19 M22 5 L2 19" stroke="#fff" stroke-width="3.2"/>
        <path d="M2 5 L22 19 M22 5 L2 19" stroke="#C8102E" stroke-width="1.2"/>
        <path d="M12 5 V19 M2 12 H22" stroke="#fff" stroke-width="4.4"/>
        <path d="M12 5 V19 M2 12 H22" stroke="#C8102E" stroke-width="2.4"/>
      </g>
      <rect x="2" y="5" width="20" height="14" rx="1.5" fill="none" stroke="#00000033" stroke-width=".6"/>`,
    // Pokal
    topplista: `<path d="M7 3.5 H17 V8.5 Q17 13.4 12 14.2 Q7 13.4 7 8.5 Z" fill="#E3A126"/>
      <path d="M7 5 H4.6 Q4.4 9.6 8 10.6 M17 5 H19.4 Q19.6 9.6 16 10.6" fill="none" stroke="#B37A12" stroke-width="1.3"/>
      <path d="M11 14 H13 V17.6 H11 Z M8 18 H16 V20.6 H8 Z" fill="#B37A12"/>
      <path d="M9.4 5.4 Q9.2 9 10.6 11" fill="none" stroke="#fff" stroke-width=".9" opacity=".5" stroke-linecap="round"/>`,
    // Stjärna (förslag)
    forslag: `<path d="M12 2.8 L14.7 8.6 L21 9.3 L16.3 13.6 L17.6 19.9 L12 16.7 L6.4 19.9 L7.7 13.6 L3 9.3 L9.3 8.6 Z" fill="#E3A126" stroke="#B37A12" stroke-width=".8" stroke-linejoin="round"/>`,
  };
  const svg = (k) => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${IKON[k]}</svg>`;

  const FLIKAR = [
    { id: 'oversikt', namn: 'Översikt', delar: ['nyckeltal', 'per-ar', 'fordelning', 'senaste-kort'] },
    { id: 'stilar', namn: 'Ölstilar', delar: ['stilar-kort'] },
    { id: 'humle', namn: 'Humle', delar: ['humle-kort'] },
    { id: 'bryggerier', namn: 'Bryggerier', delar: ['bryggerier-kort'] },
    { id: 'lander', namn: 'Länder', delar: ['lander-kort'] },
    { id: 'topplista', namn: 'Topplista', delar: ['topplista'] },
    { id: 'forslag', namn: 'Borde testa', delar: ['forslag'], utanKalla: true },
  ];

  // ---------- Länder ----------
  const SV = {
    'Sweden': 'Sverige', 'United States': 'USA', 'England': 'England', 'Belgium': 'Belgien', 'Germany': 'Tyskland',
    'Denmark': 'Danmark', 'Scotland': 'Skottland', 'Czech Republic': 'Tjeckien', 'Ireland': 'Irland', 'Netherlands': 'Nederländerna',
    'Norway': 'Norge', 'France': 'Frankrike', 'Spain': 'Spanien', 'Canada': 'Kanada', 'Finland': 'Finland', 'Croatia': 'Kroatien',
    'Italy': 'Italien', 'Wales': 'Wales', 'Poland': 'Polen', 'Slovenia': 'Slovenien', 'Thailand': 'Thailand', 'Estonia': 'Estland',
    'Austria': 'Österrike', 'New Zealand': 'Nya Zeeland', 'Luxembourg': 'Luxemburg', 'Brazil': 'Brasilien', 'Ukraine': 'Ukraina',
    'Mexico': 'Mexiko', 'Iceland': 'Island', 'Australia': 'Australien', 'Jamaica': 'Jamaica', 'South Africa': 'Sydafrika',
    'Japan': 'Japan', 'Portugal': 'Portugal', 'Greece': 'Grekland', 'Slovakia': 'Slovakien', 'Lithuania': 'Litauen',
    'Russia': 'Ryssland', 'Colombia': 'Colombia', 'Lebanon': 'Libanon', 'Latvia': 'Lettland', 'Switzerland': 'Schweiz',
    'Hungary': 'Ungern', 'China': 'Kina', 'India': 'Indien', 'Argentina': 'Argentina', 'Chile': 'Chile', 'Northern Ireland': 'Nordirland',
  };
  const nf0 = new Intl.NumberFormat('sv-SE');
  const nf2 = new Intl.NumberFormat('sv-SE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function el(tag, attrs = {}, ...barn) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else e.setAttribute(k, v === true ? '' : v);
    }
    for (const b of barn) if (b !== null && b !== undefined) e.append(b);
    return e;
  }

  function byggLander(ob) {
    const KOL = [
      { k: 'land', t: 'Land', typ: 'text' },
      { k: 'checkins', t: 'Check-ins', typ: 'tal', cls: 'num' },
      { k: 'unika_ol', t: 'Unika öl', typ: 'tal', cls: 'num ob-hide-narrow' },
      { k: 'bryggerier', t: 'Bryggerier', typ: 'tal', cls: 'num ob-hide-narrow' },
      { k: 'snittbetyg', t: 'Snitt', typ: 'tal', cls: 'num' },
      { k: 'basta_ol', t: 'Bästa öl', typ: 'text', cls: 'ob-hide-narrow' },
    ];
    const sort = { k: 'checkins', dir: 'desc' };
    const tbody = el('tbody');
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
    const sec = el('section', { class: 'ob-card ob-lander', id: 'lander-kort' },
      el('h2', { text: 'Länder' }),
      el('p', { class: 'ob-note', text: 'Bryggeriets land för dina check-ins, med snittbetyg och ditt högst betygsatta öl därifrån. Klicka på en rubrik för att sortera.' }),
      el('div', { class: 'ob-tablewrap' }, el('table', { class: 'ob-table' }, el('thead', {}, el('tr', {}, ...ths)), tbody)));
    const topplista = ob.querySelector('#topplista');
    ob.insertBefore(sec, topplista);

    function rita() {
      const d = window.dash.data('lander');
      if (d.status !== 'ok') { tbody.replaceChildren(el('tr', {}, el('td', { colspan: '6', class: 'ob-muted', text: 'Ingen landsdata än – kommer med nästa nattliga uppdatering.' }))); return; }
      const rader = d.data.map((r) => ({ ...r, land: SV[r.land] || r.land }));
      const max = Math.max(1, ...rader.map((r) => r.checkins));
      rader.sort((a, b) => {
        const k = KOL.find((x) => x.k === sort.k);
        const va = a[sort.k], vb = b[sort.k];
        if (va == null) return 1; if (vb == null) return -1;
        const diff = k.typ === 'text' ? String(va).localeCompare(String(vb), 'sv') : va - vb;
        return sort.dir === 'asc' ? diff : -diff;
      });
      tbody.replaceChildren(...rader.map((r) => el('tr', {},
        el('td', { text: r.land }),
        el('td', { class: 'num' }, el('div', { class: 'ob-landrad' },
          el('span', { class: 'ob-landstapel', style: `width:${Math.max(2, (r.checkins / max) * 100)}%` }),
          el('span', { text: nf0.format(r.checkins) }))),
        el('td', { class: 'num ob-hide-narrow', text: nf0.format(r.unika_ol) }),
        el('td', { class: 'num ob-hide-narrow', text: nf0.format(r.bryggerier) }),
        el('td', { class: 'num', text: r.snittbetyg == null ? '–' : nf2.format(r.snittbetyg) }),
        el('td', { class: 'ob-hide-narrow' }, r.basta_ol
          ? el('a', { href: r.basta_ol_url, target: '_blank', rel: 'noopener', text: `${r.basta_ol} (${nf2.format(r.basta)})` }) : '–'))));
    }
    window.dash.onData(rita);
    rita();
  }

  // ---------- Hopfällbara rubriker ----------
  const LAGRAD = 'olb-hopfallda';
  function lasHopfallda() { try { return new Set(JSON.parse(localStorage.getItem(LAGRAD) || '[]')); } catch { return new Set(); } }
  function sparaHopfallda(s) { try { localStorage.setItem(LAGRAD, JSON.stringify([...s])); } catch { /* privat läge */ } }

  function gorHopfallbara(ob) {
    const hopfallda = lasHopfallda();
    ob.querySelectorAll('section.ob-card').forEach((kort) => {
      const h2 = kort.querySelector(':scope > h2');
      if (!h2 || h2.querySelector('button.ob-fall')) return;
      const id = kort.id || h2.textContent;
      const knapp = el('button', { type: 'button', class: 'ob-fall', 'aria-expanded': 'true' });
      knapp.append(el('span', { class: 'ob-pil', 'aria-hidden': 'true' }), ...h2.childNodes);
      h2.append(knapp);
      const satt = (oppen) => {
        kort.classList.toggle('ob-hopfalld', !oppen);
        knapp.setAttribute('aria-expanded', String(oppen));
      };
      satt(!hopfallda.has(id));
      knapp.addEventListener('click', () => {
        const oppen = kort.classList.contains('ob-hopfalld');
        satt(oppen);
        if (oppen) hopfallda.delete(id); else hopfallda.add(id);
        sparaHopfallda(hopfallda);
        if (oppen) requestAnimationFrame(() => window.dash._redraw());  // diagram ritas om i rätt bredd
      });
    });
  }

  // ---------- Flikar ----------
  window.__startFlikar = () => {
    const ob = document.querySelector('#dash-root .ob');
    const head = ob.querySelector('.ob-head');
    const seg = head.querySelector('.ob-seg');
    byggLander(ob);

    const knappar = FLIKAR.map((f) => {
      const b = el('button', { type: 'button', role: 'tab', 'data-flik': f.id, 'aria-selected': 'false' });
      b.innerHTML = svg(f.id);
      b.append(el('span', { text: f.namn }));
      b.addEventListener('click', () => visa(f.id));
      return b;
    });
    const nav = el('nav', { class: 'ob-tabs ob-tabs-ikon', role: 'tablist', 'aria-label': 'Flikar' }, ...knappar);
    head.after(nav);
    gorHopfallbara(ob);

    const delMedFlik = new Map();
    FLIKAR.forEach((f) => f.delar.forEach((d) => delMedFlik.set(d, f.id)));
    const allaDelar = [...delMedFlik.keys()].map((id) => document.getElementById(id)).filter(Boolean);

    function visa(id, ingenRitning) {
      const flik = FLIKAR.find((f) => f.id === id) || FLIKAR[0];
      window.__flik = flik.id;
      allaDelar.forEach((e) => { e.hidden = !flik.delar.includes(e.id); });
      // Rutnät utan synliga kort döljs helt
      ob.querySelectorAll(':scope > .ob-grid').forEach((g) => { g.hidden = ![...g.children].some((c) => !c.hidden); });
      if (seg) seg.hidden = !!flik.utanKalla;
      knappar.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.flik === flik.id)));
      window.dash.setLink();
      if (!ingenRitning) requestAnimationFrame(() => window.dash._redraw());
    }

    // Klick på ett bryggeri leder till topplistan: byt flik först, scrolla sedan.
    const orig = window.dash.setLink;
    window.dash.setLink = (id) => {
      const flik = id && delMedFlik.get(id);
      if (flik && flik !== window.__flik) {
        visa(flik, true);
        requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
      }
      orig(id);
    };

    const start = (location.hash.match(/flik=([a-z]+)/) || [])[1];
    visa(FLIKAR.some((f) => f.id === start) ? start : 'oversikt');
  };
})();
