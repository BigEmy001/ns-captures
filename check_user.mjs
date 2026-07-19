import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gonuhcxbwuuqnlmwysiw.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdvbnVoY3hid3V1cW5sbXd5c2l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzk5MDEwNywiZXhwIjoyMDk5NTY2MTA3fQ.WCkeWXLqxeacM1jM_AmpalZx3QjD_taOP1wex102BNM';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkUser() {
  const { data, error } = await supabase
    .from('profiles')
    .select('email, verification_status, name')
    .eq('email', 'emy.jnr@nscaptures.com');

  if (error) {
    console.error('Error fetching user:', error);
  } else {
    console.log('User Data:', JSON.stringify(data, null, 2));
  }
}

checkUser();
