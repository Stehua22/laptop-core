import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
    .select("*, price_history(id, price, recorded_at)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (laptops ?? []).map((l) => {
    const history: PriceEntry[] = (l.price_history ?? []).sort(
      (a: PriceEntry, b: PriceEntry) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );
    return {
      ...l,
      price_history: history,
      current_price: history[history.length - 1]?.price ?? l.retail_price ?? 0,
    };
  });
}

export async function addLaptop(
  laptop: Omit<Laptop, "id" | "created_at" | "price_history" | "current_price">,
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
