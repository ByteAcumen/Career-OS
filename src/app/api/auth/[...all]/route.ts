import { toNextJsHandler } from "better-auth/next-js";
import { auth, ensureAuthTables } from "@/lib/auth";

export const dynamic = "force-dynamic";

const handler = toNextJsHandler(auth);

export const GET = async (req: Request) => {
  await ensureAuthTables();
  return handler.GET(req);
};

export const POST = async (req: Request) => {
  await ensureAuthTables();
  return handler.POST(req);
};
