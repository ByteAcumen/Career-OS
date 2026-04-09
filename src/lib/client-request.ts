export async function postJson<T>(
  url: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    method: init?.method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });

  const payload = (await response.json().catch(() => null)) as
    | { message?: string }
    | T
    | null;

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.href = "/sign-in";
      throw new Error("Session expired. Redirecting to sign in.");
    }

    const message =
      payload && typeof payload === "object" && "message" in payload
        ? payload.message
        : "Request failed.";
    throw new Error(message || "Request failed.");
  }

  return payload as T;
}
