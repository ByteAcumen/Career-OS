import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function loadEnvFile() {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile();

  const [{ auth, ensureAuthTables }, { db, client }, { claimLegacyDataForUser }] =
    await Promise.all([
      import("../src/lib/auth"),
      import("../src/lib/db"),
      import("../src/lib/dashboard"),
    ]);

  await ensureAuthTables();

  const name = process.env.APP_SEED_NAME?.trim() || "Career OS Admin";
  const email = process.env.APP_SEED_EMAIL?.trim() || "admin@career-os.local";
  const password = process.env.APP_SEED_PASSWORD?.trim() || randomBytes(18).toString("base64url");

  const rs = await client.execute({
    sql: `SELECT id, email, name FROM user WHERE email = ?`,
    args: [email],
  });
  const existingUser = rs.rows[0] as unknown as { id: string; email: string; name: string } | undefined;

  if (existingUser) {
    await claimLegacyDataForUser(existingUser.id);
    console.log(`User already exists: ${existingUser.email}`);
    return;
  }

  const response = await auth.api.signUpEmail({
    body: {
      name,
      email,
      password,
    },
  });

  if (!response?.user?.id) {
    throw new Error("Seed user creation did not return a user id.");
  }

  await claimLegacyDataForUser(response.user.id);
  console.log(`Created seed user: ${email}`);
  if (!process.env.APP_SEED_PASSWORD?.trim()) {
    console.log(`Generated temporary password: ${password}`);
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
