import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function getSupabaseConfigError(): string | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return "Missing Supabase credentials. In Supabase go to Settings → API Keys, copy the Publishable key (sb_publishable_...) and Project URL into .env.local.";
  }
  return null;
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

export type LaptopLink = {
  id: number;
  laptop_id: number;
  store: string;
  url: string;
  price: number | null;
  sort_order: number;
};

export type Laptop = {
  id: number;
  brand: string;
  model: string;
  specs: string;
  store: string;
  url: string;
  retail_price: number;
  release_year: number | null;
  date_added: string;
  created_at: string;
  price_history?: PriceEntry[];
  current_price?: number;
  is_deal?: boolean;
  image_url?: string;
  pros?: string[];
  cons?: string[];
  screen_size?: number | null;      // e.g. 13.3, 14, 15.6
  weight_kg?: number | null;        // e.g. 1.2, 1.8
  good_for?: string | null;         // e.g. "gaming,programming"
  links?: LaptopLink[];             // multiple buy-links, each with its own store/price
};

export type PriceEntry = {
  id: number;
  laptop_id: number;
  price: number;
  recorded_at: string;
};

export async function fetchLaptops(): Promise<Laptop[]> {
  const { data: laptops, error } = await supabase
    .from("laptops")
    .select("*, price_history(id, price, recorded_at), laptop_links(id, laptop_id, store, url, price, sort_order)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (laptops ?? []).map((l) => {
    const history: PriceEntry[] = (l.price_history ?? []).sort(
      (a: PriceEntry, b: PriceEntry) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    const links: LaptopLink[] = (l.laptop_links ?? []).sort(
      (a: LaptopLink, b: LaptopLink) => a.sort_order - b.sort_order
    );
    return {
      ...l,
      price_history: history,
      current_price: history[history.length - 1]?.price ?? l.retail_price ?? 0,
      links,
    };
  });
}

export async function addLaptop(
  laptop: Omit<Laptop, "id" | "created_at" | "price_history" | "current_price" | "links">,
  initialPrice: number
) {
  const { data, error } = await supabase.from("laptops").insert(laptop).select().single();
  if (error) throw error;
  await supabase.from("price_history").insert({
    laptop_id: data.id,
    price: initialPrice,
    recorded_at: new Date().toISOString().split("T")[0],
  });
  return data;
}

export async function addPriceEntry(laptopId: number, price: number) {
  const { error } = await supabase.from("price_history").insert({
    laptop_id: laptopId,
    price,
    recorded_at: new Date().toISOString().split("T")[0],
  });
  if (error) throw error;
}

export async function deleteLaptop(id: number) {
  const { error } = await supabase.from("laptops").delete().eq("id", id);
  if (error) throw error;
}

// ---- Laptop buy-links (multiple stores per laptop) ----

export async function fetchLaptopLinks(laptopId: number): Promise<LaptopLink[]> {
  const { data, error } = await supabase
    .from("laptop_links")
    .select("*")
    .eq("laptop_id", laptopId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addLaptopLink(link: Omit<LaptopLink, "id">) {
  const { data, error } = await supabase.from("laptop_links").insert(link).select().single();
  if (error) throw error;
  return data as LaptopLink;
}

export async function updateLaptopLink(id: number, patch: Partial<Omit<LaptopLink, "id" | "laptop_id">>) {
  const { error } = await supabase.from("laptop_links").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteLaptopLink(id: number) {
  const { error } = await supabase.from("laptop_links").delete().eq("id", id);
  if (error) throw error;
}

export type Article = {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  author: string;
  cover_image?: string;
  created_at: string;
  updated_at: string;
};

export async function fetchArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addArticle(
  article: Omit<Article, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("articles")
    .insert(article)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateArticle(
  id: string,
  article: Partial<Omit<Article, "id" | "created_at">>
) {
  const { data, error } = await supabase
    .from("articles")
    .update({ ...article, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteArticle(id: string) {
  const { error } = await supabase.from("articles").delete().eq("id", id);
  if (error) throw error;
}

// ---- Laptop 3D Design overrides ----

export type LaptopDesign = {
  laptop_id: number;
  color_hex: string;
  finish: string;       // 'Matte' | 'Aluminum' | 'Glossy'
  backlight: string;    // 'Off' | 'White' | 'Blue' | 'Green' | 'Red'
  open_angle: number;
  logo_glow: boolean;
  custom_model_base64?: string;
};

export async function fetchLaptopDesign(laptopId: number): Promise<LaptopDesign | null> {
  const { data, error } = await supabase
    .from("laptop_designs")
    .select("*")
    .eq("laptop_id", laptopId)
    .single();
  if (error) return null;
  return data as LaptopDesign;
}

export async function saveLaptopDesign(design: LaptopDesign): Promise<void> {
  const { error } = await supabase
    .from("laptop_designs")
    .upsert({ ...design, updated_at: new Date().toISOString() }, { onConflict: "laptop_id" });
  if (error) throw error;
}
// ============================================================
// Refurbished Market — add this block to lib/supabase.ts
// (paste at the end of the file, after your existing exports)
// ============================================================

export type Listing = {
  id: number;
  seller_id: string;
  brand: string;
  model: string;
  specs: string | null;
  condition: string;
  description: string | null;
  price: number;
  images: string[];
  delivery_method: "pickup" | "shipping" | "both";
  location: string | null;
  status: "active" | "sold" | "removed";
  created_at: string;
  updated_at: string;
};

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchListingById(id: number): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // no rows found
    throw error;
  }
  return data;
}

export async function fetchMyListings(sellerId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createListing(
  listing: Omit<Listing, "id" | "created_at" | "updated_at" | "status">
): Promise<Listing> {
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...listing, status: "active" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateListing(id: number, patch: Partial<Listing>): Promise<void> {
  const { error } = await supabase.from("listings").update(patch).eq("id", id);
  if (error) throw error;
}

export async function markListingSold(id: number): Promise<void> {
  return updateListing(id, { status: "sold" });
}

export async function deleteListing(id: number): Promise<void> {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

// Uploads a listing photo to the `listing-images` bucket under the
// seller's own user-id folder (required by the storage RLS policy),
// and returns its public URL.
export async function uploadListingImage(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("listing-images").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("listing-images").getPublicUrl(path);
  return data.publicUrl;
}
