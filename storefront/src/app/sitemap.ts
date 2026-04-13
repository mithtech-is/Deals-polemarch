import type { MetadataRoute } from "next";

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://deals.polemarch.in";

type ProductLite = {
  id: string;
  handle?: string;
  updated_at?: string;
};

async function fetchAllProducts(): Promise<ProductLite[]> {
  try {
    const headers: Record<string, string> = {};
    if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
    const res = await fetch(
      `${MEDUSA_URL}/store/products?limit=200&fields=id,handle,updated_at`,
      { headers, next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const json = (await res.json()) as { products?: ProductLite[] };
    return json.products ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await fetchAllProducts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/deals`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  const dealPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/deals/${p.handle || p.id}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...dealPages];
}
