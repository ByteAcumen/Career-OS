import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

import { getClientAppBaseUrl } from "@/lib/app-url";

export const authClient = createAuthClient({
  baseURL: getClientAppBaseUrl(),
  plugins: [
    twoFactorClient({
      twoFactorPage: "/verify-2fa",
    }),
  ],
});
