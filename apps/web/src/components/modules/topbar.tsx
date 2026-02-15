"use client";

import { Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/lib/auth-store";

export function Topbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <div className="flex flex-1 items-center gap-4">
        <div className="flex-1 max-w-md">
          <Input
            type="search"
            placeholder="Search..."
            className="w-full"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarImage src="" alt={user?.name ?? "User"} />
          <AvatarFallback className="text-xs">
            {user?.name?.[0]?.toUpperCase() ??
              user?.email?.[0]?.toUpperCase() ??
              "?"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
