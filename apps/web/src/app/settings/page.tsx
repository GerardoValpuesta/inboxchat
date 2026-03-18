import { redirect } from "next/navigation";

// /settings → /settings/general
export default function SettingsIndexPage() {
  redirect("/settings/general");
}
