export interface ETLRun {
  audit_id: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  history_new: number;
  history_skipped: number;
  artists_new: number;
  tracks_new: number;
  cursor_next_ms: number | null;
  error_message: string | null;
}

export interface ETLStatusResponse {
  runs: ETLRun[];
  total: number;
}

export interface ETLRunResponse {
  audit_id: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  history_new: number;
  history_skipped: number;
  artists_new: number;
  tracks_new: number;
  cursor_next_ms: number | null;
  error_message: string | null;
}
