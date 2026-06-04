"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReserveModal } from "@/components/ReserveModal";
import type { ProductWithInventory } from "@/lib/types";

type ProductCardProps = {
  product: ProductWithInventory;
};

export function ProductCard({ product }: ProductCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle className="text-xl">{product.name}</CardTitle>
          <CardDescription>
            SKU: {product.sku} · ${product.price.toFixed(2)}
          </CardDescription>
          {product.description && (
            <p className="text-sm text-muted-foreground">{product.description}</p>
          )}
        </CardHeader>

        <CardContent className="flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Warehouse</th>
                  <th className="pb-2 pr-4 font-medium">Available</th>
                  <th className="pb-2 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {product.inventory.map((item) => (
                  <tr key={item.warehouseId} className="border-b last:border-0">
                    <td className="py-2 pr-4">{item.warehouse.name}</td>
                    <td className="py-2 pr-4">{item.availableUnits}</td>
                    <td className="py-2">{item.totalUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>

        <CardFooter>
          <Button className="w-full" onClick={() => setModalOpen(true)}>
            Reserve
          </Button>
        </CardFooter>
      </Card>

      <ReserveModal
        product={product}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
