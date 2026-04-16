const url = process.env.TURSO_DATABASE_URL || "libsql://build-placeholder.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN;

async function checkDb() {
  try {
    const httpUrl = url.replace("libsql://", "https://");
    console.log("Checking URL:", httpUrl);
    const resp = await fetch(httpUrl + "/v2/pipeline", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${authToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          { type: "execute", stmt: { sql: "SELECT 1" } },
          { type: "close" }
        ]
      })
    });
    console.log("Status:", resp.status);
    console.log("Body:", await resp.text());
  } catch (e) {
    console.error("Fetch error:", e);
  }
}
checkDb();
