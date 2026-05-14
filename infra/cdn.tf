/**
 * cdn.tf
 * Cloud CDN configuration summary.
 *
 * CDN is configured inline on the backend resources (load_balancer.tf) as
 * the google provider attaches cdn_policy directly to backend services and
 * backend buckets.  This file documents the CDN topology and contains any
 * supplementary CDN-specific resources (e.g. signed-URL keys if needed later).
 *
 * CDN topology:
 *  - google_compute_backend_bucket.static_assets
 *      enable_cdn  = true
 *      cache_mode  = CACHE_ALL_STATIC
 *      default_ttl = 3600 (1 hour)
 *      max_ttl     = 86400 (24 hours)
 *
 *  - google_compute_backend_service.backend_api   (/v1/*)
 *      enable_cdn  = false   (API responses must NOT be cached)
 *
 *  - google_compute_backend_service.frontend_ssr  (default /*)
 *      enable_cdn  = true
 *      cache_mode  = USE_ORIGIN_HEADERS
 *      Next.js sets its own Cache-Control headers per route type:
 *        - Static pages:  public, max-age=31536000, immutable
 *        - Dynamic pages: no-cache (SSR) or short TTL
 *
 * Project:  dwh-spotify-wrapped
 * Author:   Sergio / Didier
 * Updated:  2026-05-14
 */

# No additional resources required at this time.
# CDN policy is embedded in load_balancer.tf backend resources.
# If signed URLs are required in the future, add a
# google_compute_backend_bucket_signed_url_key resource here.
