import { db } from "../src/lib/db";
import { sql } from "drizzle-orm";

async function checkDb() {
  try {
    const res = await db.run(sql`SELECT 1`);
    console.log("DB connected OK:", res);
  } catch (e) {
    console.error("DB error:", e);
  }
}
checkDb();
