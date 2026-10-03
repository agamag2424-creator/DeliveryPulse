"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { JiraSetupWizard } from "@/components/connectors/JiraSetupWizard";
import { FormInput } from "@/components/form/FormInput";
import { BillingSettings } from "@/components/settings/BillingSettings";
import { CONNECTOR_CATALOG } from "@/lib/connectors/catalog-meta";
import { CONNECTOR_TYPES, connectorTypeToSlug, isConnectorType } from "@/lib/connectors/types";

type SettingsTab = "profile" | "team" | "billing" | "tools" | "danger";

interface ConnectorListItem {
  id: string;
  projectId: string | null;
  projectName: string;
  type: string;
  status: string;
  jiraProjectName: string | null;
  mappedName?: string | null;
  lastSyncedAt: string | null;
}

interface ProfileData {
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
}

export function SettingsContent() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [tab, setTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [connectors, setConnectors] = useState<ConnectorListItem[]>([]);
  const [jiraOAuthConfigured, setJiraOAuthConfigured] = useState(true);
  const [oauthConfigured, setOauthConfigured] = useState<Record<string, boolean>>({ JIRA: true });
  const [canManageConnectors, setCanManageConnectors] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [jiraWizard, setJiraWizard] = useState<{ projectId: string; projectName: string } | null>(null);

  useEffect(() => {
    const tabParam = new URLSearchParams(window.location.search).get("tab");
    if (tabParam === "profile" || tabParam === "team" || tabParam === "billing" || tabParam === "tools" || tabParam === "danger") {
      setTab(tabParam);
    }

    void fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { profile?: ProfileData } | null) => {
        if (payload?.profile) {
          setProfile(payload.profile);
          setName(payload.profile.name ?? "");
        }
      });
    void fetch("/api/user/connectors")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (payload: {
          connectors?: ConnectorListItem[];
          jiraOAuthConfigured?: boolean;
          oauthConfigured?: Record<string, boolean>;
          canManage?: boolean;
        } | null) => {
          setConnectors(payload?.connectors ?? []);
          setJiraOAuthConfigured(payload?.jiraOAuthConfigured ?? true);
          setOauthConfigured(payload?.oauthConfigured ?? { JIRA: payload?.jiraOAuthConfigured ?? true });
          setCanManageConnectors(payload?.canManage ?? false);
        },
      );
  }, []);

  async function saveProfile() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      setError("Failed to update profile");
      return;
    }
    setMessage("Profile updated");
    await update({ name });
  }

  async function disconnectConnector(connectorId: string) {
    const response = await fetch("/api/user/connectors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectorId }),
    });
    if (response.ok) {
      setConnectors((current) => current.filter((item) => item.id !== connectorId));
    }
  }

  async function deleteAccount() {
    if (deleteConfirm !== "DELETE") {
      setError('Type "DELETE" to confirm');
      return;
    }
    const response = await fetch("/api/user/account", { method: "DELETE" });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to delete account");
      return;
    }
    await signOut({ redirect: false });
    router.push("/");
  }

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "profile", label: "Profile" },
    { id: "team", label: "Team" },
    { id: "billing", label: "Billing" },
    { id: "tools", label: "Connected Tools" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 md:flex-row">
      <nav className="flex gap-2 md:w-48 md:flex-col">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-[3px] px-3 py-2 text-left text-sm ${
              tab === item.id
                ? "bg-cyan/10 font-semibold text-ink"
                : "text-text-muted hover:bg-faint hover:text-ink"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 space-y-4">
        {message ? <p className="text-sm text-rag-green">{message}</p> : null}
        {error ? <p className="text-sm text-rag-red">{error}</p> : null}

        {tab === "profile" ? (
          <section className="rounded-panel border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-text-primary">Profile</h2>
            <div className="mt-4 flex items-center gap-4">
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-12 w-12 rounded-full" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background-elevated text-sm text-text-muted">
                  {(name || profile?.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm text-text-primary">{profile?.email}</p>
                <p className="text-xs text-text-muted">
                  Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—"}
                </p>
              </div>
            </div>
            <div className="mt-4 max-w-md">
              <FormInput id="profile-name" label="Display name" value={name} onChange={(e) => setName(e.target.value)} />
              <p className="mt-2 text-xs text-text-muted">Email is managed by your sign-in provider and cannot be changed here.</p>
              <button
                type="button"
                onClick={() => void saveProfile()}
                className="mt-4 rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black"
              >
                Save
              </button>
            </div>
          </section>
        ) : null}

        {tab === "team" ? <TeamSettings /> : null}

        {tab === "billing" ? <BillingSettings /> : null}

        {tab === "tools" ? (
          <section className="rounded-panel border border-border bg-background-card p-6">
            <h2 className="text-lg font-semibold text-text-primary">Connected Tools</h2>
            <p className="mt-2 text-sm text-text-muted">
              Connect each tool once for the workspace, then map a project, board, or list from a Delivery Pulse
              project.
            </p>
            {canManageConnectors ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {CONNECTOR_TYPES.map((type) => {
                  const catalog = CONNECTOR_CATALOG[type];
                  const configured = oauthConfigured[type] ?? (type === "JIRA" ? jiraOAuthConfigured : false);
                  const slug = connectorTypeToSlug(type);
                  if (!configured) {
                    return (
                      <span key={type} className="text-sm text-text-muted">
                        {catalog.label} not configured in .env.local
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={type}
                      href={`/api/connectors/${slug}/auth`}
                      className="rounded-lg border border-border px-3 py-2 text-sm text-accent-blue hover:bg-background-elevated"
                    >
                      Connect {catalog.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
            {connectors.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">No connectors yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {connectors.map((connector) => {
                  const typeLabel = isConnectorType(connector.type)
                    ? CONNECTOR_CATALOG[connector.type].label
                    : connector.type;
                  const slug = isConnectorType(connector.type) ? connectorTypeToSlug(connector.type) : "jira";
                  const configured = oauthConfigured[connector.type] ?? (connector.type === "JIRA" ? jiraOAuthConfigured : false);
                  const mapped = connector.mappedName ?? connector.jiraProjectName;
                  return (
                    <div key={`${connector.id}-${connector.projectId ?? "org"}`} className="rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {typeLabel} — {connector.projectName}
                          </p>
                          <p className="text-xs text-text-muted">
                            {mapped ?? "No project mapped"} ·{" "}
                            {connector.lastSyncedAt
                              ? `Last synced ${new Date(connector.lastSyncedAt).toLocaleString()}`
                              : "Not synced yet"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            connector.status === "ACTIVE"
                              ? "bg-rag-green/10 text-rag-green"
                              : connector.status === "DISCONNECTED"
                                ? "bg-red-500/10 text-rag-red"
                                : "bg-rag-amber/10 text-rag-amber"
                          }`}
                        >
                          {connector.status}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {configured && canManageConnectors ? (
                          <Link
                            href={`/api/connectors/${slug}/auth?reconnect=true`}
                            className="text-sm text-accent-blue hover:underline"
                          >
                            Re-authenticate
                          </Link>
                        ) : (
                          <span className="text-sm text-text-muted">{typeLabel} OAuth not configured locally</span>
                        )}
                        {canManageConnectors ? (
                          <button
                            type="button"
                            onClick={() => void disconnectConnector(connector.id)}
                            className="text-sm text-rag-red hover:underline"
                          >
                            Disconnect
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}

        {tab === "danger" ? (
          <section className="rounded-panel border border-rag-red/30 bg-charcoal p-6">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-cream/70">Danger zone</p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-cream">Delete account</h2>
            <p className="mt-2 text-sm text-cream/70">
              Permanently delete your account. Workspaces where you are the only member will be deleted. If you
              own a workspace with other members, transfer ownership first.
            </p>
            <FormInput
              id="delete-confirm"
              label='Type "DELETE" to confirm'
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void deleteAccount()}
              className="mt-4 rounded-[3px] bg-rag-red px-4 py-2 text-sm font-semibold text-cream hover:bg-red-500"
            >
              Delete Account
            </button>
          </section>
        ) : null}
      </div>

      {jiraWizard ? (
        <JiraSetupWizard
          open
          projectId={jiraWizard.projectId}
          projectName={jiraWizard.projectName}
          onClose={() => setJiraWizard(null)}
          onComplete={() => setJiraWizard(null)}
        />
      ) : null}
    </div>
  );
}

function TeamSettings() {
  const [organizationName, setOrganizationName] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [canInvite, setCanInvite] = useState(false);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [members, setMembers] = useState<
    Array<{ id: string; userId: string; role: string; email: string; name: string | null }>
  >([]);
  const [invites, setInvites] = useState<Array<{ id: string; email: string; role: string }>>([]);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reload() {
    void fetch("/api/org/members")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (payload: {
          organization?: { name: string };
          role?: string;
          canInvite?: boolean;
          canManageMembers?: boolean;
          members?: Array<{ id: string; userId: string; role: string; email: string; name: string | null }>;
          invites?: Array<{ id: string; email: string; role: string }>;
        } | null) => {
          if (!payload) {
            return;
          }
          setOrganizationName(payload.organization?.name ?? "");
          setRole(payload.role ?? "MEMBER");
          setCanInvite(Boolean(payload.canInvite));
          setCanManageMembers(Boolean(payload.canManageMembers));
          setMembers(payload.members ?? []);
          setInvites(payload.invites ?? []);
        },
      );
  }

  useEffect(() => {
    reload();
  }, []);

  async function sendInvite() {
    setError(null);
    setMessage(null);
    const response = await fetch("/api/org/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: inviteRole }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "Failed to invite");
      return;
    }
    setEmail("");
    setMessage("Invite sent");
    reload();
  }

  return (
    <section className="rounded-panel border border-border bg-background-card p-6">
      <h2 className="text-lg font-semibold text-text-primary">{organizationName || "Team"}</h2>
      <p className="mt-1 text-sm text-text-muted">Your role: {role.toLowerCase()}</p>
      {message ? <p className="mt-2 text-sm text-rag-green">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-rag-red">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {members.map((member) => (
          <li key={member.id} className="flex items-center justify-between gap-3 text-sm text-text-primary">
            <span>
              {member.name || member.email}{" "}
              <span className="text-text-muted">({member.role.toLowerCase()})</span>
            </span>
            {canManageMembers && member.role !== "OWNER" ? (
              <select
                className="rounded-md border border-border bg-background-elevated px-2 py-1 text-xs text-text-primary"
                value={member.role}
                onChange={(event) => {
                  void fetch("/api/org/members", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ membershipId: member.id, role: event.target.value }),
                  }).then(() => reload());
                }}
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
              </select>
            ) : null}
          </li>
        ))}
      </ul>

      {canInvite ? (
        <div className="mt-6 max-w-md space-y-3">
          <FormInput id="invite-email" label="Invite by email" value={email} onChange={(e) => setEmail(e.target.value)} />
          {role === "OWNER" ? (
            <select
              className="w-full rounded-md border border-border bg-background-elevated px-3 py-2 text-sm text-text-primary"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "MEMBER")}
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
          ) : null}
          <button
            type="button"
            onClick={() => void sendInvite()}
            className="rounded-[3px] bg-ink px-4 py-2 text-sm font-semibold text-cream hover:bg-black"
          >
            Send invite
          </button>
          {invites.length > 0 ? (
            <ul className="space-y-1 text-xs text-text-muted">
              {invites.map((invite) => (
                <li key={invite.id} className="flex items-center justify-between gap-2">
                  <span>
                    Pending: {invite.email} ({invite.role.toLowerCase()})
                  </span>
                  <button
                    type="button"
                    className="text-rag-red hover:underline"
                    onClick={() => {
                      void fetch("/api/org/members", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ inviteId: invite.id }),
                      }).then(() => reload());
                    }}
                  >
                    Revoke
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">Only owners and admins can invite teammates.</p>
      )}
    </section>
  );
}
