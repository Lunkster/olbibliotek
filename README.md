# Ölbiblioteket

Lösenordsskyddad statistiksida över Henriks ölloggar (Untappd + iglaset), publicerad på GitHub Pages.

**Flöde:** GitHub Action (varje natt 03:45 UTC + vid push + manuellt) → hämtar all statistik från Supabase-funktionen `dryck-export`
→ krypterar med AES-GCM (nyckel från lösenordet via PBKDF2) → publicerar `data.enc.json` tillsammans med sidan.
Lösenordet och datan finns aldrig i klartext i repot. Webbläsaren dekrypterar lokalt.

**Secrets (Settings → Secrets and variables → Actions):**
- `EXPORT_TOKEN` – samma värde som Vault-hemligheten `dryck_import_token` i Supabase.
- `SITE_PASSWORD` – lösenordet för sidan. Byt det och kör workflowet igen för att byta lösenord.

**Pages:** Settings → Pages → Source: *GitHub Actions*.

Lokalt test: `SITE_PASSWORD=x node kryptera.mjs export.json data.enc.json`.
Edge-funktionens källkod finns i `supabase/dryck-export.ts` (driftsatt som `dryck-export`, verify_jwt av).
