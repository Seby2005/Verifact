// =============================================================================
// Verifact — Edge Function: Reset Monthly Verification Counters
// =============================================================================
// Deployment:
//   supabase functions deploy reset-monthly-verifications
//
// Scheduling (via pg_cron in Supabase Dashboard > Database > Extensions):
//   SELECT cron.schedule(
//     'reset-monthly-verifications',
//     '0 2 * * *',   -- Daily at 2:00 AM UTC
//     $$
//     SELECT net.http_post(
//       url := '<SUPABASE_URL>/functions/v1/reset-monthly-verifications',
//       headers := jsonb_build_object(
//         'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
//         'Content-Type', 'application/json'
//       ),
//       body := '{}'::jsonb
//     );
//     $$
//   );
//
// This function checks all profiles where verifications_reset is older
// than one calendar month. For those profiles, it resets:
//   - verifications_count = 0
//   - verifications_reset = CURRENT_DATE
//
// It is idempotent: running it multiple times on the same day has no
// additional effect because verifications_reset is updated on first run.
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization — only service_role can call this
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Calculate the cutoff date: one calendar month ago
    const now = new Date();
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    // Find all profiles whose reset date is older than one month
    const { data: profilesToReset, error: selectError } = await supabase
      .from('profiles')
      .select('id, verifications_reset, verifications_count')
      .lt('verifications_reset', cutoffDateStr)
      .gt('verifications_count', 0);

    if (selectError) {
      console.error('Error fetching profiles:', selectError.message);
      return new Response(
        JSON.stringify({ error: selectError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profilesToReset || profilesToReset.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No profiles need reset', resetCount: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const todayStr = now.toISOString().split('T')[0];
    const profileIds = profilesToReset.map((p: { id: string }) => p.id);

    // Reset counters for all eligible profiles
    const { error: updateError, count } = await supabase
      .from('profiles')
      .update({
        verifications_count: 0,
        verifications_reset: todayStr,
      })
      .in('id', profileIds);

    if (updateError) {
      console.error('Error resetting counters:', updateError.message);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Reset verification counters for ${count ?? profileIds.length} profiles`);

    return new Response(
      JSON.stringify({
        message: 'Monthly verification counters reset successfully',
        resetCount: count ?? profileIds.length,
        cutoffDate: cutoffDateStr,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Unexpected error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
