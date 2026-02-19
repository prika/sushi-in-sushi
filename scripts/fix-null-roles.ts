import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findAndFixNullRoles() {
  console.log("🔍 Finding staff with null roles...\n");

  // Find staff with null role_id
  const { data: staffWithNullRole, error: staffError } = await supabase
    .from("staff")
    .select("id, name, email, role_id")
    .is("role_id", null);

  if (staffError) {
    console.error("Error fetching staff:", staffError);
    return;
  }

  if (!staffWithNullRole || staffWithNullRole.length === 0) {
    console.log("✅ No staff members with null roles found!");
    return;
  }

  console.log(`Found ${staffWithNullRole.length} staff member(s) with null role:\n`);
  staffWithNullRole.forEach((s) => {
    console.log(`  - ${s.name} (${s.email}) - ID: ${s.id}`);
  });

  // Get available roles
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, name");

  if (rolesError) {
    console.error("Error fetching roles:", rolesError);
    return;
  }

  console.log("\n📋 Available roles:");
  roles?.forEach((r) => {
    console.log(`  - ${r.name}: ${r.id}`);
  });

  console.log("\n💡 To fix, run:");
  console.log("   UPDATE staff SET role_id = '<role_id>' WHERE id = '<staff_id>';");
}

findAndFixNullRoles();
