import type { Deal } from "@/data/deals";
import { mapMedusaToDeal } from "@/lib/medusa";

type NavbarTrendingShare = Pick<Deal, "id" | "handle" | "name" | "logo" | "sector">;
type ProductCollection = {
  id?: string;
  title?: string;
  handle?: string;
};
type MarketplaceProduct = {
  collection?: ProductCollection | null;
  collection_id?: string | null;
};
type MarketplaceProductsResponse = {
  products?: MarketplaceProduct[];
};

const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";
const NAVBAR_TRENDING_COLLECTION_NAME = "Navbar Trending Shares";
const NAVBAR_TRENDING_COLLECTION_HANDLE = "navbar-trending-shares";

const medusaHeaders = {
  "Content-Type": "application/json",
  "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
};

const shuffle = <T,>(items: T[]) => {
  const randomized = [...items];

  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [randomized[index], randomized[swapIndex]] = [randomized[swapIndex], randomized[index]];
  }

  return randomized;
};

const toNavbarTrendingShare = (product: unknown): NavbarTrendingShare => {
  const deal = mapMedusaToDeal(product);

  return {
    id: deal.id,
    handle: deal.handle,
    name: deal.name,
    logo: deal.logo,
    sector: deal.sector,
  };
};

const isNavbarTrendingCollection = (collection?: ProductCollection | null) => {
  if (!collection) {
    return false;
  }

  const title = typeof collection.title === "string" ? collection.title.trim().toLowerCase() : "";
  const handle = typeof collection.handle === "string" ? collection.handle.trim().toLowerCase() : "";

  return title === NAVBAR_TRENDING_COLLECTION_NAME.toLowerCase() || handle === NAVBAR_TRENDING_COLLECTION_HANDLE;
};

export async function getNavbarTrendingShares(): Promise<NavbarTrendingShare[]> {
  try {
    const query = new URLSearchParams({
      limit: "1000",
    });

    const response = await fetch(`${MEDUSA_BACKEND_URL}/store/marketplace-products?${query.toString()}`, {
      headers: medusaHeaders,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch navbar trending shares");
    }

    const data = (await response.json()) as MarketplaceProductsResponse;
    const products = Array.isArray(data.products) ? data.products : [];

    return shuffle(products.filter((product) => isNavbarTrendingCollection(product.collection)))
      .slice(0, 6)
      .map(toNavbarTrendingShare);
  } catch (error) {
    console.error("Error fetching navbar trending shares:", error);
    return [];
  }
}
