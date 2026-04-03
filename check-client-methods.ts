import { createAuthClient } from "better-auth/react";
import { emailAndPasswordClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [emailAndPasswordClient()],
});

console.log("Client Methods:", Object.keys(authClient.emailAndPassword || {}));
