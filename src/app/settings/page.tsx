import { SettingsContent } from "@/components/settings/SettingsContent";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background-primary px-4 py-8 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Settings</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Manage your workspace, team, billing, connected tools, and account.
          </p>
        </div>
        <SettingsContent />
      </div>
    </main>
  );
}
