// Ersätter artifact-värdens `dash`-API med data från data.enc.json (AES-GCM + PBKDF2, gzip före kryptering).
(() => {
  let DATA = null;
  const listeners = [];
  const params = { kalla: (location.hash.match(/kalla=(alla|untappd|iglaset)/) || [])[1] || 'alla' };
  const notify = () => listeners.forEach((f) => f());
  // Adressen: #kalla=…&flik=… (fliken sätts av flikar.js)
  const hash = () => '#kalla=' + params.kalla + (window.__flik ? '&flik=' + window.__flik : '');
  window.dash = {
    loader() {},
    data(id) {
      if (!DATA) return { status: 'loading', data: null };
      const rows = (DATA[params.kalla] || {})[id];
      return rows ? { status: 'ok', data: rows } : { status: 'missing', data: null };
    },
    params: () => ({ ...params }),
    setParams(p) { Object.assign(params, p); history.replaceState(null, '', hash()); notify(); },
    setLink() { history.replaceState(null, '', hash()); },
    _redraw: () => notify(),
    onData(f) { listeners.push(f); },
    _load(d) { DATA = d; notify(); },
  };

  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function decrypt(enc, pw) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.ct));
    const ds = new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(await new Response(ds).text());
  }

  const form = document.getElementById('lock'), pw = document.getElementById('pw'), err = document.getElementById('err'), rem = document.getElementById('remember');
  let encPromise = null;
  const getEnc = () => (encPromise ||= fetch('data.enc.json', { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('Datafilen saknas (HTTP ' + r.status + ')'); return r.json(); }));

  async function open(password, silent) {
    err.textContent = '';
    try {
      const out = await decrypt(await getEnc(), password);
      if (rem.checked || silent) localStorage.setItem('olb-pw', password);
      form.hidden = true;
      document.getElementById('dash-root').hidden = false;
      window.__start();
      window.dash._load(out.data);
      if (window.__startForslag) window.__startForslag({ forslag: out.forslag || [], venuer: out.venuer || [] });
      if (window.__startFlikar) window.__startFlikar();
      const t = document.createElement('p');
      t.style.cssText = 'text-align:center;font-size:12px;color:var(--color-fg-muted)';
      t.textContent = 'Uppdaterad ' + out.skapad.slice(0, 16).replace('T', ' ') + ' UTC';
      document.body.appendChild(t);
    } catch (e) {
      if (silent) { localStorage.removeItem('olb-pw'); return; }
      err.textContent = e.name === 'OperationError' ? 'Fel lösenord' : String(e.message || e);
    }
  }
  form.addEventListener('submit', (e) => { e.preventDefault(); open(pw.value, false); });
  const saved = localStorage.getItem('olb-pw');
  if (saved) { rem.checked = true; open(saved, true); }
})();
