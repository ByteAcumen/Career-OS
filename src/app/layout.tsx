import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";

import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const headingFont = Fraunces({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Career OS",
  description:
    "A full-stack interview preparation workspace with student planning, AI coaching, and job tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} h-full`}
    >
      <body className="min-h-full bg-[var(--paper)] font-[var(--font-body)] text-[var(--ink)] antialiased">
        {children}
      </body>
    </html>
  );
}
