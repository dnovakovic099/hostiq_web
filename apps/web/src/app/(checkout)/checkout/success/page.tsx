"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { api } from "@/lib/api";

interface BillingStatusResponse {
  success: boolean;
  data?: { subscriptionStatus: "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELLED" };
}

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const updateSubscriptionStatus = useAuthStore((s) => s.updateSubscriptionStatus);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Poll for subscription activation (webhook may be slightly delayed)
    let attempts = 0;
    const maxAttempts = 10;

    const check = async () => {
      try {
        const res = await api.get<BillingStatusResponse>("/billing/status");
        if (res.success && res.data?.subscriptionStatus === "ACTIVE") {
          updateSubscriptionStatus("ACTIVE");
          setVerified(true);
          return;
        }
      } catch {
        // ignore
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(check, 1500);
      } else {
        // Optimistically mark as active even if webhook is slow
        updateSubscriptionStatus("ACTIVE");
        setVerified(true);
      }
    };

    check();
  }, [updateSubscriptionStatus]);

  return (
    <div className="w-full max-w-md text-center space-y-6">
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 shadow-xl shadow-primary/30">
            <Zap className="h-10 w-10 text-white" />
          </div>
          {verified && (
            <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-green-500 ring-2 ring-background">
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {verified ? "You're all set!" : "Activating your account..."}
        </h1>
        <p className="text-muted-foreground">
          {verified
            ? "Your HostIQ Pro subscription is now active. Enjoy the full platform!"
            : "We're confirming your payment. This only takes a moment."}
        </p>
      </div>

      {!verified && (
        <div className="flex justify-center">
          <div className="h-1.5 w-40 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-full rounded-full bg-primary animate-pulse" />
          </div>
        </div>
      )}

      {verified && (
        <Button className="w-full" onClick={() => router.replace("/dashboard")}>
          Go to dashboard
        </Button>
      )}
    </div>
  );
}
