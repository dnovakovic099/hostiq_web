"use client";

import { Bell, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

export function Topbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/40 bg-background/80 backdrop-blur-xl px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-4 pl-10 lg:pl-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <input
            type="search"
            placeholder="Search properties, reservations..."
            className="w-full h-9 rounded-lg border border-border/40 bg-muted/40 pl-9 pr-4 text-sm placeholder:text-muted-foreground/40 focus:bg-card focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-ring/10 transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse-subtle" />
        </Button>
        <div className="hidden sm:flex items-center gap-2.5 pl-2 ml-1.5 border-l border-border/40">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 text-white text-xs font-semibold shadow-sm">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium leading-tight">{user?.name ?? "User"}</p>
            <p className="text-[11px] text-muted-foreground leading-tight uppercase tracking-wider">{user?.role ?? ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
