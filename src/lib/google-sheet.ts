type ApplicationSyncPayload = {
  source: string;
  date: string;
  company: string;
  role: string;
  status: string;
  note: string;
  roleUrl: string;
  githubUrl: string;
  createdAt: string;
};

export async function pushApplicationToSheet(
  webhookUrl: string,
  payload: ApplicationSyncPayload,
) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Google Sheet sync failed");
  }

  return true;
}
