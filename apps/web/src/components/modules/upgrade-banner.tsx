"use client";

import Link from "next/link";
import { Zap, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SubscriptionStatus } from "@/lib/auth-store";

interface UpgradeBannerProps {
  status: SubscriptionStatus;
}

export function UpgradeBanner({ status }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || status === "ACTIVE") return null;

  const isPastDue = status === "PAST_DUE";
  const isCancelled = status === "CANCELLED";

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
        isPastDue || isCancelled
          ? "bg-amber-500/15 border-b border-amber-500/30 text-amber-200"
          : "bg-primary/10 border-b border-primary/20 text-foreground"
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {isPastDue || isCancelled ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        ) : (
          <Zap className="h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="truncate">
          {isPastDue
            ? "Your payment failed. Update your billing details to restore full access."
            : isCancelled
            ? "Your subscription has ended. Renew to restore full access."
            : "You're on the free plan. Upgrade to unlock all features."}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/billing"
          className={cn(
            "rounded-md px-3 py-1 text-xs font-semibold transition-colors",
            isPastDue || isCancelled
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isPastDue || isCancelled ? "Fix billing" : "Upgrade"}
        </Link>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
