"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  SprayCan,
  DollarSign,
  TrendingUp,
  Megaphone,
  Star,
  AlertTriangle,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";

const navItems: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}> = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reservations", label: "Reservations", icon: Calendar },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/cleaners", label: "Cleaners", icon: SprayCan },
  { href: "/pricing", label: "Pricing", icon: DollarSign },
  { href: "/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/reviews", label: "Reviews", icon: Star },
  { href: "/issues", label: "Issues", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: Shield, adminOnly: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const hasRole = useAuthStore((s) => s.hasRole);
  const [mobileOpen, setMobileOpen] = useState(false);

  const showAdmin = hasRole("ADMIN") || hasRole("INTERNAL_OPS");

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || showAdmin
  );

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-3 left-3 z-50 text-foreground"
        onClick={() => setMobileOpen((o) => !o)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-[260px] flex flex-col",
          "bg-[hsl(230,25%,9%)] text-sidebar-fg",
          "transition-transform duration-300 ease-out lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Ambient gradient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-primary/[0.07] blur-3xl" />
          <div className="absolute bottom-20 -right-10 w-40 h-40 rounded-full bg-violet-500/[0.05] blur-3xl" />
        </div>

        {/* Logo */}
        <div className="relative px-5 h-[60px] flex items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-violet-500 shadow-lg shadow-primary/20 transition-shadow group-hover:shadow-primary/30">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-white">
              Host<span className="text-primary/90">IQ</span>
            </span>
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/25">
            Menu
          </p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-[9px] text-[13px] font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/[0.08] text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-gradient-to-b from-primary to-violet-400" />
                )}
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] shrink-0 transition-colors duration-200",
                    isActive ? "text-primary" : "text-white/30 group-hover:text-white/60"
                  )}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* User section */}
        <div className="relative p-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-violet-500/80 text-white text-xs font-semibold ring-2 ring-white/[0.06]">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-white/90 truncate">
                {user?.name ?? "User"}
              </p>
              <p className="text-[11px] text-white/30 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout();
              setMobileOpen(false);
            }}
            className="mt-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-white/30 transition-all duration-200 hover:bg-white/[0.04] hover:text-rose-400"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
