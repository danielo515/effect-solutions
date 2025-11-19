import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { AutoRefresh } from "@/components/AutoRefresh";
import { SoundSettingsProvider } from "@/lib/useSoundSettings";
import { SITE_URL } from "@/constants/urls";

const commitMono = localFont({
  src: "../../public/fonts/commit-mono/CommitMono-Variable.ttf",
  variable: "--font-commit-mono",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteName = "Effect Institute";
const siteDescription =
  "Effect Institute publishes hands-on lessons for building resilient TypeScript applications with Effect.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    "Effect Institute",
    "Effect",
    "TypeScript",
    "Functional Programming",
    "Resilient Systems",
    "Error Handling",
  ],
  openGraph: {
    title: siteName,
    description: siteDescription,
    url: "/",
    siteName,
    images: [
      {
        url: "/og/home.png",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/og/home.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${commitMono.variable} ${geistMono.variable} antialiased`}
      >
        <AutoRefresh />
        <SoundSettingsProvider>{children}</SoundSettingsProvider>
        <Analytics />
      </body>
    </html>
  );
}
