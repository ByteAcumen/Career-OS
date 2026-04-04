import { createAuthClient } from "better-auth/react";
import { getClientAppBaseUrl } from "@/lib/app-url";

export const authClient = createAuthClient({
  baseURL: getClientAppBaseUrl(),
});
