import { SettingsShell } from "@/components/settings/settings-shell";
import { PasswordForm } from "@/components/settings/password-form";

export default function SettingsPasswordPage() {
  return (
    <SettingsShell active="password">
      <PasswordForm />
    </SettingsShell>
  );
}
