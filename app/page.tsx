import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProductCard } from "@/components/ProductCard";
import { getProductsWithInventory } from "@/lib/products";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const products = await getProductsWithInventory();

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
