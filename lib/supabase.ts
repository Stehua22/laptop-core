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

const LAPTOP_SELECT =
  "*, price_history(id, price, recorded_at), laptop_links(id, laptop_id, store, url, price, sort_order)";

// Turns a raw database row into a Laptop (sorted price history + buy-links + current price).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function shapeLaptop(l: any): Laptop {
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
    current_price: history.length > 0 ? history[history.length - 1].price : l.current_price ?? l.retail_price ?? 0,
    links,
  };
}

// Loads EVERY laptop. Fine for small pages, but slow with thousands of rows, so the tracker
// uses fetchLaptopsPage() below instead. Pages of 1000 are fetched in parallel, not one by one.
export async function fetchLaptops(): Promise<Laptop[]> {
  const PAGE = 1000;
  const { count, error: countError } = await supabase
    .from("laptops")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const pages = await Promise.all(
    Array.from({ length: pageCount }, async (_, i) => {
      const { data, error } = await supabase
        .from("laptops")
        .select(LAPTOP_SELECT)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(i * PAGE, i * PAGE + PAGE - 1);
      if (error) throw error;
      return data ?? [];
    })
  );

  return ([] as unknown[]).concat(...pages).map(shapeLaptop);
}

export type LaptopFilters = {
  search: string;
  brand: string;
  goodFor: string;
  screen: string;
  weight: string;
  priceMin: string;
  priceMax: string;
  sortBy: string;
};

export const DEFAULT_FILTERS: LaptopFilters = {
  search: "", brand: "", goodFor: "", screen: "", weight: "", priceMin: "", priceMax: "", sortBy: "newest",
};

// One page of laptops, with the search / filters / sorting done in the database.
// Needs the current_price column from lag-fix.sql.
export async function fetchLaptopsPage(
  filters: LaptopFilters,
  page: number,
  perPage: number
): Promise<{ laptops: Laptop[]; total: number }> {
  let q = supabase.from("laptops").select(LAPTOP_SELECT, { count: "exact" });

  // Every word has to match the brand, model or specs ("lenovo legion 5" works)
  const words = filters.search
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[%,()*\\]/g, ""))
    .filter(Boolean);
  for (const w of words) {
    q = q.or(`brand.ilike.%${w}%,model.ilike.%${w}%,specs.ilike.%${w}%`);
  }

  if (filters.brand) q = q.eq("brand", filters.brand);
  if (filters.goodFor) q = q.ilike("good_for", `%${filters.goodFor}%`);

  if (filters.screen === "small") q = q.lte("screen_size", 13);
  else if (filters.screen === "medium") q = q.gt("screen_size", 13).lt("screen_size", 15);
  else if (filters.screen === "large") q = q.gte("screen_size", 15).lt("screen_size", 17);
  else if (filters.screen === "xlarge") q = q.gte("screen_size", 17);

  if (filters.weight === "ultralight") q = q.lt("weight_kg", 1.2);
  else if (filters.weight === "light") q = q.gte("weight_kg", 1.2).lt("weight_kg", 1.6);
  else if (filters.weight === "medium") q = q.gte("weight_kg", 1.6).lt("weight_kg", 2.2);
  else if (filters.weight === "heavy") q = q.gte("weight_kg", 2.2);

  const min = parseFloat(filters.priceMin);
  const max = parseFloat(filters.priceMax);
  if (!isNaN(min)) q = q.gte("current_price", min);
  if (!isNaN(max)) q = q.lte("current_price", max);

  const sorted =
    filters.sortBy === "priceAsc"
      ? q.order("current_price", { ascending: true, nullsFirst: false }).order("id", { ascending: false })
      : filters.sortBy === "priceDesc"
      ? q.order("current_price", { ascending: false, nullsFirst: false }).order("id", { ascending: false })
      : q.order("created_at", { ascending: false }).order("id", { ascending: false });

  const from = (page - 1) * perPage;
  const { data, error, count } = await sorted.range(from, from + perPage - 1);
  if (error) throw error;

  return { laptops: (data ?? []).map(shapeLaptop), total: count ?? 0 };
}

export async function fetchLaptopById(id: number): Promise<Laptop | null> {
  const { data, error } = await supabase.from("laptops").select(LAPTOP_SELECT).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? shapeLaptop(data) : null;
}

// Just the list of brands (for the filter dropdown and sidebar), without loading every laptop.
export async function fetchBrands(): Promise<string[]> {
  const brands = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("laptops")
      .select("brand")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) if (row.brand) brands.add(row.brand as string);
    if (data.length < 1000) break;
  }
  return Array.from(brands).sort();
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
// Refurbished Market (peer-to-peer listings)
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

// ============================================================
// Messaging (buyer <-> seller, per listing)
// ============================================================

export type Conversation = {
  id: number;
  listing_id: number;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  last_message_at: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type ConversationWithDetails = Conversation & {
  listing: { id: number; brand: string; model: string; images: string[] | null; price: number } | null;
  otherUserId: string;
  lastMessageBody: string | null;
  unreadCount: number;
};

// Finds the existing conversation for this listing+buyer, or creates one.
// Call this when a buyer clicks "Message Seller" on a listing.
export async function getOrCreateConversation(
  listingId: number,
  buyerId: string,
  sellerId: string
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("listing_id", listingId)
    .eq("buyer_id", buyerId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: buyerId, seller_id: sellerId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// All conversations a user is part of (as buyer or seller), newest activity first,
// with the listing info, the last message preview, and an unread count for the inbox list.
export async function fetchConversations(userId: string): Promise<ConversationWithDetails[]> {
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("*, listing:listings(id, brand, model, images, price)")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (error) throw error;
  if (!conversations || conversations.length === 0) return [];

  const ids = conversations.map((c) => c.id);
  const { data: messages } = await supabase
    .from("messages")
    .select("conversation_id, body, sender_id, read_at, created_at")
    .in("conversation_id", ids)
    .order("created_at", { ascending: true });

  return conversations.map((c) => {
    const convoMessages = (messages ?? []).filter((m) => m.conversation_id === c.id);
    const last = convoMessages[convoMessages.length - 1];
    const unreadCount = convoMessages.filter((m) => m.sender_id !== userId && !m.read_at).length;
    return {
      ...c,
      otherUserId: c.buyer_id === userId ? c.seller_id : c.buyer_id,
      lastMessageBody: last?.body ?? null,
      unreadCount,
    };
  });
}

export async function fetchMessages(conversationId: number): Promise<Message[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function sendMessage(conversationId: number, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return data;
}

export async function markMessagesRead(conversationId: number, userId: string): Promise<void> {
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", userId)
    .is("read_at", null);
}

// Live updates: calls onMessage with every new message inserted into this conversation.
// Call the returned unsubscribe function on cleanup (e.g. in a useEffect return).
export function subscribeToMessages(conversationId: number, onMessage: (message: Message) => void) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload: any) => onMessage(payload.new as Message)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
