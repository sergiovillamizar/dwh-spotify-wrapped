/**
 * frontend/src/app/api/health/route.ts
 * Health-check endpoint used by the Cloud Run startup probe.
 *
 * Cloud Run is configured with:
 *   startupProbe.httpGet.path = /api/health
 *
 * Returns HTTP 200 with a minimal JSON body so the probe passes
 * as soon as Next.js is ready to serve requests.
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Didier / Sergio
 */

import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
