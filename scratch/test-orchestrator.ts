import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { verifyContent } from '../src/lib/verification/orchestrator';

async function testFullVerification() {
  const text = 'Imaginea cu Papa Francisc purtând o geacă puffoasă albă a fost generată de inteligența artificială.';
  console.log('Running verifyContent locally...');
  
  const report = await verifyContent({
    text,
    inputType: 'text',
    language: 'ro',
    isPublic: false,
  });

  console.log('--- VERIFICATION REPORT RESULT ---');
  console.log('Verdict:', report.verdict);
  console.log('Score:', report.score);
  console.log('Layer 1 results count:', report.scoreBreakdown);
  console.log('Sources found:', report.sources.length);
  report.sources.forEach((s, idx) => {
    console.log(`Source [${idx + 1}]:`, s.title, '-', s.publisher || s.url);
  });
}

testFullVerification();
