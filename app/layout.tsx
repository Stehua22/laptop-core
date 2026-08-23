import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import AIAssistant from '@/components/AIAssistant';
import TopNav from '@/components/TopNav';
import ThemeInit from '@/components/ThemeInit';
import RouteProgress from '@/components/RouteProgress';
import BackToTop from '@/components/BackToTop';

export const metadata: Metadata = {
  title: "LaptopCore",
  description: "Find Your Next Laptop Deal",
};

// Without this, mobile browsers render the page at a virtual desktop-width
// canvas and zoom out to fit — every @media (max-width: ...) rule in the
// site silently never matches on real phones. This is what makes them match.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeInit />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <TopNav />
        {children}
        <BackToTop />
        <Analytics />
        <AIAssistant />
      </body>
    </html>
  );
}