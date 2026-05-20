/** Matches backend `PeakHourBucket`. */
export interface PeakHourBucket {
  hour: number;
  count: number;
}

/** Matches backend `PeakHourResponse`. */
export interface PeakHourResponse {
  items: PeakHourBucket[];
  peak_hour: number | null;
  total_plays: number;
}

/** Matches backend `GenreBucket`. */
export interface GenreBucket {
  genre: string;
  count: number;
}

/** Matches backend `GenresResponse`. */
export interface GenresResponse {
  items: GenreBucket[];
  total: number;
}
