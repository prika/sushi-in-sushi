import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  const { data, error } = await supabase
    .from("staff")
    .select("email, password_hash, is_active, role_id")
    .in("email", [
      "admin@sushinsushi.pt",
      "cozinha@sushinsushi.pt",
      "empregado@sushinsushi.pt",
    ]);

  console.log("Staff users:");
  if (data) {
    for (const user of data) {
      console.log(`  ${user.email}:`);
      console.log(
        `    password_hash: ${user.password_hash ? "[SET]" : "[NOT SET]"}`,
      );
      console.log(`    is_active: ${user.is_active}`);
      console.log(`    role_id: ${user.role_id}`);
    }
  }
  if (error) console.error("Error:", error);
}

checkUsers();
