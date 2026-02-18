"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/modules/sidebar";
import { Topbar } from "@/components/modules/topbar";
import { UpgradeBanner } from "@/components/modules/upgrade-banner";
import { useAuthStore, SubscriptionStatus } from "@/lib/auth-store";
import { api } from "@/lib/api";

interface BillingStatusResponse {
  success: boolean;
  data?: { subscriptionStatus: SubscriptionStatus; subscriptionEndsAt: string | null };
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const user = useAuthStore((s) => s.user);
  const updateSubscriptionStatus = useAuthStore((s) => s.updateSubscriptionStatus);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedToken = localStorage.getItem("hostiq_token");
    if (!storedToken) {
      router.replace("/login");
      return;
    }
    setReady(true);

    // Refresh subscription status in the background
    api
      .get<BillingStatusResponse>("/billing/status")
      .then((res) => {
        if (res.success && res.data) {
          updateSubscriptionStatus(res.data.subscriptionStatus);
        }
      })
      .catch(() => {/* non-critical — ignore */});
  }, [router, updateSubscriptionStatus]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const subscriptionStatus = user?.subscriptionStatus ?? "FREE";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="lg:pl-[260px]">
        <Topbar />
        <UpgradeBanner status={subscriptionStatus} />
        <main className="p-4 lg:p-6 xl:p-8 animate-fade-in bg-mesh min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
