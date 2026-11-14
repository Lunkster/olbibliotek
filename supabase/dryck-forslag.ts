// Samlar ölförslag i små portioner (körs nattetid av pg_cron, inom Untappds 100 anrop/timme).
// POST {"steg": ["liknande","bryggeri","berika","onskelista","venue"], "max_anrop": 45, "min_kvar": 25,
//       "onske_topp": 20, "onske_max": 5, "torrkorning": false}
// liknande:   beer/info för öl Henrik gett högt betyg -> Untappds "liknande öl" blir kandidater
// bryggeri:   brewery/info för favoritbryggerier -> deras öl (med beskrivning och antal betyg) blir kandidater
// berika:     beer/info för kandidater som saknar antal betyg/beskrivning; tar bort sådant Henrik redan druckit
// onskelista: lägger förslagstoppen (öl med minst 100 betyg) i Untappds önskelista (högst onske_max per körning, aldrig samma öl två gånger)
// venue:      läser menyerna på bevakade venues (webbsidan, inga API-anrop)
import postgres from "npm:postgres@3.4.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class ApiFel extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}

let kvar = 100;
let anrop = 0;
async function api(path: string, at: string, params: Record<string, string> = {}) {
  const u = new URL(`https://api.untappd.com/v4/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set("access_token", at);
  const r = await fetch(u, { headers: { "User-Agent": "lunkster-olbibliotek" } });
  anrop++;
  const rem = r.headers.get("x-ratelimit-remaining");
  if (rem !== null) kvar = Number(rem);
  if (!r.ok) throw new ApiFel(r.status, `Untappd ${path.split("/").slice(0, 2).join("/")}: HTTP ${r.status}`);
  return (await r.json())?.response ?? {};
}

const ent = (s: string) => s.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/\s+/g, " ").trim();
const num = (v: unknown) => (v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

async function harDruckit(bid: number) {
  const [r] = await sql`select exists(select 1 from dryck.v_checkin where ol_id = ${bid}) as d`;
  return r.d as boolean;
}

// Lägger till/uppdaterar en kandidat. full = info från källa med antal betyg och beskrivning.
async function laggTill(b: any, br: any, typ: string | null, ref: number, betyg: unknown, full: boolean) {
  if (!b?.bid) return false;
  if (b.has_had || (await harDruckit(b.bid))) return false;
  await sql`
    insert into dryck.kandidat (ol_id, namn, bryggeri_id, bryggeri, land, stil, abv, ibu, global_betyg, antal_betyg, beskrivning, i_produktion, info_hamtad)
    values (${b.bid}, ${b.beer_name}, ${br?.brewery_id ?? null}, ${br?.brewery_name ?? null}, ${br?.country_name ?? null},
            ${b.beer_style ?? null}, ${num(b.beer_abv)}, ${num(b.beer_ibu)}, ${num(betyg)}, ${num(b.rating_count)},
            ${b.beer_description || null}, ${b.is_in_production === undefined ? null : !!b.is_in_production}, ${full ? new Date() : null})
    on conflict (ol_id) do update set
      namn = excluded.namn,
      bryggeri_id = coalesce(excluded.bryggeri_id, dryck.kandidat.bryggeri_id),
      bryggeri = coalesce(excluded.bryggeri, dryck.kandidat.bryggeri),
      land = coalesce(excluded.land, dryck.kandidat.land),
      stil = coalesce(excluded.stil, dryck.kandidat.stil),
      abv = coalesce(excluded.abv, dryck.kandidat.abv),
      ibu = coalesce(excluded.ibu, dryck.kandidat.ibu),
      global_betyg = coalesce(excluded.global_betyg, dryck.kandidat.global_betyg),
      antal_betyg = coalesce(excluded.antal_betyg, dryck.kandidat.antal_betyg),
      beskrivning = coalesce(excluded.beskrivning, dryck.kandidat.beskrivning),
      i_produktion = coalesce(excluded.i_produktion, dryck.kandidat.i_produktion),
      info_hamtad = coalesce(excluded.info_hamtad, dryck.kandidat.info_hamtad)`;
  if (typ) await sql`insert into dryck.kandidat_kalla (ol_id, typ, ref_id) values (${b.bid}, ${typ}, ${ref}) on conflict do nothing`;
  return true;
}

// ---------- Venue-menyer (webbsida) ----------
async function hamtaSida(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "sv,en;q=0.8" } });
  if (!r.ok) throw new Error(`HTTP ${r.status} för ${url}`);
  return await r.text();
}
function lasMeny(html: string) {
  const ut: any[] = [];
  for (const blk of html.split('<li class="menu-item"').slice(1)) {
    const bid = blk.match(/href="\/b\/[^"\/]+\/(\d+)"/)?.[1];
    if (!bid) continue;
    ut.push({
      bid: Number(bid),
      namn: ent(blk.match(/href="\/b\/[^"]+">([\s\S]*?)<\/a>/)?.[1] ?? ""),
      stil: ent(blk.match(/<em>([^<]*)<\/em>/)?.[1] ?? "") || null,
      abv: num(blk.match(/([\d.]+)% ABV/)?.[1]),
      bryggeri: ent(blk.match(/data-href=":brewery"[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "") || null,
      betyg: num(blk.match(/data-rating="([\d.]+)"/)?.[1]),
    });
  }
  return ut;
}
async function lasVenue(v: { id: number; url: string }) {
  const start = new Date();
  const html = await hamtaSida(v.url);
  const namn = ent(html.match(/<h1[^>]*>([^<]+)<\/h1>/)?.[1] ?? "") || null;
  const uppd = html.match(/class="updated-time" data-time="([^"]+)"/)?.[1] ?? null;
  const val = html.match(/<select class="menu-selector">([\s\S]*?)<\/select>/)?.[1] ?? "";
  const menyer = [...val.matchAll(/<option value="(\d+)">\s*([^<]*?)\s*<\/option>/g)].map((m) => ({ id: m[1], namn: ent(m[2]) }));
  const forsta = ent(html.match(/<p class="menu-total">([\s\S]*?)<\/p>/)?.[1] ?? "") || null;
  const sidor: { meny: string | null; html: string }[] = [];
  if (!menyer.length) sidor.push({ meny: forsta, html });
  for (const [i, m] of menyer.entries()) {
    if (i === 0 && (forsta === m.namn || !forsta)) { sidor.push({ meny: m.namn, html }); continue; }
    await sleep(1500);
    sidor.push({ meny: m.namn, html: await hamtaSida(`${v.url}?menu_id=${m.id}`) });
  }
  let antal = 0, nya = 0;
  for (const s of sidor) {
    for (const o of lasMeny(s.html)) {
      antal++;
      await sql`
        insert into dryck.venue_meny (venue_id, ol_id, meny, ol_namn, bryggeri, stil, abv, global_betyg, forst_sedd, senast_sedd)
        values (${v.id}, ${o.bid}, ${s.meny}, ${o.namn}, ${o.bryggeri}, ${o.stil}, ${o.abv}, ${o.betyg}, now(), now())
        on conflict (venue_id, ol_id) do update set meny = excluded.meny, ol_namn = excluded.ol_namn, bryggeri = excluded.bryggeri,
          stil = excluded.stil, abv = excluded.abv, global_betyg = excluded.global_betyg, senast_sedd = now()`;
      const b = { bid: o.bid, beer_name: o.namn, beer_style: o.stil, beer_abv: o.abv };
      if (await laggTill(b, o.bryggeri ? { brewery_name: o.bryggeri } : null, "venue", v.id, o.betyg, false)) nya++;
    }
  }
  await sql`update dryck.venue set namn = coalesce(${namn}, namn), meny_hamtad = ${start}, meny_uppdaterad = ${uppd}, senaste_fel = null where id = ${v.id}`;
  return { venue: namn ?? v.id, menyer: sidor.map((s) => s.meny), ol: antal, kandidater: nya };
}

Deno.serve(async (req) => {
  const logg: Record<string, unknown> = {};
  anrop = 0; kvar = 100; // modulvariabler lever kvar mellan anrop i en varm worker
  try {
    const token = req.headers.get("x-import-token") ?? "";
    const [{ ok }] = await sql`select exists(select 1 from vault.decrypted_secrets where name = 'dryck_import_token' and decrypted_secret = ${token}) as ok`;
    if (!token || !ok) return new Response("unauthorized", { status: 401 });
    const {
      steg = ["liknande", "bryggeri", "berika", "onskelista"], max_anrop = 45, min_kvar = 25,
      onske_topp = 20, onske_max = 5, torrkorning = false,
    } = await req.json().catch(() => ({}));
    const [{ decrypted_secret: at }] = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'untappd_access_token'`;
    const start = Date.now();
    const stopp = () => anrop >= max_anrop || kvar < min_kvar || Date.now() - start > 120_000;
    let slut429 = false;
    const apiSteg = async (namn: string, f: () => Promise<void>) => {
      if (!steg.includes(namn) || slut429 || stopp()) return;
      try { await f(); } catch (e) {
        if (e instanceof ApiFel && e.status === 429) { slut429 = true; logg[namn + "_stopp"] = "429"; } else throw e;
      }
    };

    // 1. Liknande öl till sådant du gett högt betyg
    await apiSteg("liknande", async () => {
      const lista = await sql`
        with a as (select avg(betyg) a from dryck.v_checkin where betyg is not null)
        select c.ol_id, max(c.betyg) b from dryck.v_checkin c join dryck.ol o on o.id = c.ol_id, a
        where c.betyg >= greatest(4, a.a + 0.5) and o.liknande_hamtad is null
        group by c.ol_id order by b desc, c.ol_id desc limit 100`;
      let n = 0, k = 0;
      for (const { ol_id } of lista) {
        if (stopp()) break;
        try {
          const r = await api(`beer/info/${ol_id}`, at);
          for (const it of r?.beer?.similar?.items ?? []) if (await laggTill(it.beer, it.brewery, "liknande", ol_id, it.rating_score, false)) k++;
        } catch (e) { if (e instanceof ApiFel && e.status === 429) throw e; }
        await sql`update dryck.ol set liknande_hamtad = now() where id = ${ol_id}`;
        n++; await sleep(300);
      }
      logg.liknande = { ol: n, kandidater: k, kvar_i_ko: lista.length - n };
    });

    // 2. Favoritbryggeriers öl
    await apiSteg("bryggeri", async () => {
      const lista = await sql`
        with a as (select avg(betyg) a from dryck.v_checkin where betyg is not null)
        select c.bryggeri_id from dryck.v_checkin c join dryck.bryggeri b on b.id = c.bryggeri_id, a
        where c.betyg is not null and b.ol_lista_hamtad is null
        group by c.bryggeri_id, a.a having count(*) >= 3 and avg(c.betyg) >= a.a + 0.25
        order by avg(c.betyg) desc limit 100`;
      let n = 0, k = 0;
      for (const { bryggeri_id } of lista) {
        if (stopp()) break;
        try {
          const r = await api(`brewery/info/${bryggeri_id}`, at);
          for (const it of r?.brewery?.beer_list?.items ?? []) if (await laggTill(it.beer, it.brewery ?? r.brewery, "bryggeri", bryggeri_id, it.beer?.rating_score, true)) k++;
        } catch (e) { if (e instanceof ApiFel && e.status === 429) throw e; }
        await sql`update dryck.bryggeri set ol_lista_hamtad = now() where id = ${bryggeri_id}`;
        n++; await sleep(300);
      }
      logg.bryggeri = { bryggerier: n, kandidater: k, kvar_i_ko: lista.length - n };
    });

    // 3. Komplettera kandidater (antal betyg, beskrivning, redan druckit?)
    await apiSteg("berika", async () => {
      const lista = await sql`
        select k.ol_id from dryck.kandidat k
        where k.info_hamtad is null
        order by (select count(*) from dryck.kandidat_kalla kk where kk.ol_id = k.ol_id) desc,
                 exists(select 1 from dryck.kandidat_kalla kk where kk.ol_id = k.ol_id and kk.typ = 'venue') desc,
                 k.global_betyg desc nulls last
        limit 100`;
      let n = 0, bort = 0;
      for (const { ol_id } of lista) {
        if (stopp()) break;
        try {
          const b = (await api(`beer/info/${ol_id}`, at))?.beer;
          if (!b || Number(b.auth_rating) > 0 || Number(b.stats?.user_count) > 0) { await sql`delete from dryck.kandidat where ol_id = ${ol_id}`; bort++; }
          else if (!(await laggTill(b, b.brewery, null, 0, b.rating_score, true))) { await sql`delete from dryck.kandidat where ol_id = ${ol_id}`; bort++; }
        } catch (e) {
          if (e instanceof ApiFel && e.status === 429) throw e;
          if (e instanceof ApiFel && e.status === 404) { await sql`delete from dryck.kandidat where ol_id = ${ol_id}`; bort++; }
        }
        n++; await sleep(300);
      }
      const [{ c }] = await sql`select count(*)::int c from dryck.kandidat where info_hamtad is null`;
      logg.berika = { ol: n, borttagna: bort, kvar_i_ko: c };
    });
    if (steg.some((s: string) => ["liknande", "bryggeri", "berika", "venue"].includes(s))) logg.humle = await sql`select dryck.koppla_kandidat_humle() n`.then((r) => r[0].n);

    // 4. Venue-menyer (webbsidor, inga API-anrop)
    if (steg.includes("venue")) {
      const res: unknown[] = [];
      for (const v of await sql`select id, url from dryck.venue where aktiv order by id`) {
        try { res.push(await lasVenue(v as any)); }
        catch (e) {
          const m = String((e as Error)?.message ?? e);
          await sql`update dryck.venue set senaste_fel = ${m} where id = ${v.id}`;
          res.push({ venue: v.id, fel: m });
        }
        await sleep(2000);
      }
      logg.venue = res;
    }

    // 5. Önskelistan i Untappd
    await apiSteg("onskelista", async () => {
      // Synka det som redan står på önskelistan (sådant du lagt dit själv)
      const w = await api("user/wishlist", at, { limit: "50", sort: "date" });
      for (const it of w?.beers?.items ?? []) {
        await sql`insert into dryck.onskelista (ol_id, av) values (${it.beer.bid}, 'untappd') on conflict do nothing`;
      }
      const lagg = await sql`
        select f.ol_id, f.poang from (select ol_id, poang from dryck.v_forslag where antal_betyg >= 100 order by poang desc limit ${onske_topp}) f
        where not exists (select 1 from dryck.onskelista o where o.ol_id = f.ol_id)
        order by f.poang desc limit ${onske_max}`;
      const ut: unknown[] = [];
      for (const { ol_id, poang } of lagg) {
        if (stopp()) break;
        if (torrkorning) { ut.push({ ol_id, torrkorning: true }); continue; }
        try {
          const r = await api("user/wishlist/add", at, { bid: String(ol_id) });
          await sql`insert into dryck.onskelista (ol_id, av, poang, svar) values (${ol_id}, 'claude', ${poang}, ${r?.result ?? "ok"}) on conflict do nothing`;
          ut.push({ ol_id, svar: r?.result ?? "ok" });
        } catch (e) {
          if (e instanceof ApiFel && e.status === 429) throw e;
          await sql`insert into dryck.onskelista (ol_id, av, poang, svar) values (${ol_id}, 'claude', ${poang}, ${String((e as Error).message)}) on conflict do nothing`;
          ut.push({ ol_id, fel: String((e as Error).message) });
        }
        await sleep(500);
      }
      logg.onskelista = ut;
    });

    return Response.json({ anrop, kvar_api_anrop: kvar, ...logg });
  } catch (e) {
    const m = String((e as Error)?.message ?? e);
    try { await sql`select dryck.skicka_notis('Ölförslag: fel', ${m}, 'default')`; } catch { /* notis valfri */ }
    return Response.json({ error: m, anrop, ...logg }, { status: 500 });
  }
});
