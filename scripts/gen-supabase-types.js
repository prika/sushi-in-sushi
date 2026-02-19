/**
 * Generate Supabase TypeScript types using project ref from .env.local.
 * npm run supabase:types
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");
const outputPath = path.join(root, "src", "types", "supabase.ts");

let projectRef = process.env.SUPABASE_PROJECT_REF;
if (!projectRef && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  const refMatch = content.match(/SUPABASE_PROJECT_REF=(.+)/);
  if (refMatch) projectRef = refMatch[1].trim();
  if (!projectRef) {
    const urlMatch = content.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/);
    const url = urlMatch ? urlMatch[1].trim() : "";
    if (url) projectRef = new URL(url).hostname.split(".")[0];
  }
}

if (!projectRef) {
  console.error(
    "Missing SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL in .env.local"
  );
  process.exit(1);
}

const cmd = `npx supabase gen types typescript --project-id ${projectRef} --schema public`;
const result = execSync(cmd, { encoding: "utf8", cwd: root });
fs.writeFileSync(outputPath, result);
console.log("Written to src/types/supabase.ts");
