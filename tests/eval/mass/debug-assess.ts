import fs from 'fs';
for (const line of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i !== -1 && !process.env[t.slice(0, i).trim()]) process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
delete process.env.NEXT_PUBLIC_SUPABASE_URL; delete process.env.SUPABASE_SERVICE_ROLE_KEY;
const realFetch = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any) => {
  const res = await realFetch(url, init);
  if (String(url).includes('openrouter') && init?.body?.includes('REGULI METODOLOGICE')) {
    const body = JSON.parse(init.body);
    const clone = await res.clone().json();
    const p = body.messages[0].content;
    console.log('=== ASSESSMENT PROMPT EVIDENCE ===\n' + p.slice(p.indexOf('DOVEZI'), p.indexOf('REGULI')));
    console.log('=== ASSESSMENT RESPONSE ===\n' + clone.choices?.[0]?.message?.content);
  }
  return res;
}) as any;
import { verifyContent } from '../../../src/lib/verification/orchestrator';
verifyContent({ text: process.argv[2], inputType: 'text', language: 'ro', isPublic: false }).then((r) => console.log('VERDICT', r.verdict, r.score));
