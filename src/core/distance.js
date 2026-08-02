/**
 * Distance on the ground.
 *
 * Lives in the core rather than beside the geolocation adapter because the
 * engine needs it: a task that names a place has to be able to ask how far away
 * the group is. Pure arithmetic, no device, no I/O — which is what lets it sit
 * here at all.
 */

const EARTH_RADIUS_M = 6371008.8;

const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Great-circle distance in metres. Haversine is accurate enough at walking
 * scale and needs no projection or dependency.
 */
export function haversine(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "250 m", "1.4 km" — what a walker wants to read. */
export function formatDistance(metres) {
  if (!Number.isFinite(metres)) return "?";
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`;
}
