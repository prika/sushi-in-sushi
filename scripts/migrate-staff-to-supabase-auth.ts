/**
 * Script para migrar utilizadores staff para Supabase Auth
 *
 * Estratégia: Reset por Email
 * 1. Para cada staff sem auth_user_id:
 *    - Criar utilizador em auth.users com password temporária
 *    - Ligar auth_user_id ao staff
 *    - Enviar email de reset de password
 *
 * Pré-requisitos:
 * - Configurar SMTP no Supabase Dashboard: Project Settings > Authentication > SMTP Settings
 * - Ter SUPABASE_SERVICE_ROLE_KEY no .env.local
 *
 * Execução:
 * npx tsx scripts/migrate-staff-to-supabase-auth.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { randomBytes } from "crypto";

// Read .env.local manually
try {
  const envContent = readFileSync(".env.local", "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    if (key && !key.startsWith("#")) {
      process.env[key.trim()] = valueParts.join("=").trim();
    }
  });
} catch (e) {
  console.error("Could not read .env.local");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables:");
  console.log("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "OK" : "MISSING");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseServiceKey ? "OK" : "MISSING");
  process.exit(1);
}

// Admin client with service role key (bypasses RLS)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Regular client for auth operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface StaffRecord {
  id: string;
  name: string;
  email: string;
  auth_user_id: string | null;
  is_active: boolean;
  roles: { name: string };
}

async function generateTempPassword(): Promise<string> {
  // Generate a secure random password
  return randomBytes(16).toString("base64").replace(/[+/=]/g, "").slice(0, 20);
}

async function getStaffWithoutAuthId(): Promise<StaffRecord[]> {
  const { data, error } = await supabaseAdmin
    .from("staff")
    .select(
      `
      id,
      name,
      email,
      auth_user_id,
      is_active,
      roles!inner (
        name
      )
    `
    )
    .is("auth_user_id", null)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching staff:", error);
    return [];
  }

  return (data as unknown as StaffRecord[]) || [];
}

async function createAuthUser(
  email: string,
  tempPassword: string
): Promise<{ userId: string | null; error: string | null }> {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // Auto-confirm email since we trust these are real staff
  });

  if (error) {
    return { userId: null, error: error.message };
  }

  return { userId: data.user?.id || null, error: null };
}

async function linkStaffToAuthUser(
  staffId: string,
  authUserId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("staff")
    .update({ auth_user_id: authUserId })
    .eq("id", staffId);

  if (error) {
    console.error(`Error linking staff ${staffId}:`, error);
    return false;
  }

  return true;
}

async function sendPasswordResetEmail(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`,
  });

  if (error) {
    console.error(`Error sending reset email to ${email}:`, error);
    return false;
  }

  return true;
}

async function migrateStaff() {
  console.log("========================================");
  console.log("MIGRAÇÃO DE STAFF PARA SUPABASE AUTH");
  console.log("========================================\n");

  // 1. Get all staff without auth_user_id
  console.log("1. A procurar staff sem auth_user_id...\n");
  const staffToMigrate = await getStaffWithoutAuthId();

  if (staffToMigrate.length === 0) {
    console.log("Todos os utilizadores staff já têm auth_user_id!");
    console.log("Nada a migrar.\n");
    return;
  }

  console.log(`Encontrados ${staffToMigrate.length} utilizadores para migrar:\n`);
  staffToMigrate.forEach((s) => {
    console.log(`  - ${s.name} (${s.email}) - Role: ${(s.roles as { name: string }).name}`);
  });

  console.log("\n2. A criar utilizadores em Supabase Auth...\n");

  const results: {
    success: StaffRecord[];
    failed: { staff: StaffRecord; error: string }[];
  } = {
    success: [],
    failed: [],
  };

  for (const staff of staffToMigrate) {
    console.log(`Processing: ${staff.email}...`);

    // Generate temporary password
    const tempPassword = await generateTempPassword();

    // Create auth user
    const { userId, error } = await createAuthUser(staff.email, tempPassword);

    if (error || !userId) {
      console.log(`  ERRO: ${error}`);
      results.failed.push({ staff, error: error || "No user ID returned" });
      continue;
    }

    console.log(`  Auth user created: ${userId}`);

    // Link staff to auth user
    const linked = await linkStaffToAuthUser(staff.id, userId);

    if (!linked) {
      console.log(`  ERRO: Não foi possível ligar ao staff record`);
      results.failed.push({ staff, error: "Failed to link auth user" });
      continue;
    }

    console.log(`  Staff linked successfully`);

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(staff.email);

    if (!emailSent) {
      console.log(`  AVISO: Email de reset não enviado (SMTP pode não estar configurado)`);
    } else {
      console.log(`  Email de reset enviado`);
    }

    results.success.push(staff);
    console.log(`  OK!\n`);
  }

  // Summary
  console.log("\n========================================");
  console.log("RESUMO DA MIGRAÇÃO");
  console.log("========================================\n");

  console.log(`Sucesso: ${results.success.length}/${staffToMigrate.length}`);
  results.success.forEach((s) => {
    console.log(`  - ${s.name} (${s.email})`);
  });

  if (results.failed.length > 0) {
    console.log(`\nFalharam: ${results.failed.length}/${staffToMigrate.length}`);
    results.failed.forEach((f) => {
      console.log(`  - ${f.staff.name} (${f.staff.email}): ${f.error}`);
    });
  }

  console.log("\n========================================");
  console.log("PRÓXIMOS PASSOS");
  console.log("========================================\n");

  console.log("1. Verificar se os emails de reset foram enviados");
  console.log("   (Se SMTP não estiver configurado, as passwords temporárias");
  console.log("   podem ser definidas manualmente no Supabase Dashboard)");
  console.log("");
  console.log("2. Adicionar NEXT_PUBLIC_USE_SUPABASE_AUTH=true ao .env.local");
  console.log("");
  console.log("3. Reiniciar o servidor de desenvolvimento");
  console.log("");
  console.log("4. Testar login com os utilizadores migrados");
  console.log("");
}

// Also provide a function to check current status
async function checkStatus() {
  console.log("========================================");
  console.log("STATUS DA MIGRAÇÃO");
  console.log("========================================\n");

  const { data: allStaff, error } = await supabaseAdmin
    .from("staff")
    .select(
      `
      id,
      name,
      email,
      auth_user_id,
      is_active,
      roles!inner (
        name
      )
    `
    )
    .eq("is_active", true);

  if (error) {
    console.error("Error:", error);
    return;
  }

  const withAuth = allStaff?.filter((s) => s.auth_user_id) || [];
  const withoutAuth = allStaff?.filter((s) => !s.auth_user_id) || [];

  console.log(`Total staff ativos: ${allStaff?.length || 0}`);
  console.log(`Com auth_user_id: ${withAuth.length}`);
  console.log(`Sem auth_user_id: ${withoutAuth.length}`);

  if (withAuth.length > 0) {
    console.log("\nCom Supabase Auth:");
    withAuth.forEach((s) => {
      console.log(`  - ${s.name} (${s.email})`);
    });
  }

  if (withoutAuth.length > 0) {
    console.log("\nSem Supabase Auth (pendentes):");
    withoutAuth.forEach((s) => {
      console.log(`  - ${s.name} (${s.email})`);
    });
  }
}

// Main execution
const args = process.argv.slice(2);

if (args.includes("--status")) {
  checkStatus().catch(console.error);
} else {
  migrateStaff().catch(console.error);
}
