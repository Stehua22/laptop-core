import type { Metadata } from "next";
import "./globals.css";
<<<<<<< HEAD
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  title: "LaptopCore",
  description: "Find Your Next Laptop Deal",
};

=======

export const metadata: Metadata = {
  title: "Laptop Price Tracker",
  description: "Track and compare laptop prices",
};

// Runs before React hydrates so the page never flashes the wrong theme.
const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    var theme = stored || (prefersLight ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme);
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

>>>>>>> origin/fix/vercel-build-and-theme-toggle
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
<<<<<<< HEAD
    <html lang="en" data-theme="dark">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
=======
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
>>>>>>> origin/fix/vercel-build-and-theme-toggle
