import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
});

// Use Inter as a secondary/mono-compatible fallback (widely cached on CDN)
const monoFont = Inter({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Career OS — Private Interview Prep Workspace",
    template: "%s | Career OS",
  },
  description:
    "Plan your week, track real proof of work, and use AI grounded in your actual activity. A private, per-account workspace for focused interview preparation.",
  keywords: ["interview prep", "DSA practice", "job tracker", "career planning", "AI coaching", "coding preparation"],
  authors: [{ name: "Career OS" }],
  creator: "Career OS",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Career OS — Private Interview Prep Workspace",
    description:
      "Plan, track, and iterate your interview prep with AI that reads your actual data.",
    siteName: "Career OS",
  },
  twitter: {
    card: "summary_large_image",
    title: "Career OS — Private Interview Prep Workspace",
    description: "A focused, private workspace for interview preparation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${bodyFont.variable} ${monoFont.variable} h-full`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#050505" />
      </head>
      <body className="min-h-full bg-[var(--paper)] font-[var(--font-body)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
