import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import LaptopDetailClient from "./LaptopDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: laptop } = await supabase
    .from("laptops")
    .select("brand, model, specs, retail_price, image_url")
    .eq("id", id)
    .single();

  if (!laptop) {
    return {
      title: "Laptop Not Found — LaptopCore",
      description: "This laptop listing could not be found.",
    };
  }

  const title = `${laptop.brand} ${laptop.model} — Price History & Best Price | LaptopCore`;
  const description = laptop.retail_price
    ? `Track the ${laptop.brand} ${laptop.model} price across stores. Current price $${laptop.retail_price} CAD. ${laptop.specs ?? ""}`.trim()
    : `Compare prices and specs for the ${laptop.brand} ${laptop.model} on LaptopCore.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: laptop.image_url ? [laptop.image_url] : undefined,
    },
  };
}

export default function LaptopPage() {
  return <LaptopDetailClient />;
}