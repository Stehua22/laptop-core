import type { Metadata } from "next";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <ThemeInit />
        {/* useSearchParams inside RouteProgress requires a Suspense boundary in the App Router */}
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