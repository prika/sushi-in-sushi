import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoles() {
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('*');

  console.log('Roles:', JSON.stringify(roles, null, 2));
  if (rolesError) console.error('Roles error:', rolesError);

  // Also check staff with role join
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('email, password_hash, is_active, role:roles(id, name)')
    .in('email', ['admin@sushinsushi.pt', 'cozinha@sushinsushi.pt', 'empregado@sushinsushi.pt']);

  console.log('\nStaff with roles:', JSON.stringify(staff, null, 2));
  if (staffError) console.error('Staff error:', staffError);
}

checkRoles();
