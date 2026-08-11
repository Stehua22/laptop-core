import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import AIAssistant from '@/components/AIAssistant';
import TopNav from '@/components/TopNav';

export const metadata: Metadata = {
  title: "LaptopCore",
  description: "Find Your Next Laptop Deal", 
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>
        <TopNav />
        {children}
        <Analytics />
        <AIAssistant />
      </body>
    </html>
  );
}


