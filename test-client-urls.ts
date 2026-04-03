import { createAuthClient } from "better-auth/react";

const client = createAuthClient({
  baseURL: "http://localhost:3000"
});

async function main() {
  try {
     const res1 = await client.requestPasswordReset({ email: "test@example.com", redirectTo: "/reset-password" });
     console.log("requestPasswordReset:", res1);
  } catch(e) {
     console.log(e);
  }
}
main();
