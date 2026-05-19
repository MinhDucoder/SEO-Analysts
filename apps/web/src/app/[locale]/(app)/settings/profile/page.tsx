import { SettingsShell } from "@/components/settings/settings-shell";
import { ProfileForm } from "@/components/settings/profile-form";

export default function SettingsProfilePage() {
  return (
    <SettingsShell active="profile">
      <ProfileForm />
    </SettingsShell>
  );
}
