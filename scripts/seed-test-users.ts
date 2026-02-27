/* eslint-disable no-console */
/**
 * Script to seed test users for E2E testing
 * Run with: npx tsx scripts/seed-test-users.ts
 *
 * Creates users in:
 * 1. Supabase Auth (authentication)
 * 2. Staff table (linked via auth_user_id)
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Passwords must contain: lowercase, uppercase, and numbers
const testUsers = [
  {
    staffId: "a0000000-0000-0000-0000-000000000001",
    email: "admin@sushinsushi.pt",
    name: "Admin Teste",
    password: "Admin123",
    role_id: 1,
    location: "circunvalacao",
  },
  {
    staffId: "a0000000-0000-0000-0000-000000000002",
    email: "cozinha@sushinsushi.pt",
    name: "Cozinha Teste",
    password: "Cozinha123",
    role_id: 2,
    location: "circunvalacao",
  },
  {
    staffId: "a0000000-0000-0000-0000-000000000003",
    email: "empregado@sushinsushi.pt",
    name: "Empregado Teste",
    password: "Empregado123",
    role_id: 3,
    location: "circunvalacao",
  },
];

async function createSupabaseAuthUsers() {
  console.log("🔐 Creating Supabase Auth users...\n");

  const authUserIds: Record<string, string> = {};

  for (const user of testUsers) {
    // First, check if auth user already exists by trying to get by email
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === user.email,
    );

    if (existingUser) {
      console.log(
        `   ℹ️  Auth user exists: ${user.email} (${existingUser.id})`,
      );

      // Update password to ensure it matches
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password: user.password },
      );

      if (updateError) {
        console.log(
          `   ⚠️  Could not update password for ${user.email}: ${updateError.message}`,
        );
      } else {
        console.log(`   ✅ Password updated for ${user.email}`);
      }

      authUserIds[user.email] = existingUser.id;
    } else {
      // Create new auth user
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          name: user.name,
        },
      });

      if (error) {
        console.error(
          `   ❌ Error creating auth user ${user.email}:`,
          error.message,
        );
      } else if (data.user) {
        console.log(`   ✅ Created auth user: ${user.email} (${data.user.id})`);
        authUserIds[user.email] = data.user.id;
      }
    }
  }

  return authUserIds;
}

async function seedStaffRecords(authUserIds: Record<string, string>) {
  console.log("\n🌱 Seeding staff records...\n");

  for (const user of testUsers) {
    const authUserId = authUserIds[user.email];

    // Check if staff record exists
    const { data: existing } = await supabase
      .from("staff")
      .select("id, auth_user_id")
      .eq("email", user.email)
      .single();

    if (existing) {
      // Update existing staff record
      const { error } = await supabase
        .from("staff")
        .update({
          auth_user_id: authUserId || null,
          is_active: true,
          name: user.name,
        })
        .eq("email", user.email);

      if (error) {
        console.error(`   ❌ Error updating ${user.email}:`, error.message);
      } else {
        console.log(
          `   ✅ Updated staff: ${user.email}${authUserId ? ` (linked to auth: ${authUserId})` : ""}`,
        );
      }
    } else {
      // Insert new staff record
      const { error } = await supabase.from("staff").insert({
        id: user.staffId,
        email: user.email,
        name: user.name,
        auth_user_id: authUserId || null,
        role_id: user.role_id,
        location: user.location,
        is_active: true,
      });

      if (error) {
        console.error(`   ❌ Error inserting ${user.email}:`, error.message);
      } else {
        console.log(
          `   ✅ Created staff: ${user.email}${authUserId ? ` (linked to auth: ${authUserId})` : ""}`,
        );
      }
    }
  }

  console.log("\n📋 Test users:");
  console.log("   admin@sushinsushi.pt");
  console.log("   cozinha@sushinsushi.pt");
  console.log("   empregado@sushinsushi.pt");
  console.log("   (See testUsers array for passwords)");
}

async function resetRateLimits() {
  console.log("\n🔓 Resetting rate limits...");

  // Common localhost IPs used by Playwright/tests
  const testIPs = ["127.0.0.1", "localhost", "::1", "::ffff:127.0.0.1"];

  // Reset rate limits for test user emails
  for (const user of testUsers) {
    const { error } = await supabase.rpc("reset_rate_limit", {
      p_identifier: user.email,
      p_identifier_type: "email",
    });

    if (error) {
      console.log(
        `   ⚠️  Could not reset rate limit for ${user.email}: ${error.message}`,
      );
    } else {
      console.log(`   ✅ Reset rate limit for ${user.email}`);
    }
  }

  // Reset rate limits for localhost IPs
  for (const ip of testIPs) {
    const { error } = await supabase.rpc("reset_rate_limit", {
      p_identifier: ip,
      p_identifier_type: "ip",
    });

    if (error) {
      console.log(
        `   ⚠️  Could not reset rate limit for IP ${ip}: ${error.message}`,
      );
    } else {
      console.log(`   ✅ Reset rate limit for IP ${ip}`);
    }
  }
}

async function main() {
  try {
    // Step 1: Create Supabase Auth users
    const authUserIds = await createSupabaseAuthUsers();

    // Step 2: Create/update staff records with auth_user_id link
    await seedStaffRecords(authUserIds);

    // Step 3: Reset rate limits
    await resetRateLimits();

    console.log("\n✨ Done!");
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
