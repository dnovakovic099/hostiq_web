"use client";

import { Bell, Search, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

export function Topbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/30 bg-background/70 backdrop-blur-xl backdrop-saturate-150 px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-4 pl-10 lg:pl-0">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 transition-colors group-focus-within:text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="w-full h-8 rounded-lg border-0 bg-muted/50 pl-9 pr-12 text-sm placeholder:text-muted-foreground/40 focus:bg-muted/80 focus:outline-none focus:ring-1 focus:ring-ring/10 transition-all duration-200"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border/60 bg-muted/60 px-1.5 text-[10px] font-medium text-muted-foreground/50">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8 text-muted-foreground/60 hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-pulse-subtle" />
        </Button>
        <div className="hidden sm:flex items-center gap-2.5 pl-3 ml-1 border-l border-border/30">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 text-white text-[10px] font-semibold">
            {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="hidden md:block">
            <p className="text-[13px] font-medium leading-tight">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-muted-foreground/60 leading-tight uppercase tracking-wider">{user?.role ?? ""}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
