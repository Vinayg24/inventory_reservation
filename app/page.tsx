import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProductCard } from "@/components/ProductCard";
import type { ApiErrorResponse, ProductWithInventory } from "@/lib/types";

export const dynamic = "force-dynamic";

function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

async function getProducts(): Promise<ProductWithInventory[]> {
  const response = await fetch(`${getBaseUrl()}/api/products`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const errorData = (await response.json()) as ApiErrorResponse;
    throw new Error(errorData.error ?? "Failed to load products");
  }

  return response.json() as Promise<ProductWithInventory[]>;
}

export default async function HomePage() {
  try {
    const products = await getProducts();

    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">
              Inventory Reservation System
            </h1>
            <p className="mt-2 text-muted-foreground">
              Browse products and reserve stock from available warehouses.
            </p>
          </div>

          {products.length === 0 ? (
            <Alert>
              <AlertTitle>No products found</AlertTitle>
              <AlertDescription>
                Run the database seed to populate sample inventory.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    );
  } catch (error) {
    console.error("HomePage failed:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load products";

    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Error loading products</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        </div>
      </main>
    );
  }
}
