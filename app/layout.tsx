import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laptop Price Tracker",
  description: "Track and compare laptop prices",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
