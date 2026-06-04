import type { Product, Reservation, Warehouse } from "@prisma/client";

export type InventoryRow = {
  id: string;
  productId: string;
  warehouseId: string;
  totalUnits: number;
  reservedUnits: number;
};

export type ProductInventoryItem = {
  warehouseId: string;
  warehouse: Pick<Warehouse, "name">;
  totalUnits: number;
  reservedUnits: number;
  availableUnits: number;
};

export type ProductWithInventory = Product & {
  inventory: ProductInventoryItem[];
};

export type ReservationWithRelations = Reservation & {
  product: Product;
  warehouse: Warehouse;
};

export type ApiErrorResponse = {
  error: string;
};
