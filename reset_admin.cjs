const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if(key && val.length) acc[key.trim()] = val.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.service_role);

async function main() {
  const adminId = 'af53325a-db1d-4cd9-a5b3-f8b0fc3fc28f';
  const { data, error } = await supabase.auth.admin.getUserById(adminId);
  if (error) {
    console.error("Error fetching user:", error);
    return;
  }
  console.log("Admin email is:", data.user.email);
  
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(adminId, { password: 'AdminPassword123!' });
  if (updateError) {
    console.error("Error updating password:", updateError);
  } else {
    console.log("Successfully reset admin password to 'AdminPassword123!'");
  }
}
main();
