import { fetchLaptopsPage, fetchBrands, getSupabaseConfigError, DEFAULT_FILTERS } from "@/lib/supabase";
import TrackerClient from "@/components/TrackerClient";
import type { Laptop } from "@/lib/supabase";

export const revalidate = 120; // ISR: refresh the cached page every 2 minutes

function extractMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const obj = e as Record<string, unknown>;
    const parts = [obj.message, obj.details, obj.hint, obj.code]
      .filter((v) => typeof v === "string" && v.length > 0);
    if (parts.length > 0) return parts.join(" | ");
    try {
      return JSON.stringify(obj);
    } catch {
      return "Unknown error (unserializable object)";
    }
  }
  return String(e);
}

function formatDbError(e: unknown): string {
  const configError = getSupabaseConfigError();
  if (configError) return configError;

  const msg = extractMessage(e);
  if (msg.includes("Invalid API key")) {
    return "Invalid Supabase API key. Copy the Publishable key (sb_publishable_...) from Supabase → Settings → API Keys into .env.local as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart the dev server.";
  }
  return `Could not connect to database: ${msg}`;
}

export default async function TrackerPage() {
  let laptops: Laptop[] = [];
  let total = 0;
  let brands: string[] = [];
  let error: string | null = getSupabaseConfigError();

  if (!error) {
    try {
      // Only the first page (24 newest laptops) is sent with the page; the rest load as you filter or flip pages.
      const [first, allBrands] = await Promise.all([fetchLaptopsPage(DEFAULT_FILTERS, 1, 24), fetchBrands()]);
      laptops = first.laptops;
      total = first.total;
      brands = allBrands;
    } catch (e) {
      error = formatDbError(e);
      console.error(e);
    }
  }

  return <TrackerClient initialLaptops={laptops} initialTotal={total} brands={brands} dbError={error} />;
}