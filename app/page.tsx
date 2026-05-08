import { fetchLaptops } from "@/lib/supabase";
import TrackerClient from "@/components/TrackerClient";
import type { Laptop } from "@/lib/supabase";

export const revalidate = 60; // ISR: revalidate every 60s

export default async function Home() {
  let laptops: Laptop[] = [];
  let error: string | null = null;

  try {
    laptops = await fetchLaptops();
  } catch (e) {
    error = "Could not connect to database. Check your Supabase credentials.";
    console.error(e);
  }

  return <TrackerClient initialLaptops={laptops} dbError={error} />;
}
