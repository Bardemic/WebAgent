import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BenchMark My Website - AI Agent Performance Testing",
  description: "Test how well AI agents can navigate and interact with your website. Get detailed performance metrics and insights.",
  keywords: ["AI agent", "website testing", "automation", "performance", "benchmarking"],
  authors: [{ name: "BenchMark My Website" }],
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-indigo-50 via-white to-cyan-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
