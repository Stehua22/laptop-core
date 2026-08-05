// app/deals/scanner/page.tsx
import ScannerClient from "./ScannerClient";

export const metadata = {
  title: "Deal Scanner — LaptopCore",
  description: "Live refurbished laptop deals from eBay, Best Buy, and Facebook Marketplace",
};

export default function ScannerPage() {
  return <ScannerClient />;
}
