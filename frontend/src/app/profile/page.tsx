import type { Metadata } from "next";

import { ProfileView } from "@/components/profile/ProfileView";

export const metadata: Metadata = {
  title: "Profile | Mi Spotify Wrapped",
  description: "Your Spotify account profile from the data warehouse",
};

export default function ProfilePage() {
  return <ProfileView />;
}
