import type { Metadata } from "next";
import { DevToolsLink } from "@/components/debug/DevToolsLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "RepoPulse — OSS Health Score",
  description: "Measure the health of your open source projects with percentile-based scoring calibrated against 200+ GitHub repositories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <DevToolsLink />
      </body>
    </html>
  );
}
