import type { Metadata } from "next";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://deals.polemarch.in";

type ProductLite = {
  id: string;
  title?: string;
  description?: string | null;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
};

async function fetchProduct(id: string): Promise<ProductLite | null> {
  try {
    const headers: Record<string, string> = {};
    if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
    const res = await fetch(`${MEDUSA_URL}/store/products/${id}?fields=%2Bmetadata`, {
      headers,
      // Cache per-deal metadata for 5 minutes — title/description rarely change.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { product?: ProductLite };
    return json.product ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);

  // Sensible defaults if the product can't be fetched at build/render time
  // (offline dev, intermittent backend, etc.) — page still renders, just
  // with a generic <title>.
  if (!product) {
    return {
      title: "Unlisted Share | Polemarch",
      description:
        "Buy and sell unlisted shares with verified pricing and transparent transfers on Polemarch.",
    };
  }

  const name = product.title || "Unlisted share";
  const isin =
    typeof product.metadata?.isin === "string" ? (product.metadata.isin as string) : "";
  const titleIsin = isin ? ` (${isin})` : "";
  const aliases = typeof product.metadata?.search_aliases === "string"
    ? (product.metadata.search_aliases as string).split(",").map(a => a.trim()).filter(Boolean)
    : [];
  // Pick the first alias that differs from the product title as the primary alias
  // for inclusion in the page title and description.
  const primaryAlias = aliases.find(a => a.toLowerCase() !== name.toLowerCase()) || "";
  const titleAlias = primaryAlias ? ` (${primaryAlias})` : "";
  const title = `${name}${titleAlias}${titleIsin} Unlisted Share Price | Polemarch`;
  const rawDesc =
    product.description ||
    `Buy ${name}${primaryAlias ? ` (${primaryAlias})` : ""} unlisted shares on Polemarch. Live indicative price, KYC-ready onboarding, and transparent demat transfers.`;
  // Clamp to ~155 chars for snippets.
  const description =
    rawDesc.length > 155 ? rawDesc.slice(0, 152).trimEnd() + "…" : rawDesc;

  const canonical = `${SITE_URL}/deals/${id}`;
  const ogImage = product.thumbnail || `${SITE_URL}/assets/logos/placeholder.png`;

  return {
    title,
    description,
    keywords: [name, ...aliases, "unlisted shares", "pre-IPO", "buy unlisted shares"].filter(Boolean),
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: [{ url: ogImage, alt: `${name} logo` }],
      siteName: "Polemarch",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function DealDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
