/** Matches backend `UserResponse` (GET /v1/profile/me). */
export interface UserProfile {
  user_id: number;
  spotify_id: string;
  display_name: string | null;
  email: string | null;
  country: string | null;
  followers: number | null;
  product: string | null;
  loaded_at: string;
}
