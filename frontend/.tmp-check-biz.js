let dotenv; try { dotenv = require('dotenv'); } catch (e) { console.error('dotenv missing'); process.exit(1); }
dotenv.config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) { console.error('Missing supabase env'); process.exit(1); }
const sb = createClient(url, key);
const term = process.argv[2] || 'ellamara';
(async () => {
  const selectors = [
    'id,user_id,business_name,name,description,category,industry',
    'id,user_id,business_name,name,description',
    'id,user_id,business_name,name'
  ];
  let data=null; let error=null;
  for (const sel of selectors){
    const res = await sb.from('business_profiles').select(sel);
    if (!res.error){ data = res.data; break; }
    error = res.error;
    const msg = String(res.error.message||'');
    if (!/does not exist|Could not find/i.test(msg)) break;
  }
  if (!data){ console.error(error); return; }
  const q = term.toLowerCase();
  const filtered = (data || []).filter((b) => {
    const name = (b.business_name || b.name || '').toLowerCase();
    const desc = (b.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
  console.log({ term, total: (data || []).length, matched: filtered.length, sample: filtered.slice(0, 5) });
})();
