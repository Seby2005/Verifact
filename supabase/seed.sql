-- =============================================================================
-- Verifact — Seed data for local development
-- =============================================================================
-- Usage: supabase db reset (automatically runs seed.sql after migrations)
-- NOTE: This seed data requires auth.users to exist first.
-- When using `supabase db reset`, users must be created via Supabase dashboard
-- or auth API. The profiles below use placeholder UUIDs.
-- =============================================================================

-- Placeholder UUIDs for test users (these would be created via auth signup)
-- In local dev, create these users via Supabase dashboard or auth API first,
-- then the on_auth_user_created trigger will auto-create profiles.
-- The seed below manually inserts profiles for testing without auth.

-- =============================================================================
-- Test Profiles
-- =============================================================================
INSERT INTO public.profiles (id, username, tier, role, verifications_count, verifications_reset, preferred_language, created_at, updated_at)
VALUES
  -- Free tier users
  ('a0000000-0000-0000-0000-000000000001', 'maria_free', 'free', 'user', 3, CURRENT_DATE, 'ro', NOW() - INTERVAL '30 days', NOW()),
  ('a0000000-0000-0000-0000-000000000002', 'ion_free', 'free', 'user', 9, CURRENT_DATE, 'ro', NOW() - INTERVAL '25 days', NOW()),
  ('a0000000-0000-0000-0000-000000000003', 'emily_free', 'free', 'user', 0, CURRENT_DATE, 'en', NOW() - INTERVAL '10 days', NOW()),
  -- Pro tier users
  ('b0000000-0000-0000-0000-000000000001', 'andrei_pro', 'pro', 'user', 45, CURRENT_DATE, 'ro', NOW() - INTERVAL '60 days', NOW()),
  ('b0000000-0000-0000-0000-000000000002', 'jane_pro', 'pro', 'user', 120, CURRENT_DATE, 'en', NOW() - INTERVAL '45 days', NOW()),
  -- Business tier users
  ('c0000000-0000-0000-0000-000000000001', 'media_org', 'business', 'user', 500, CURRENT_DATE, 'ro', NOW() - INTERVAL '90 days', NOW()),
  ('c0000000-0000-0000-0000-000000000002', 'factcheck_ngo', 'business', 'user', 1200, CURRENT_DATE, 'en', NOW() - INTERVAL '120 days', NOW()),
  -- Admin user
  ('d0000000-0000-0000-0000-000000000001', 'admin_verifact', 'business', 'admin', 0, CURRENT_DATE, 'ro', NOW() - INTERVAL '180 days', NOW()),
  -- Moderator user
  ('d0000000-0000-0000-0000-000000000002', 'mod_verifact', 'pro', 'moderator', 10, CURRENT_DATE, 'ro', NOW() - INTERVAL '90 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Test Verifications (20+ with varied verdicts, statuses, visibility)
-- =============================================================================
INSERT INTO public.verifications (id, user_id, input_type, input_text, input_url, verdict, score, report_json, is_public, language, processing_time_ms, status, anonymous_hash, created_at)
VALUES
  -- Maria's verifications (free tier)
  ('e0000001-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'text',
   'Vaccinurile COVID-19 conțin microcipuri implantate de Bill Gates.',
   NULL, 'false', 8, '{"executiveSummary": "Afirmație falsă. Nu există nicio dovadă că vaccinurile conțin microcipuri.", "layers": {"layer1": {"status": "done", "results": []}, "layer2": {"status": "done", "results": []}, "layer3": {"status": "done", "results": []}, "layer4": {"status": "done", "results": []}}}',
   TRUE, 'ro', 12340, 'completed', NULL, NOW() - INTERVAL '28 days'),

  ('e0000001-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'url',
   'România a adoptat un nou cod fiscal în 2025.',
   'https://example-news.ro/cod-fiscal-2025', 'partial', 62, '{"executiveSummary": "Parțial adevărat. Au fost propuse modificări, dar nu un cod complet nou."}',
   TRUE, 'ro', 8900, 'completed', NULL, NOW() - INTERVAL '20 days'),

  ('e0000001-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'screenshot',
   'Președintele a declarat că economia a crescut cu 10% în ultimul an.',
   NULL, 'false', 22, '{"executiveSummary": "Fals. Creșterea economică reală a fost de 2.1% conform INS."}',
   FALSE, 'ro', 15200, 'completed', NULL, NOW() - INTERVAL '15 days'),

  -- Ion's verifications (free tier, almost at limit)
  ('e0000002-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'text',
   'UE va interzice mașinile diesel din 2030.',
   NULL, 'partial', 55, '{"executiveSummary": "Parțial adevărat. UE planifică eliminarea treptată, dar termenul nu e 2030."}',
   TRUE, 'ro', 11200, 'completed', NULL, NOW() - INTERVAL '18 days'),

  ('e0000002-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'text',
   'Salariul minim pe economie va crește la 5000 lei din ianuarie.',
   NULL, 'unclear', 48, '{"executiveSummary": "Neclar. Nu există o confirmare oficială pentru această sumă exactă."}',
   TRUE, 'ro', 9800, 'completed', NULL, NOW() - INTERVAL '12 days'),

  -- Emily's verifications (free tier, English)
  ('e0000003-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'text',
   'The Great Wall of China is visible from space with the naked eye.',
   NULL, 'false', 15, '{"executiveSummary": "False. NASA has confirmed this is a common misconception."}',
   TRUE, 'en', 7600, 'completed', NULL, NOW() - INTERVAL '8 days'),

  -- Andrei's verifications (pro tier)
  ('e0000004-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'text',
   'Guvernul a alocat 2 miliarde euro pentru infrastructura rutieră în 2026.',
   NULL, 'true', 87, '{"executiveSummary": "Adevărat. Bugetul alocat confirmă această sumă conform HG publicat."}',
   TRUE, 'ro', 10500, 'completed', NULL, NOW() - INTERVAL '22 days'),

  ('e0000004-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'url',
   'OMS a declarat pandemia oficială de gripă aviară H5N1.',
   'https://example-health.com/h5n1-pandemic', 'false', 12, '{"executiveSummary": "Fals. OMS nu a declarat pandemie de gripă aviară la data verificării."}',
   TRUE, 'ro', 13800, 'completed', NULL, NOW() - INTERVAL '16 days'),

  ('e0000004-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'text',
   'Rata inflației în România a scăzut sub 5% în iunie 2026.',
   NULL, 'true', 91, '{"executiveSummary": "Adevărat. Conform datelor INS, rata anuală a inflației a fost 4.8%."}',
   FALSE, 'ro', 9200, 'completed', NULL, NOW() - INTERVAL '5 days'),

  -- Jane's verifications (pro tier, English)
  ('e0000005-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'text',
   'AI will replace 80% of jobs by 2030 according to the World Economic Forum.',
   NULL, 'false', 18, '{"executiveSummary": "False. WEF reports suggest AI will transform jobs, not eliminate 80%."}',
   TRUE, 'en', 11900, 'completed', NULL, NOW() - INTERVAL '14 days'),

  ('e0000005-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'text',
   'The EU has approved a universal basic income pilot program in 2026.',
   NULL, 'partial', 45, '{"executiveSummary": "Partially true. Some member states have pilots, but no EU-wide program."}',
   TRUE, 'en', 10300, 'completed', NULL, NOW() - INTERVAL '9 days'),

  -- Media org verifications (business tier)
  ('e0000006-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'text',
   'Primăria București a aprobat construcția a 50 km de piste de biciclete în 2026.',
   NULL, 'partial', 58, '{"executiveSummary": "Parțial. Proiectul a fost aprobat, dar pentru 30 km, nu 50 km."}',
   TRUE, 'ro', 14100, 'completed', NULL, NOW() - INTERVAL '7 days'),

  ('e0000006-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'text',
   'România a depășit Grecia la PIB per capita PPP.',
   NULL, 'true', 82, '{"executiveSummary": "Adevărat. Conform Eurostat, România a depășit Grecia în 2025."}',
   TRUE, 'ro', 8700, 'completed', NULL, NOW() - INTERVAL '3 days'),

  -- Anonymous verifications (no user_id)
  ('e0000007-0000-0000-0000-000000000001', NULL, 'text',
   '5G cauzează cancer și modifică ADN-ul uman.',
   NULL, 'false', 5, '{"executiveSummary": "Fals. Nu există dovezi științifice că 5G cauzează cancer sau modifică ADN."}',
   TRUE, 'ro', 7800, 'completed', 'abc123hash', NOW() - INTERVAL '25 days'),

  ('e0000007-0000-0000-0000-000000000002', NULL, 'text',
   'Drinking 8 glasses of water per day is scientifically proven necessary.',
   NULL, 'partial', 40, '{"executiveSummary": "Partially true. Hydration needs vary; the 8-glass rule is not scientifically backed."}',
   TRUE, 'en', 6500, 'completed', 'def456hash', NOW() - INTERVAL '20 days'),

  -- Pending/processing/failed verifications for testing progress tracker
  ('e0000008-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'text',
   'Test verificare în curs de procesare.',
   NULL, NULL, NULL, NULL,
   FALSE, 'ro', NULL, 'processing', NULL, NOW() - INTERVAL '1 minute'),

  ('e0000008-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'text',
   'Test verificare eșuată.',
   NULL, NULL, NULL, NULL,
   FALSE, 'ro', NULL, 'failed', NULL, NOW() - INTERVAL '2 hours'),

  ('e0000008-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'text',
   'Test verification pending review.',
   NULL, NULL, NULL, NULL,
   FALSE, 'en', NULL, 'pending', NULL, NOW() - INTERVAL '30 minutes'),

  -- Additional public verifications for feed testing
  ('e0000009-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'text',
   'Climate change has caused sea levels to rise by 1 meter in the last decade.',
   NULL, 'false', 20, '{"executiveSummary": "False. Sea levels have risen by approximately 3.6mm/year, not 1 meter per decade."}',
   TRUE, 'en', 9400, 'completed', NULL, NOW() - INTERVAL '11 days'),

  ('e0000009-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'text',
   'NASA has discovered evidence of microbial life on Mars.',
   NULL, 'unclear', 50, '{"executiveSummary": "Unclear. NASA has found organic molecules but has not confirmed microbial life."}',
   TRUE, 'en', 12100, 'completed', NULL, NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Test Cached Results
-- =============================================================================
INSERT INTO public.cached_results (id, content_hash, result_json, hits, disputed_count, expires_at, created_at)
VALUES
  ('f0000001-0000-0000-0000-000000000001',
   'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
   '{"verdict": "false", "score": 8}',
   15, 0, NOW() + INTERVAL '7 days', NOW() - INTERVAL '20 days'),
  ('f0000001-0000-0000-0000-000000000002',
   'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
   '{"verdict": "true", "score": 87}',
   8, 0, NOW() + INTERVAL '14 days', NOW() - INTERVAL '10 days'),
  ('f0000001-0000-0000-0000-000000000003',
   'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
   '{"verdict": "partial", "score": 55}',
   3, 2, NOW() + INTERVAL '3 days', NOW() - INTERVAL '15 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Test Disputes
-- =============================================================================
INSERT INTO public.disputes (id, verification_id, reporter_email, reporter_user_id, reason, status, resolved_by, resolution_note, created_at, resolved_at)
VALUES
  -- Open dispute on a public verification
  ('10000001-0000-0000-0000-000000000001',
   'e0000001-0000-0000-0000-000000000001',
   NULL, 'a0000000-0000-0000-0000-000000000002',
   'Raportul nu menționează studiile OMS recente care confirmă siguranța vaccinurilor. Ar trebui adăugate ca surse.',
   'open', NULL, NULL, NOW() - INTERVAL '10 days', NULL),

  -- Resolved dispute
  ('10000001-0000-0000-0000-000000000002',
   'e0000002-0000-0000-0000-000000000001',
   'external_reporter@email.com', NULL,
   'Termenul corect pentru interdicția mașinilor diesel este 2035, nu 2030. Sursa: regulamentul EU 2023/851.',
   'resolved_edited', 'd0000000-0000-0000-0000-000000000001',
   'Am actualizat raportul cu termenul corect și sursa citată.',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),

  -- Another open dispute
  ('10000001-0000-0000-0000-000000000003',
   'e0000006-0000-0000-0000-000000000001',
   NULL, 'b0000000-0000-0000-0000-000000000001',
   'Conform hotărârii consiliului local din martie 2026, proiectul aprobat este de fapt de 45 km, nu 30 km cum sugerează raportul.',
   'reviewing', NULL, NULL, NOW() - INTERVAL '5 days', NULL)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Test API Call Logs
-- =============================================================================
INSERT INTO public.api_call_logs (id, verification_id, provider, endpoint, latency_ms, status_code, success, estimated_cost_usd, created_at)
VALUES
  ('20000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', 'google_factcheck', '/v1alpha1/claims:search', 450, 200, TRUE, 0.000000, NOW() - INTERVAL '28 days'),
  ('20000001-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', 'google_custom_search', '/customsearch/v1', 820, 200, TRUE, 0.005000, NOW() - INTERVAL '28 days'),
  ('20000001-0000-0000-0000-000000000003', 'e0000001-0000-0000-0000-000000000001', 'gemini', '/v1beta/models/gemini-2.0-flash:generateContent', 3200, 200, TRUE, 0.002000, NOW() - INTERVAL '28 days'),
  ('20000001-0000-0000-0000-000000000004', 'e0000001-0000-0000-0000-000000000001', 'newsapi', '/v2/everything', 1100, 200, TRUE, 0.000000, NOW() - INTERVAL '28 days'),
  ('20000001-0000-0000-0000-000000000005', 'e0000004-0000-0000-0000-000000000001', 'google_vision', '/v1/images:annotate', 1500, 200, TRUE, 0.001500, NOW() - INTERVAL '22 days'),
  ('20000001-0000-0000-0000-000000000006', 'e0000004-0000-0000-0000-000000000002', 'gemini', '/v1beta/models/gemini-2.0-flash:generateContent', 4500, 500, FALSE, 0.000000, NOW() - INTERVAL '16 days'),
  ('20000001-0000-0000-0000-000000000007', 'e0000005-0000-0000-0000-000000000001', 'google_factcheck', '/v1alpha1/claims:search', 380, 200, TRUE, 0.000000, NOW() - INTERVAL '14 days'),
  ('20000001-0000-0000-0000-000000000008', 'e0000005-0000-0000-0000-000000000001', 'gemini', '/v1beta/models/gemini-2.0-flash:generateContent', 2800, 200, TRUE, 0.002000, NOW() - INTERVAL '14 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Test Subscriptions
-- =============================================================================
INSERT INTO public.subscriptions (id, user_id, tier, status, stripe_customer_id, stripe_subscription_id, current_period_end, created_at)
VALUES
  ('30000001-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'pro', 'active', NULL, NULL, NOW() + INTERVAL '30 days', NOW() - INTERVAL '60 days'),
  ('30000001-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'pro', 'active', NULL, NULL, NOW() + INTERVAL '15 days', NOW() - INTERVAL '45 days'),
  ('30000001-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'business', 'active', NULL, NULL, NOW() + INTERVAL '25 days', NOW() - INTERVAL '90 days'),
  ('30000001-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'business', 'pending_manual', NULL, NULL, NULL, NOW() - INTERVAL '5 days')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Test Admin Actions
-- =============================================================================
INSERT INTO public.admin_actions (id, admin_id, action_type, target_table, target_id, details, created_at)
VALUES
  ('40000001-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'dispute_resolved', 'disputes', '10000001-0000-0000-0000-000000000002',
   '{"resolution": "resolved_edited", "note": "Updated report with correct EU regulation deadline"}',
   NOW() - INTERVAL '12 days'),
  ('40000001-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'user_role_changed', 'profiles', 'd0000000-0000-0000-0000-000000000002',
   '{"old_role": "user", "new_role": "moderator"}',
   NOW() - INTERVAL '90 days')
ON CONFLICT (id) DO NOTHING;
