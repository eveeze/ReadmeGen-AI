import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReadmeGen AI - Generate Professional README Files",
  description:
    "Instantly generate comprehensive, professional README.md files for your GitHub repositories using AI. Save time and improve your project documentation.",
  keywords:
    "README, generator, AI, GitHub, documentation, markdown, IBM Granite",
  authors: [{ name: "ReadmeGen AI" }],
  openGraph: {
    title: "ReadmeGen AI - Generate Professional README Files",
    description:
      "Instantly generate comprehensive, professional README.md files for your GitHub repositories using AI.",
    type: "website",
    siteName: "ReadmeGen AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReadmeGen AI - Generate Professional README Files",
    description:
      "Instantly generate comprehensive, professional README.md files for your GitHub repositories using AI.",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          {children}
        </main>
      </body>
    </html>
  );
}
