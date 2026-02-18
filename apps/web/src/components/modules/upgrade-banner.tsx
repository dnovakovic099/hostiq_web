"use client";

import Link from "next/link";
import { Zap, X, AlertTriangle, Lock } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SubscriptionStatus } from "@/lib/auth-store";

interface UpgradeBannerProps {
  status: SubscriptionStatus;
}

interface PageContext {
  limitation: string;
  benefit: string;
}

const PAGE_CONTEXT: Record<string, PageContext> = {
  "/pricing": {
    limitation: "Pricing calendar locked after 7 days",
    benefit: "Upgrade for 30-day calendar + dynamic pricing",
  },
  "/revenue": {
    limitation: "Revenue analytics are read-only on the free plan",
    benefit: "Upgrade for per-property P&L and full trend reports",
  },
  "/marketing": {
    limitation: "Listing audits are limited on the free plan",
    benefit: "Upgrade for unlimited AI-powered listing optimization",
  },
  "/messages": {
    limitation: "AI guest message automation is locked",
    benefit: "Upgrade to enable auto-replies and sentiment detection",
  },
  "/reservations": {
    limitation: "Reservation sync is read-only on the free plan",
    benefit: "Upgrade to enable dynamic pricing and full calendar control",
  },
  "/dashboard": {
    limitation: "Dynamic pricing, AI automation, and full analytics are locked",
    benefit: "Upgrade to unlock the full platform",
  },
};

const DEFAULT_CONTEXT: PageContext = {
  limitation: "Dynamic pricing, AI automation, and full analytics are locked",
  benefit: "Upgrade to unlock the complete HostIQ platform",
};

export function UpgradeBanner({ status }: UpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  if (dismissed || status === "ACTIVE") return null;

  const isPastDue = status === "PAST_DUE";
  const isCancelled = status === "CANCELLED";
  const isFree = !isPastDue && !isCancelled;

  const ctx = PAGE_CONTEXT[pathname] ?? DEFAULT_CONTEXT;

  return (
    <div
      className={cn(
        "relative flex items-center justify-between gap-3 px-4 py-2 text-sm border-b",
        isPastDue || isCancelled
          ? "bg-amber-500/10 border-amber-500/25 text-amber-200"
          : "bg-primary/[0.08] border-primary/15 text-foreground"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {isPastDue || isCancelled ? (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
        ) : (
          <div className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md bg-primary/15">
            <Lock className="h-3.5 w-3.5 text-primary" />
          </div>
        )}

        {isFree ? (
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span className="text-xs font-semibold text-primary shrink-0">Free plan</span>
            <span className="text-muted-foreground text-xs hidden sm:inline">·</span>
            <span className="text-xs text-muted-foreground hidden sm:inline truncate">
              {ctx.limitation}
            </span>
            <span className="text-muted-foreground text-xs hidden md:inline">·</span>
            <span className="text-xs font-medium hidden md:inline truncate">
              {ctx.benefit}
            </span>
          </div>
        ) : (
          <span className="text-xs truncate">
            {isPastDue
              ? "Payment failed — update your billing details to restore full access."
              : "Subscription ended — renew to restore full access."}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Link
          href="/billing"
          className={cn(
            "rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap",
            isPastDue || isCancelled
              ? "bg-amber-500 text-black hover:bg-amber-400"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isPastDue ? "Fix billing" : isCancelled ? "Renew" : "Upgrade — from $199/mo"}
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
