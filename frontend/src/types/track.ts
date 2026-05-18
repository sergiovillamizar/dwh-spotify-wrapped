/** Matches backend `TrackResponse`. */
export interface Track {
  track_id: number;
  spotify_id: string;
  name: string;
  artist_id: number | null;
  artist_name: string | null;
  album_name: string | null;
  duration_ms: number | null;
  popularity: number | null;
  explicit: boolean | null;
}

/** Matches backend `TopTracksResponse`. */
export interface TopTracksResponse {
  items: Track[];
  total: number;
}
