import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gonuhcxbwuuqnlmwysiw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbnVoY3hid3V1cW5sbXd5c2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk5MDEwNywiZXhwIjoyMDk5NTY2MTA3fQ.WCkeWXLqxeacM1jM_AmpalZx3QjD_taOP1wex102BNM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUser() {
  console.log("Scanning for any other photographers created under the old trigger...");
  
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, name, email, slug, role')
    .eq('role', 'Photographer');
    
  if (pErr) {
    console.error("Scan failed:", pErr);
    return;
  }
  
  const broken = profiles.filter(p => !p.email || !p.slug);
  console.log(`Found ${broken.length} photographer profiles with missing email or slug:`);
  console.log(JSON.stringify(broken, null, 2));
}

checkUser();
