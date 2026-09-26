import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import ListingDetailClient from "./ListingDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const { data: listing } = await supabase
    .from("listings")
    .select("brand, model, specs, condition, price, images, description")
    .eq("id", id)
    .single();

  if (!listing) {
    return {
      title: "Listing Not Found — LaptopCore Marketplace",
      description: "This marketplace listing could not be found. It may have sold or been removed.",
    };
  }

  const title = `${listing.brand} ${listing.model} — $${listing.price} CAD | LaptopCore Marketplace`;
  const description = (
    listing.description
      ? `${listing.condition} ${listing.brand} ${listing.model} for $${listing.price} CAD. ${listing.description}`
      : `${listing.condition} ${listing.brand} ${listing.model} for $${listing.price} CAD.${listing.specs ? ` ${listing.specs}.` : ""} Buy directly from a fellow Canadian laptop shopper on LaptopCore.`
  ).slice(0, 300);

  const image = listing.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
      type: "website",
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;

  const { data: listing } = await supabase
    .from("listings")
    .select("brand, model, specs, condition, price, images, description, status")
    .eq("id", id)
    .single();

  const jsonLd = listing
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${listing.brand} ${listing.model}`,
        description: listing.description ?? listing.specs ?? undefined,
        image: listing.images ?? undefined,
        brand: {
          "@type": "Brand",
          name: listing.brand,
        },
        offers: {
          "@type": "Offer",
          price: listing.price,
          priceCurrency: "CAD",
          availability:
            listing.status === "active"
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          itemCondition:
            listing.condition?.toLowerCase().includes("new")
              ? "https://schema.org/NewCondition"
              : "https://schema.org/UsedCondition",
        },
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ListingDetailClient />
    </>
  );
}