// Exporterar alla dashboard-dataset (alla/untappd/iglaset) som en JSON. Anropas av GitHub Action varje natt.
// GET/POST med header x-import-token (Vault: dryck_import_token). Innehåller även ölförslag och bevakade venues.
import postgres from "npm:postgres@3.4.4";
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 1 });
const Q: Record<string, string> = {
 "oversikt": "SELECT count(*)::int AS checkins, count(DISTINCT ol_id)::int AS unika_ol, count(DISTINCT bryggeri_id)::int AS bryggerier, round(avg(betyg), 2)::float AS snittbetyg, to_char(min(tidpunkt) AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD') AS forsta, to_char(max(tidpunkt) AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD') AS senaste, count(*) FILTER (WHERE tidpunkt >= now() - interval '365 days')::int AS checkins_12m, round(avg(betyg) FILTER (WHERE tidpunkt >= now() - interval '365 days'), 2)::float AS snitt_12m, (SELECT count(DISTINCT oh.ol_id) FROM dryck.ol_humle oh)::int AS ol_med_humle FROM dryck.v_checkin WHERE (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text)",
 "per_ar": "SELECT extract(year FROM tidpunkt AT TIME ZONE 'Europe/Stockholm')::int AS ar, count(*)::int AS checkins, count(DISTINCT ol_id)::int AS unika_ol, round(avg(betyg), 2)::float AS snittbetyg FROM dryck.v_checkin WHERE (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text) GROUP BY 1 ORDER BY 1",
 "betyg_fordelning": "SELECT betyg::float AS betyg, count(*)::int AS checkins FROM dryck.v_checkin WHERE betyg IS NOT NULL AND (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text) GROUP BY betyg ORDER BY betyg",
 "stilar": "SELECT stilfamilj, count(*)::int AS checkins, count(DISTINCT ol_id)::int AS unika_ol, round(avg(betyg), 2)::float AS snittbetyg, round(avg(global_betyg), 2)::float AS globalt_snitt FROM dryck.v_checkin WHERE betyg IS NOT NULL AND stilfamilj IS NOT NULL AND (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text) GROUP BY stilfamilj HAVING count(*) >= 5 ORDER BY snittbetyg DESC",
 "humle": "WITH c AS (SELECT * FROM dryck.v_checkin WHERE betyg IS NOT NULL AND (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text)), s AS (SELECT avg(betyg) AS a FROM c) SELECT h.namn AS humle, h.ursprung, count(DISTINCT oh.ol_id)::int AS antal_ol, count(c.id)::int AS checkins, round(avg(c.betyg), 2)::float AS snittbetyg, round(avg(c.betyg) - (SELECT a FROM s), 2)::float AS diff FROM dryck.humle h JOIN dryck.ol_humle oh ON oh.humle_id = h.id JOIN c ON c.ol_id = oh.ol_id GROUP BY h.namn, h.ursprung HAVING count(c.id) >= 5 ORDER BY snittbetyg DESC",
 "bryggerier": "WITH c AS (SELECT * FROM dryck.v_checkin WHERE betyg IS NOT NULL AND bryggeri_id IS NOT NULL AND (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text)), per AS (SELECT bryggeri_id, bryggeri, bryggeri_land, count(*)::int AS checkins, count(DISTINCT ol_id)::int AS unika_ol, round(avg(betyg), 2)::float AS snittbetyg, max(betyg)::float AS basta FROM c GROUP BY bryggeri_id, bryggeri, bryggeri_land HAVING count(*) >= 5), topp AS (SELECT DISTINCT ON (bryggeri_id) bryggeri_id, ol AS basta_ol, ol_id FROM c ORDER BY bryggeri_id, betyg DESC, tidpunkt DESC) SELECT p.bryggeri, p.bryggeri_land AS land, p.checkins, p.unika_ol, p.snittbetyg, p.basta, t.basta_ol, 'https://untappd.com/beer/' || t.ol_id AS basta_ol_url FROM per p JOIN topp t ON t.bryggeri_id = p.bryggeri_id ORDER BY p.checkins DESC, p.snittbetyg DESC",
 "senaste": "SELECT id::text AS id, to_char(tidpunkt AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD') AS datum, ol, bryggeri, stil, betyg::float AS betyg, plats FROM dryck.v_checkin WHERE (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text) ORDER BY tidpunkt DESC LIMIT 20",
 "ol_topp": "SELECT ol_id::text AS id, ol, bryggeri, stilfamilj, stil, max(bryggeri_land) AS land, (SELECT string_agg(DISTINCT h.namn, '|' ORDER BY h.namn) FROM dryck.ol_humle oh JOIN dryck.humle h ON h.id = oh.humle_id WHERE oh.ol_id = v_checkin.ol_id) AS humle, count(*)::int AS checkins, round(avg(betyg), 2)::float AS mitt_betyg, max(global_betyg)::float AS globalt, max(abv)::float AS abv, to_char(max(tidpunkt) AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD') AS senast, 'https://untappd.com/beer/' || ol_id AS url FROM dryck.v_checkin WHERE betyg IS NOT NULL AND ol_id IS NOT NULL AND (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text) GROUP BY ol_id, ol, bryggeri, stilfamilj, stil ORDER BY mitt_betyg DESC, checkins DESC, globalt DESC NULLS LAST",
 "lander": "WITH c AS (SELECT * FROM dryck.v_checkin WHERE bryggeri_land IS NOT NULL AND (COALESCE($1::text, 'alla') = 'alla' OR ursprung = $1::text)), per AS (SELECT bryggeri_land AS land, count(*)::int AS checkins, count(DISTINCT ol_id)::int AS unika_ol, count(DISTINCT bryggeri_id)::int AS bryggerier, round(avg(betyg), 2)::float AS snittbetyg FROM c GROUP BY 1), topp AS (SELECT DISTINCT ON (bryggeri_land) bryggeri_land AS land, ol AS basta_ol, ol_id, betyg FROM c WHERE betyg IS NOT NULL ORDER BY bryggeri_land, betyg DESC, tidpunkt DESC) SELECT p.*, t.basta_ol, t.betyg::float AS basta, 'https://untappd.com/beer/' || t.ol_id AS basta_ol_url FROM per p LEFT JOIN topp t USING (land) ORDER BY p.checkins DESC"
};
Deno.serve(async (req) => {
  try {
    const token = req.headers.get("x-import-token") ?? "";
    const [{ ok }] = await sql`select exists(select 1 from vault.decrypted_secrets where name = 'dryck_import_token' and decrypted_secret = ${token}) as ok`;
    if (!token || !ok) return new Response("unauthorized", { status: 401 });
    const ut: Record<string, Record<string, unknown>> = {};
    for (const kalla of ["alla", "untappd", "iglaset"]) {
      ut[kalla] = {};
      for (const [id, q] of Object.entries(Q)) ut[kalla][id] = await sql.unsafe(q, [kalla]);
    }
    // Ölförslag (oberoende av urvalet Untappd/iglaset)
    const forslag = await sql`
      select ol_id::text id, namn, bryggeri, land, stil, stilfamilj, abv::float, round(global_betyg, 2)::float globalt, antal_betyg,
             poang::float, finns_pa, pa_onskelistan, varfor, url, systembolaget
      from (select *, row_number() over (order by poang desc) rn from dryck.v_forslag) f
      where rn <= 400 or finns_pa is not null order by poang desc`;
    const venuer = await sql`
      select v.namn, v.url, to_char(v.meny_uppdaterad at time zone 'Europe/Stockholm', 'YYYY-MM-DD') uppdaterad,
             count(m.ol_id) filter (where m.senast_sedd >= v.meny_hamtad)::int ol
      from dryck.venue v left join dryck.venue_meny m on m.venue_id = v.id
      where v.aktiv group by v.id order by v.namn`;
    return Response.json({ skapad: new Date().toISOString(), data: ut, forslag, venuer });
  } catch (e) {
    return Response.json({ error: String((e as Error)?.message ?? e) }, { status: 500 });
  }
});
