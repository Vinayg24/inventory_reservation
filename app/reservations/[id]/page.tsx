"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { StatusBadge } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApiErrorResponse, ReservationWithRelations } from "@/lib/types";

type ReservationPageProps = {
  params: {
    id: string;
  };
};

export default function ReservationPage({ params }: ReservationPageProps) {
  const [reservation, setReservation] = useState<ReservationWithRelations | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const fetchReservation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reservations/${params.id}`);
      const data = (await response.json()) as
        | ReservationWithRelations
        | ApiErrorResponse;

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        throw new Error(errorData.error ?? "Failed to load reservation");
      }

      setReservation(data as ReservationWithRelations);
    } catch (fetchError) {
      console.error("ReservationPage fetch failed:", fetchError);
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load reservation"
      );
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void fetchReservation();
  }, [fetchReservation]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const isExpired =
    reservation !== null &&
    reservation.status === "PENDING" &&
    new Date(reservation.expiresAt).getTime() <= now;

  async function handleConfirm() {
    if (!reservation) {
      return;
    }

    setActionError(null);
    setConfirmLoading(true);

    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/confirm`,
        {
          method: "POST",
          headers: {
            "Idempotency-Key": crypto.randomUUID(),
          },
        }
      );

      const data = (await response.json()) as
        | ReservationWithRelations
        | ApiErrorResponse;

      if (response.status === 410) {
        setActionError(
          "This reservation expired before it could be confirmed"
        );
        setReservation({ ...reservation, status: "RELEASED" });
        return;
      }

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        setActionError(errorData.error ?? "Failed to confirm reservation");
        return;
      }

      setReservation(data as ReservationWithRelations);
    } catch (confirmError) {
      console.error("Confirm reservation failed:", confirmError);
      setActionError("Something went wrong while confirming.");
    } finally {
      setConfirmLoading(false);
    }
  }

  async function handleRelease() {
    if (!reservation) {
      return;
    }

    setActionError(null);
    setReleaseLoading(true);

    try {
      const response = await fetch(
        `/api/reservations/${reservation.id}/release`,
        {
          method: "POST",
        }
      );

      const data = (await response.json()) as
        | ReservationWithRelations
        | ApiErrorResponse;

      if (!response.ok) {
        const errorData = data as ApiErrorResponse;
        setActionError(errorData.error ?? "Failed to cancel reservation");
        return;
      }

      setReservation(data as ReservationWithRelations);
    } catch (releaseError) {
      console.error("Release reservation failed:", releaseError);
      setActionError("Something went wrong while cancelling.");
    } finally {
      setReleaseLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="mb-4 h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </main>
    );
  }

  if (error || !reservation) {
    return (
      <main className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error ?? "Reservation not found"}</AlertDescription>
          </Alert>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/">Back to products</Link>
          </Button>
        </div>
      </main>
    );
  }

  const isPending = reservation.status === "PENDING";
  const canConfirm = isPending && !isExpired;
  const canRelease = isPending;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href="/">← Back to products</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{reservation.product.name}</CardTitle>
                <CardDescription>
                  {reservation.warehouse.name} · Qty {reservation.quantity}
                </CardDescription>
              </div>
              <StatusBadge status={reservation.status} />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {actionError && (
              <Alert variant="destructive">
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Warehouse</p>
                <p className="font-medium">{reservation.warehouse.name}</p>
                <p className="text-sm text-muted-foreground">
                  {reservation.warehouse.location}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="font-medium">{reservation.quantity}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expires at</p>
                <p className="font-medium">
                  {new Date(reservation.expiresAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time remaining</p>
                {isPending ? (
                  <CountdownTimer expiresAt={reservation.expiresAt.toString()} />
                ) : (
                  <p className="font-medium">—</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={handleConfirm}
                disabled={!canConfirm || confirmLoading || releaseLoading}
                className="sm:flex-1"
              >
                {confirmLoading ? "Confirming..." : "Confirm Purchase"}
              </Button>
              <Button
                variant="outline"
                onClick={handleRelease}
                disabled={!canRelease || confirmLoading || releaseLoading}
                className="sm:flex-1"
              >
                {releaseLoading ? "Cancelling..." : "Cancel Reservation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
