"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { User, Lock, Bell, Plug } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    inApp: true,
  });
  const [savingNotifications, setSavingNotifications] = useState(false);

  const [integrationStatus, setIntegrationStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get<{ success: boolean; data: UserProfile }>("/auth/me");
        setProfile(res.data);
        setProfileForm({
          name: res.data.name ?? "",
          email: res.data.email ?? "",
          phone: res.data.phone ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchWebhookStatus = async () => {
      try {
        const res = await api.get<{
          success: boolean;
          data: {
            hostify?: { webhooks?: Array<{ confirmed: boolean }> };
            hostbuddy?: { status: string };
          };
        }>("/webhooks/status");
        const data = res.data;
        setIntegrationStatus({
          hostify: data.hostify?.webhooks?.some((w) => w.confirmed) ? "connected" : "disconnected",
          hostbuddy: data.hostbuddy?.status ?? "unknown",
          openphone: "unknown",
        });
      } catch {
        setIntegrationStatus({
          hostify: "unknown",
          hostbuddy: "unknown",
          openphone: "unknown",
        });
      }
    };
    fetchWebhookStatus();
  }, []);

  const saveProfile = async () => {
    try {
      setError(null);
      await api.put("/auth/me", {
        name: profileForm.name || undefined,
        email: profileForm.email || undefined,
        phone: profileForm.phone || undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    setPasswordError(null);
    setSavingPassword(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(true);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((n) => ({ ...n, [key]: !n[key] }));
    setSavingNotifications(true);
    // Simulate save - no API yet for notification prefs
    setTimeout(() => setSavingNotifications(false), 500);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Settings</h1>
          <p>Manage your account and preferences</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-5 w-32 rounded bg-muted/60 skeleton" />
              <div className="h-10 w-full rounded-lg bg-muted/40 skeleton" />
              <div className="h-10 w-full rounded-lg bg-muted/40 skeleton" />
              <div className="h-10 w-3/4 rounded-lg bg-muted/40 skeleton" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {error && (
        <p className="text-destructive">{error}</p>
      )}

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>Update your name, email, and phone</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Name</label>
            <Input
              value={profileForm.name}
              onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email</label>
            <Input
              type="email"
              value={profileForm.email}
              onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="Email"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Phone</label>
            <Input
              value={profileForm.phone}
              onChange={(e) => setProfileForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Phone number"
            />
          </div>
          <Button onClick={saveProfile}>
            {saveSuccess ? "Saved!" : "Save"}
          </Button>
        </CardContent>
      </Card>

      {/* Security Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Security
          </CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Current password</label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, currentPassword: e.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">New password</label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, newPassword: e.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Confirm new password</label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm((f) => ({ ...f, confirmPassword: e.target.value }))
              }
              placeholder="••••••••"
            />
          </div>
          {passwordError && <p className="text-destructive text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 text-sm">Password changed successfully</p>}
          <Button onClick={changePassword} disabled={savingPassword}>
            Change password
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email notifications</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications.email}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                notifications.email ? "bg-primary" : "bg-muted"
              )}
              onClick={() => toggleNotification("email")}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                  notifications.email ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">SMS notifications</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications.sms}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                notifications.sms ? "bg-primary" : "bg-muted"
              )}
              onClick={() => toggleNotification("sms")}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                  notifications.sms ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">In-app notifications</span>
            <button
              type="button"
              role="switch"
              aria-checked={notifications.inApp}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                notifications.inApp ? "bg-primary" : "bg-muted"
              )}
              onClick={() => toggleNotification("inApp")}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition",
                  notifications.inApp ? "translate-x-5" : "translate-x-1"
                )}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integration Status
          </CardTitle>
          <CardDescription>Connection status for your integrations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {["hostify", "hostbuddy", "openphone"].map((name) => (
            <div key={name} className="flex items-center justify-between">
              <span className="font-medium capitalize">{name}</span>
              <Badge
                variant={
                  integrationStatus[name] === "connected" || integrationStatus[name] === "healthy"
                    ? "default"
                    : "secondary"
                }
                className={cn(
                  (integrationStatus[name] === "connected" ||
                    integrationStatus[name] === "healthy") &&
                    "bg-green-600 hover:bg-green-700"
                )}
              >
                {integrationStatus[name] ?? "Unknown"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
