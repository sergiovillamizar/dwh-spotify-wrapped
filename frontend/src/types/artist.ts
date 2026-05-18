/** Matches backend `ArtistResponse`. */
export interface Artist {
  artist_id: number;
  spotify_id: string;
  name: string;
  popularity: number | null;
  followers_count: number | null;
  genres: string[] | null;
}

/** Matches backend `TopArtistsResponse`. */
export interface TopArtistsResponse {
  items: Artist[];
  total: number;
}
