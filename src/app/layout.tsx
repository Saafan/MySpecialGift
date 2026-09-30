import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { Toaster } from "sonner";
import { BRAND_NAME } from "@/lib/brand";
import "./globals.css";

// Self-hosted via next/font — V1 pulled Google Fonts through a render-blocking
// CSS @import that leaked visitor IPs to a third party on every page load.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  applicationName: BRAND_NAME,
  title: {
    default: `${BRAND_NAME} — gifts made by you`,
    template: `%s · ${BRAND_NAME}`,
  },
  description:
    "Design mugs, tees, stickers and badges in a live editor, preview them in 3D, and order the real thing.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        {children}
        <Toaster
          position="bottom-center"
          richColors
          closeButton
          offset="calc(16px + env(safe-area-inset-bottom, 0px))"
        />
      </body>
    </html>
  );
}
