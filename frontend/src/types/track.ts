/** Matches backend `TrackResponse`. */
export interface Track {
  track_id: number;
  spotify_id: string;
  name: string;
  artist_id: number | null;
  artist_name: string | null;
  album_name: string | null;
  album_image_url: string | null;
  duration_ms: number | null;
  popularity: number | null;
  explicit: boolean | null;
  lastfm_listeners: number | null;
  lastfm_playcount: number | null;
}

/** Matches backend `TopTracksResponse`. */
export interface TopTracksResponse {
  items: Track[];
  total: number;
}
