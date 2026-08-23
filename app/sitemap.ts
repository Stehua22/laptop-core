import { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

// Uses NEXT_PUBLIC_SITE_URL so switching domains later is a settings change,
// not a code change. Falls back to the current Vercel URL if unset.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : "https://lapcore-lake.vercel.app");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/tracker`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/best-picks`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/deals/scanner`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/articles`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/premium`, changeFrequency: "monthly", priority: 0.5 },
  ];

  let laptopRoutes: MetadataRoute.Sitemap = [];
  try {
    const { data: laptops } = await supabase
      .from("laptops")
      .select("id, date_added, created_at");

    if (laptops) {
      laptopRoutes = laptops.map((l) => ({
        url: `${SITE_URL}/laptop/${l.id}`,
        lastModified: l.date_added ?? l.created_at ?? undefined,
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    }
  } catch {
    // If the DB call fails at build time, still ship the static routes
    // rather than failing the whole build.
  }

  return [...staticRoutes, ...laptopRoutes];
}