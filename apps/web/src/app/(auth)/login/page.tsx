"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { Loader2, AlertCircle } from "lucide-react";

interface LoginResponse {
  success: boolean;
  data?: {
    token: string;
    user: { id: string; email: string; name: string | null; role: string; subscriptionStatus: string };
  };
  error?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      if (!res.success || !res.data) {
        setError(res.error ?? "Login failed");
        return;
      }

      login(res.data.token, {
        id: res.data.user.id,
        email: res.data.user.email,
        name: res.data.user.name,
        role: res.data.user.role as "OWNER" | "CLEANER" | "INTERNAL_OPS" | "ADMIN",
        subscriptionStatus: (res.data.user.subscriptionStatus ?? "FREE") as "FREE" | "ACTIVE" | "PAST_DUE" | "CANCELLED",
      });

      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Welcome back</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to your HostIQ account
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-10"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-primary/80 hover:text-primary transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="h-10"
        />
      </div>

      <Button type="submit" className="w-full h-10" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Create account
        </Link>
      </p>
    </form>
  );
}
