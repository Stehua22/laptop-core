import type { Metadata } from "next";
import ChangelogClient from "./ChangelogClient.tsx";

export const metadata: Metadata = {
  title: "Updates — LaptopCore",
  description: "What's new on LaptopCore — recent fixes, features, and improvements.",
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}