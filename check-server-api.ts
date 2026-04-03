import { auth } from "./src/lib/auth";

async function check() {
  const ctx = await auth.api;
  console.log("Registered API Methods on Server:", Object.keys(ctx || {}));
}

check().catch(console.error);
