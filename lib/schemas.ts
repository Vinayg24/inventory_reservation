import { z } from "zod";

export const ReserveSchema = z.object({
  productId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  quantity: z.number().int().min(1).max(100),
});

export const ReservationIdSchema = z.object({
  id: z.string().cuid(),
});

export type ReserveInput = z.infer<typeof ReserveSchema>;
