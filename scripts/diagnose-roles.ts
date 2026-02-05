/**
 * Diagnostic script to check roles and staff data in the database
 * Run with: npx tsx scripts/diagnose-roles.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function diagnose() {
  console.log("🔍 Diagnosing roles and staff data...\n");
  console.log("=".repeat(60));

  // 1. Check roles table
  console.log("\n📋 ROLES TABLE:");
  console.log("-".repeat(40));
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("*")
    .order("id");

  if (rolesError) {
    console.error("❌ Error fetching roles:", rolesError.message);
    console.error("   Code:", rolesError.code);
    console.error("   Details:", rolesError.details);
  } else if (!roles || roles.length === 0) {
    console.log("⚠️  No roles found in database!");
    console.log("   Run the migrations to create default roles.");
  } else {
    console.log(`✅ Found ${roles.length} role(s):\n`);
    roles.forEach((r) => {
      console.log(`   ID: ${r.id} | Name: ${r.name} | Description: ${r.description || "N/A"}`);
    });
  }

  // 2. Check staff table
  console.log("\n\n👥 STAFF TABLE:");
  console.log("-".repeat(40));
  const { data: staff, error: staffError } = await supabase
    .from("staff")
    .select("id, email, name, role_id, is_active, location")
    .order("name");

  if (staffError) {
    console.error("❌ Error fetching staff:", staffError.message);
    console.error("   Code:", staffError.code);
    console.error("   Details:", staffError.details);
  } else if (!staff || staff.length === 0) {
    console.log("⚠️  No staff found in database!");
  } else {
    console.log(`✅ Found ${staff.length} staff member(s):\n`);
    staff.forEach((s) => {
      const roleInfo = s.role_id !== null ? `role_id: ${s.role_id}` : "⚠️ role_id: NULL";
      const activeIcon = s.is_active ? "✓" : "✗";
      console.log(`   [${activeIcon}] ${s.name} (${s.email})`);
      console.log(`       ${roleInfo} | location: ${s.location || "N/A"}`);
    });
  }

  // 3. Check staff with roles join (like the app does)
  console.log("\n\n🔗 STAFF WITH ROLES (JOIN):");
  console.log("-".repeat(40));
  const { data: staffWithRoles, error: joinError } = await supabase
    .from("staff")
    .select(`
      id,
      email,
      name,
      role_id,
      is_active,
      location,
      role:roles(id, name)
    `)
    .order("name");

  if (joinError) {
    console.error("❌ Error fetching staff with roles:", joinError.message);
    console.error("   Code:", joinError.code);
    console.error("   Details:", joinError.details);
    console.error("\n   This might be a foreign key issue or RLS policy problem.");
  } else if (!staffWithRoles || staffWithRoles.length === 0) {
    console.log("⚠️  No staff with roles found!");
  } else {
    console.log(`✅ Staff with roles:\n`);
    staffWithRoles.forEach((s) => {
      const roleData = s.role as unknown;
      const role = Array.isArray(roleData) ? roleData[0] : roleData;
      const roleName = role && typeof role === 'object' && 'name' in role ? (role as { name: string }).name : "⚠️ NO ROLE";
      console.log(`   ${s.name}: ${roleName} (role_id: ${s.role_id})`);
    });
  }

  // 4. Check for orphaned role_ids
  console.log("\n\n🔍 CHECKING FOR ISSUES:");
  console.log("-".repeat(40));

  if (staff && roles) {
    const roleIds = new Set(roles.map((r) => r.id));
    const orphanedStaff = staff.filter((s) => s.role_id !== null && !roleIds.has(s.role_id));
    const nullRoleStaff = staff.filter((s) => s.role_id === null);

    if (orphanedStaff.length > 0) {
      console.log(`\n⚠️  Staff with invalid role_id (role doesn't exist):`);
      orphanedStaff.forEach((s) => {
        console.log(`   - ${s.name}: role_id ${s.role_id} doesn't exist`);
      });
    }

    if (nullRoleStaff.length > 0) {
      console.log(`\n⚠️  Staff with NULL role_id:`);
      nullRoleStaff.forEach((s) => {
        console.log(`   - ${s.name} (${s.email})`);
      });
    }

    if (orphanedStaff.length === 0 && nullRoleStaff.length === 0) {
      console.log("✅ No issues found with role assignments!");
    }
  }

  // 5. Summary
  console.log("\n\n" + "=".repeat(60));
  console.log("📊 SUMMARY:");
  console.log("-".repeat(40));
  console.log(`   Roles in database: ${roles?.length || 0}`);
  console.log(`   Staff in database: ${staff?.length || 0}`);

  if (roles && roles.length === 0) {
    console.log("\n🔧 FIX: Run migrations to create roles:");
    console.log("   npx supabase db reset");
    console.log("   OR manually insert roles:");
    console.log(`   INSERT INTO roles (id, name, description) VALUES
     (1, 'admin', 'Administrator'),
     (2, 'kitchen', 'Kitchen staff'),
     (3, 'waiter', 'Waiter'),
     (4, 'customer', 'Customer');`);
  }

  console.log("\n");
}

diagnose().catch(console.error);
