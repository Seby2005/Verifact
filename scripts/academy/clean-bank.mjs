#!/usr/bin/env node
/**
 * Cleans the Academy bank down to claims that read as fair, self-contained
 * quiz questions.
 *
 * Harvested claims carry the residue of where they came from: social captions
 * leave `//` and `|` wrappers and connectors like "iată cum…", screenshots
 * arrive in ALL CAPS, and many entries only make sense next to a video or image
 * the player can't see ("Videoclipul arată…"). None of those can be reasoned
 * about, so markup is stripped where possible and the rest is dropped.
 *
 * Text is normalized to NFC before matching so precomposed and decomposed
 * diacritics compare equal. Idempotent. Run: node scripts/academy/clean-bank.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BANK = resolve(dirname(fileURLToPath(import.meta.url)), '../../src/lib/academy/bank.json');
const bank = JSON.parse(readFileSync(BANK, 'utf8'));

const Q = '"‘’“”„‟«»‹›';
const LEAD = new RegExp(`^[${Q}\\-\\u2013\\u2014:;.\\s]+`);
const TRAIL = new RegExp(`[${Q}\\s]+\\.?$`);

function clean(text) {
  if (!text) return text;
  let s = text.normalize('NFC').replace(/\/\//g, ' ').replace(/[|\\]/g, ' ').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 5; i++) {
    const before = s;
    s = s.replace(LEAD, '').replace(TRAIL, '').trim();
    if (s === before) break;
  }
  return s;
}

// References to media the player can't see — the claim is unanswerable alone.
const MEDIA = /(fotografie|imagine|poză|videoclip|filmuleț|clip|video|înregistrare)[^.]{0,30}(arată|arata|prezint|surprinde|circulă|circula)|imagini (cu|din|trucate|manipulate|în care)|acest afiș|this (video|image|photo|clip)|the (video|image|photo|footage) shows/i;
// Caption connectors — a fragment of a longer post rather than a statement.
const CAPTION = /\b(iată (cum|de ce|cât)|uite (cum|ce|de ce)|vezi (cum|ce)|nu ratați|distribuie|abonează|urmărește|apasă)\b/i;
// Untranslated English that leaked into a Romanian quiz.
const ENGLISH = /\b(the|is|was|were|says?|people|report|vaccine|died|with|from|have|that|does)\b/gi;
const HAS_RO = /[ăâîșțĂÂÎȘȚ]/;

function isJunk(raw) {
  const t = (raw || '').normalize('NFC');
  if (!t || t.length < 32 || t.length > 240) return true;
  if (t.includes('//')) return true;
  if (MEDIA.test(t)) return true;
  if (CAPTION.test(t)) return true;
  if (/([A-ZĂÂÎȘȚ]{3,}\s+){3,}/.test(t)) return true; // ALL-CAPS clickbait
  if (!HAS_RO.test(t) && (t.match(ENGLISH) || []).length >= 2) return true; // untranslated
  if (t.split(/\s+/).filter((w) => w.length > 2).length < 5) return true;
  return false;
}

let cleaned = 0;
let dropped = 0;
const kept = [];
for (const it of bank.items) {
  const src = it.claimRo || it.claim;
  const c = clean(src);
  if (c !== src) {
    if (it.claimRo) it.claimRo = c;
    else it.claim = c;
    cleaned += 1;
  }
  if (isJunk(it.claimRo || it.claim)) {
    dropped += 1;
    continue;
  }
  kept.push(it);
}

bank.items = kept;
const counts = { ro: 0, eu: 0, world: 0 };
for (const i of bank.items) counts[i.region] += 1;
bank.counts = { ...counts, total: bank.items.length };
writeFileSync(BANK, JSON.stringify(bank, null, 0));

console.log(`cleaned markup on ${cleaned} items, dropped ${dropped} junk`);
console.log('bank:', bank.counts);
