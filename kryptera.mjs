// node kryptera.mjs export.json data.enc.json  (lösenord i env SITE_PASSWORD)
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { gzipSync } from 'node:zlib';
const [, , inp, out] = process.argv;
const pw = process.env.SITE_PASSWORD;
if (!pw || !inp || !out) { console.error('Användning: SITE_PASSWORD=… node kryptera.mjs in.json ut.json'); process.exit(1); }
const json = JSON.parse(readFileSync(inp, 'utf8'));
if (!json.data || json.error) { console.error('Ogiltigt export-svar:', String(json.error || 'saknar data')); process.exit(1); }
const iter = 250000;
const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, gzipSync(Buffer.from(JSON.stringify(json)))));
const b64 = (u) => Buffer.from(u).toString('base64');
writeFileSync(out, JSON.stringify({ v: 1, iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) }));
console.log('Krypterat:', ct.length, 'bytes');
