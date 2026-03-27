import type { Deal } from "@/data/deals";
import { mapMedusaToDeal } from "@/lib/medusa";

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const TRENDING_SECTORS_COLLECTION_NAME = "Trending Sectors";
const TRENDING_SECTORS_COLLECTION_HANDLE = "trending-sectors";

type Category = {
  id: string;
  name?: string;
  handle?: string;
  rank?: number;
  metadata?: Record<string, unknown> | null;
};

type MarketplaceProduct = {
  id?: string;
  handle?: string;
  title?: string;
  thumbnail?: string | null;
  images?: Array<{ url?: string | null }> | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  variants?: unknown[];
  categories?: Category[];
  collection?: {
    id?: string;
    title?: string;
    handle?: string;
  } | null;
};

type MarketplaceProductsResponse = {
  products?: MarketplaceProduct[];
};

export type TrendingSector = {
  id: string;
  name: string;
  slug: string;
  rank: number;
  dealCount: number;
};

const headers = {
  "Content-Type": "application/json",
  "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
};

const isConnectionRefusedError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false;
  }

  const cause = error.cause;

  if (cause instanceof Error) {
    return "code" in cause && cause.code === "ECONNREFUSED";
  }

  return false;
};

export const getMarketplaceProducts = async (): Promise<MarketplaceProduct[]> => {
  const query = new URLSearchParams({
    limit: "1000",
  });

  try {
    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/marketplace-products?${query.toString()}`, {
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch marketplace products");
    }

    const data = (await response.json()) as MarketplaceProductsResponse;

    return Array.isArray(data.products) ? data.products : [];
  } catch (error) {
    if (isConnectionRefusedError(error)) {
      return [];
    }

    throw error;
  }
};

const normalizeToken = (value?: string | null) => {
  return (value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
};

const isTrendingSectorCategory = (category?: Category) => {
  return (
    category?.metadata?.is_trending_sector === true ||
    category?.metadata?.is_trending_sector === "true"
  );
};

const normalizeSlug = (value: string) => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const isTrendingSectorsCollection = (collection?: MarketplaceProduct["collection"]) => {
  if (!collection) {
    return false;
  }

  const title = normalizeToken(collection.title);
  const handle = normalizeToken(collection.handle);
  const normalizedName = normalizeToken(TRENDING_SECTORS_COLLECTION_NAME);
  const normalizedHandle = normalizeToken(TRENDING_SECTORS_COLLECTION_HANDLE);

  return (
    title === normalizedName ||
    handle === normalizedHandle ||
    title.includes(normalizedName) ||
    handle.includes(normalizedHandle)
  );
};

const hasTrendingSectorCategory = (product: MarketplaceProduct) => {
  const categories = Array.isArray(product.categories) ? product.categories : [];

  return categories.some((category) => isTrendingSectorCategory(category));
};

export async function getTrendingSectors(): Promise<TrendingSector[]> {
  try {
    const products = await getMarketplaceProducts();

    const sectorMap = new Map<string, TrendingSector>();

    for (const product of products) {
      const categories = Array.isArray(product.categories) ? product.categories : [];

      for (const category of categories) {
        if (!category?.id || !category.name || !isTrendingSectorCategory(category)) {
          continue;
        }

        const existing = sectorMap.get(category.id);

        if (existing) {
          existing.dealCount += 1;
          continue;
        }

        sectorMap.set(category.id, {
          id: category.id,
          name: category.name,
          slug: category.handle || normalizeSlug(category.name),
          rank: typeof category.rank === "number" ? category.rank : Number.MAX_SAFE_INTEGER,
          dealCount: 1,
        });
      }
    }

    return Array.from(sectorMap.values())
      .sort((first, second) => first.rank - second.rank || first.name.localeCompare(second.name))
      .slice(0, 4);
  } catch (error) {
    console.error("Error fetching trending sectors:", error);
    return [];
  }
}

export async function getTrendingSectorProducts(): Promise<Deal[]> {
  try {
    const products = await getMarketplaceProducts();
    const seenProductIds = new Set<string>();

    return products
      .filter((product) => {
        if (!product.id) {
          return false;
        }

        const isMatch = isTrendingSectorsCollection(product.collection) || hasTrendingSectorCategory(product);

        if (!isMatch || seenProductIds.has(product.id)) {
          return false;
        }

        seenProductIds.add(product.id);

        return true;
      })
      .map((product) => mapMedusaToDeal(product))
      .sort((first, second) => first.name.localeCompare(second.name));
  } catch (error) {
    console.error("Error fetching trending sector products:", error);
    return [];
  }
}
