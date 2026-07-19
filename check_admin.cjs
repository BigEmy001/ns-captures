const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.service_role);

async function main() {
  const { data, error } = await supabase.from('profiles').select('*').eq('role', 'Admin');
  if (error) console.error(error);
  console.log("Admin profiles:", data);
  const { data: users, error: err2 } = await supabase.auth.admin.listUsers();
  if (err2) console.error(err2);
  const admins = users.users.filter(u => data.map(d => d.id).includes(u.id));
  console.log("Admin auth users:", admins.map(u => ({ email: u.email })));
}
main();
