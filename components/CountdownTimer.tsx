"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CountdownTimerProps = {
  expiresAt: string;
};

function formatTimeRemaining(diffMs: number): string {
  if (diffMs <= 0) {
    return "Expired";
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function CountdownTimer({ expiresAt }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const diff = new Date(expiresAt).getTime() - now;
  const isUrgent = diff > 0 && diff < 60000;
  const isExpired = diff <= 0;

  return (
    <span
      className={cn(
        "font-mono text-lg tabular-nums",
        isUrgent && "font-bold text-red-600",
        isExpired && "font-bold text-red-600"
      )}
    >
      {formatTimeRemaining(diff)}
    </span>
  );
}
