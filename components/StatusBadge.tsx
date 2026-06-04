import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReservationStatus } from "@prisma/client";

type StatusBadgeProps = {
  status: ReservationStatus;
  className?: string;
};

const statusStyles: Record<ReservationStatus, string> = {
  PENDING: "border-yellow-500 bg-yellow-50 text-yellow-700",
  CONFIRMED: "border-green-500 bg-green-50 text-green-700",
  RELEASED: "border-gray-400 bg-gray-50 text-gray-600",
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(statusStyles[status], className)}
    >
      {status}
    </Badge>
  );
}
