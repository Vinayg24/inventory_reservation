"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApiErrorResponse, ProductWithInventory, ReservationWithRelations } from "@/lib/types";

type ReserveModalProps = {
  product: ProductWithInventory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReserveModal({
  product,
  open,
  onOpenChange,
}: ReserveModalProps) {
  const router = useRouter();
  const availableInventory = useMemo(
    () => product.inventory.filter((item) => item.availableUnits > 0),
    [product.inventory]
  );

  const [warehouseId, setWarehouseId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInventory = availableInventory.find(
    (item) => item.warehouseId === warehouseId
  );
  const maxQuantity = selectedInventory?.availableUnits ?? 1;

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setLoading(false);

    if (availableInventory.length > 0) {
      const firstWarehouseId = availableInventory[0].warehouseId;
      setWarehouseId(firstWarehouseId);
      setQuantity(1);
    } else {
      setWarehouseId("");
      setQuantity(1);
    }
  }, [open, availableInventory]);

  useEffect(() => {
    if (quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  }, [maxQuantity, quantity]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!warehouseId) {
      setError("Please select a warehouse.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          productId: product.id,
          warehouseId,
          quantity,
        }),
      });

      const data = (await response.json()) as
        | ReservationWithRelations
        | ApiErrorResponse;

      if (response.status === 409) {
        setError(
          "Not enough stock available — someone may have just reserved the last unit"
        );
        return;
      }

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        setError(errorData.error ?? "Failed to create reservation.");
        return;
      }

      const reservation = data as ReservationWithRelations;
      onOpenChange(false);
      router.push(`/reservations/${reservation.id}`);
    } catch (submitError) {
      console.error("ReserveModal submit failed:", submitError);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reserve {product.name}</DialogTitle>
          <DialogDescription>
            Select a warehouse and quantity to hold stock for 15 minutes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {availableInventory.length === 0 ? (
            <Alert variant="destructive">
              <AlertDescription>
                No stock is currently available for this product.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="warehouse" className="text-sm font-medium">
                  Warehouse
                </label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger id="warehouse">
                    <SelectValue placeholder="Select warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableInventory.map((item) => (
                      <SelectItem
                        key={item.warehouseId}
                        value={item.warehouseId}
                      >
                        {item.warehouse.name} ({item.availableUnits} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Quantity
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min={1}
                  max={maxQuantity}
                  value={quantity}
                  onChange={(event) => {
                    setQuantity(Number(event.target.value));
                  }}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Maximum available: {maxQuantity}
                </p>
              </div>
            </>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || availableInventory.length === 0}
            >
              {loading ? "Reserving..." : "Reserve"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
