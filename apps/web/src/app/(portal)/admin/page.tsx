"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Users, Zap, RefreshCw, FileText } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  lastLogin: string | null;
}

interface IntegrationHealth {
  name: string;
  status: string;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  errorMessage: string | null;
  consecutiveFailures: number;
}

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  payload: unknown;
  ipAddress: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null } | null;
}

export default function AdminPage() {
  const hasRole = useAuthStore((s) => s.hasRole);
  const isAdmin = hasRole("ADMIN") || hasRole("INTERNAL_OPS");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "CLEANER" as "OWNER" | "CLEANER" | "INTERNAL_OPS" | "ADMIN",
    propertyIds: [] as string[],
  });
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setError(null);
      const [usersRes, integrationsRes, auditRes] = await Promise.all([
        api.get<{ success: boolean; data: AdminUser[] }>("/admin/users"),
        api.get<{ success: boolean; data: IntegrationHealth[] }>("/admin/integrations/health"),
        api.get<{ success: boolean; data: AuditEntry[] }>("/admin/audit?limit=30"),
      ]);
      setUsers(usersRes.data ?? []);
      setIntegrations(integrationsRes.data ?? []);
      setAuditLog(auditRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    setInviteSuccess(false);
    try {
      await api.post("/auth/invite", {
        email: inviteForm.email,
        role: inviteForm.role,
        propertyIds: inviteForm.propertyIds,
      });
      setInviteSuccess(true);
      setInviteForm({ email: "", role: "CLEANER", propertyIds: [] });
      fetchData();
    } catch {
      // Error
    } finally {
      setInviting(false);
    }
  };

  const triggerSync = (integration: string) => {
    setSyncing(integration);
    // TODO: POST /api/admin/sync/trigger when API exists
    setTimeout(() => setSyncing(null), 1500);
  };

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Admin</h1>
          <p className="text-destructive mt-2">Access denied. Admin or Internal Ops role required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1>Admin</h1>
          <p>User management, integrations, and audit log</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="h-5 w-48 rounded bg-muted/60 skeleton" />
              <div className="h-4 w-full rounded bg-muted/40 skeleton" />
              <div className="h-4 w-3/4 rounded bg-muted/40 skeleton" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1>Admin</h1>
        <p>User management, integrations, and audit log</p>
      </div>

      {error && <p className="text-destructive">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Users
            </CardTitle>
            <CardDescription>All users with role and status</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="premium-table">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-sm">Email</th>
                      <th className="text-left p-3 font-medium text-sm">Role</th>
                      <th className="text-left p-3 font-medium text-sm">Created</th>
                      <th className="text-left p-3 font-medium text-sm">Last login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b">
                        <td className="p-3 text-sm">{u.email}</td>
                        <td className="p-3">
                          <Badge variant="outline">{u.role}</Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {u.lastLogin
                            ? new Date(u.lastLogin).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite User Form */}
        <Card>
          <CardHeader>
            <CardTitle>Invite User</CardTitle>
            <CardDescription>Send an invite by email with role and property access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Role</label>
              <select
                className="filter-select w-full"
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm((f) => ({
                    ...f,
                    role: e.target.value as "OWNER" | "CLEANER" | "INTERNAL_OPS" | "ADMIN",
                  }))
                }
              >
                <option value="OWNER">Owner</option>
                <option value="CLEANER">Cleaner</option>
                <option value="INTERNAL_OPS">Internal Ops</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Property selection</label>
              <p className="text-xs text-muted-foreground mb-1">
                Property assignment (optional) — API supports propertyIds array
              </p>
              <Input
                placeholder="Property IDs (comma-separated)"
                value={inviteForm.propertyIds.join(", ")}
                onChange={(e) =>
                  setInviteForm((f) => ({
                    ...f,
                    propertyIds: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
            {inviteSuccess && (
              <p className="text-green-600 text-sm">Invite sent successfully</p>
            )}
            <Button onClick={sendInvite} disabled={!inviteForm.email || inviting}>
              Send invite
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Integration Health Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Integration Health
          </CardTitle>
          <CardDescription>Status of all integrations with last sync time</CardDescription>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="py-12 text-center">
              <Zap className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No integration data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((int) => (
                <div
                  key={int.name}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div>
                    <p className="font-medium capitalize">{int.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Last success:{" "}
                      {int.lastSuccessAt
                        ? new Date(int.lastSuccessAt).toLocaleString()
                        : "Never"}
                    </p>
                    {int.errorMessage && (
                      <p className="text-sm text-destructive mt-1">{int.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        int.status === "healthy" ? "default" : "secondary"
                      }
                      className={cn(
                        int.status === "healthy" && "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {int.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!!syncing}
                      onClick={() => triggerSync(int.name)}
                    >
                      {syncing === int.name ? (
                        "Syncing..."
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Log
          </CardTitle>
          <CardDescription>Recent audit entries</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLog.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No audit entries</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="premium-table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium text-sm">Action</th>
                    <th className="text-left p-3 font-medium text-sm">Entity</th>
                    <th className="text-left p-3 font-medium text-sm">User</th>
                    <th className="text-left p-3 font-medium text-sm">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.id} className="border-b">
                      <td className="p-3 text-sm">{entry.action}</td>
                      <td className="p-3 text-sm">
                        {entry.entityType}
                        {entry.entityId && ` #${entry.entityId.slice(0, 8)}`}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {entry.user?.email ?? "—"}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
