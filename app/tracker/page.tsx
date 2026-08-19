import { fetchLaptops, getSupabaseConfigError } from "@/lib/supabase";
import TrackerClient from "@/components/TrackerClient";
import type { Laptop } from "@/lib/supabase";

export const revalidate = 60; // ISR: revalidate every 60s

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
  let error: string | null = getSupabaseConfigError();

  if (!error) {
    try {
      laptops = await fetchLaptops();
    } catch (e) {
      error = formatDbError(e);
      console.error(e);
    }
  }

  return <TrackerClient initialLaptops={laptops} dbError={error} />;
}