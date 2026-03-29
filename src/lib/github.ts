import type { GithubActivity } from "@/lib/types";

function parseGithubUsername(url: string) {
  try {
    const pathname = new URL(url).pathname.replace(/^\/|\/$/g, "");
    return pathname.split("/")[0] || "ByteAcumen";
  } catch {
    return "ByteAcumen";
  }
}

export async function fetchGithubActivity(githubUrl: string) {
  const username = parseGithubUsername(githubUrl);

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=5`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "career-tracker-app",
        },
        next: { revalidate: 3600 },
      },
    );

    if (!response.ok) {
      return [] satisfies GithubActivity[];
    }

    const payload = (await response.json()) as Array<{
      id: string;
      type: string;
      repo?: { name?: string };
      created_at: string;
    }>;

    return payload.slice(0, 4).map((item) => ({
      id: item.id,
      type: item.type,
      repoName: item.repo?.name ?? "Unknown repo",
      createdAt: item.created_at,
    }));
  } catch {
    return [] satisfies GithubActivity[];
  }
}
