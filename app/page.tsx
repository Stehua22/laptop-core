import { fetchLaptops } from "@/lib/supabase";
import TrackerClient from "@/components/TrackerClient";

export const revalidate = 60; // ISR: revalidate every 60s

export default async function Home() {
  let laptops = [];
  let error = null;

  try {
    laptops = await fetchLaptops();
  } catch (e) {
    error = "Could not connect to database. Check your Supabase credentials.";
    console.error(e);
  }

  return <TrackerClient initialLaptops={laptops} dbError={error} />;
}
