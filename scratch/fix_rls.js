const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const service = createClient(url, serviceKey);

async function testConnection() {
  const { data, error } = await service.from('profiles').select('count', { count: 'exact', head: true });
  console.log('Service role profile query:', { data, error });
}

testConnection();
