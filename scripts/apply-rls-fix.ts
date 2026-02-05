/**
 * Apply RLS fix for staff table
 * Run with: npx tsx scripts/apply-rls-fix.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testAndFix() {
  console.log("🔧 Testing staff table access...\n");

  // Test query with service role (should always work)
  const { data: staffData, error: staffErr } = await supabase
    .from("staff")
    .select(`
      id,
      name,
      email,
      role:roles(id, name)
    `)
    .limit(5);

  if (staffErr) {
    console.error("❌ Error querying staff:", staffErr.message);
  } else {
    console.log("✅ Staff query works with service role key");
    console.log(`   Found ${staffData?.length} staff members:\n`);
    staffData?.forEach((s) => {
      const roleData = s.role as unknown;
      const role = Array.isArray(roleData) ? roleData[0] : roleData;
      const roleName = role && typeof role === 'object' && 'name' in role ? (role as { name: string }).name : null;
      console.log(`   - ${s.name}: ${roleName || "NO ROLE"}`);
    });
  }

  // Test roles query
  const { data: rolesData, error: rolesErr } = await supabase
    .from("roles")
    .select("*");

  if (rolesErr) {
    console.error("\n❌ Error querying roles:", rolesErr.message);
  } else {
    console.log(`\n✅ Roles query works: ${rolesData?.length} roles found`);
  }

  // Check current RLS policies on staff table
  console.log("\n📋 Checking RLS policies on staff table...");

  let policies = null;
  let polErr = null;
  try {
    const result = await supabase.rpc("get_policies_for_table", { table_name: "staff" });
    policies = result.data;
    polErr = result.error;
  } catch {
    polErr = { message: "RPC not available" };
  }

  if (polErr || !policies) {
    console.log("   Cannot query policies via RPC");
    console.log("\n" + "=".repeat(60));
    console.log("📝 MANUAL FIX REQUIRED:");
    console.log("=".repeat(60));
    console.log("\nGo to: Supabase Dashboard > SQL Editor");
    console.log("Run this SQL:\n");
    console.log(`
-- Drop the restrictive policy
DROP POLICY IF EXISTS "Authenticated staff can view staff" ON staff;

-- Create permissive SELECT policy
CREATE POLICY "Anyone can view staff" ON staff
    FOR SELECT USING (true);

-- Verify
SELECT * FROM pg_policies WHERE tablename = 'staff';
`);
    console.log("=".repeat(60));
  }
}

testAndFix().catch(console.error);
