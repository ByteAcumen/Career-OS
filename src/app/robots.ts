import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Block API routes, auth internals, and user-specific pages
        disallow: ["/api/", "/home", "/planner", "/logger", "/progress", "/strategy", "/settings"],
      },
    ],
    // If you add a domain, update this:
    // sitemap: "https://career-os.app/sitemap.xml",
  };
}
