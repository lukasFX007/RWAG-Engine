/**
 * Position, and the zones that do not exist yet.
 *
 * `roles.json` gates two role effects on GPS zones — the Nenasyta gains
 * reputation in the `pubs` zone, the Lenoch loses it in `no_village` — but the
 * game data contains no coordinates for either zone, anywhere. That is missing
 * content, not something this module may invent: making up a circle around
 * Troskovice would silently decide game balance and would be wrong on the
 * ground.
 *
 * So this is the whole interface, ready and empty: it watches the device
 * position, measures distances, and resolves a point against a zone list that is
 * currently `[]`. Until the coordinates are authored, `gps_zone` conditions stay
 * unmet and the UI shows the requirement on the locked choice, which is the same
 * thing the printed card does.
 *
 * To finish it, add entries to `ZONES` (or pass them into `createGeo`) shaped
 * `{ id, name, lat, lon, radius }` in metres.
 */

/** Zone ids the role data refers to. Coordinates are not in the data. */
export const REFERENCED_ZONES = Object.freeze(["pubs", "no_village"]);

/** @type {ReadonlyArray<{id:string,name?:string,lat:number,lon:number,radius:number}>} */
export const ZONES = Object.freeze([]);

export const ZONES_MISSING_NOTE =
  "Souřadnice zón (pubs, no_village) nejsou v datech hry. " +
  "Podmínky na zónu proto zůstávají nesplněné a u volby se zobrazí jako požadavek.";

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

/**
 * Which zones a point is inside. With no zones defined this is always `[]`,
 * which is the honest answer.
 */
export function zonesAt(point, zones = ZONES) {
  if (!point || !Number.isFinite(point.lat) || !Number.isFinite(point.lon)) return [];
  return (zones ?? [])
    .filter((zone) => haversine(point, zone) <= (zone.radius ?? 0))
    .map((zone) => zone.id);
}

/**
 * The `position` object the engine's conditions expect.
 * @returns {{lat:number,lon:number,accuracy:number|null,zones:string[],at:string}|null}
 */
export function positionContext(coords, { zones = ZONES, at = null } = {}) {
  if (!coords || !Number.isFinite(coords.latitude ?? coords.lat)) return null;
  const lat = coords.latitude ?? coords.lat;
  const lon = coords.longitude ?? coords.lon;
  const point = { lat, lon };
  return {
    lat,
    lon,
    accuracy: coords.accuracy ?? null,
    zones: zonesAt(point, zones),
    at: at ?? new Date().toISOString(),
  };
}

/** Human-readable accuracy for the status line: "±12 m". */
export function accuracyLabel(position) {
  if (!position || position.accuracy === null || position.accuracy === undefined) return null;
  return `±${Math.round(position.accuracy)} m`;
}

/**
 * Watch the device position.
 *
 * Nothing in the game needs the position to play, so a refused or unavailable
 * permission is a normal state: `position` stays null and the engine treats
 * zone conditions as unmet.
 */
export function createGeo({ geolocation = globalThis.navigator?.geolocation, zones = ZONES } = {}) {
  let watchId = null;
  let last = null;
  let error = null;
  const listeners = new Set();

  const supported = Boolean(geolocation?.watchPosition);

  function emit() {
    for (const fn of listeners) fn(last, error);
  }

  function start() {
    if (!supported || watchId !== null) return supported;
    watchId = geolocation.watchPosition(
      (pos) => {
        last = positionContext(pos.coords, { zones, at: new Date(pos.timestamp).toISOString() });
        error = null;
        emit();
      },
      (err) => {
        error = err?.message ?? "polohu se nepodařilo zjistit";
        emit();
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 30_000 },
    );
    return true;
  }

  function stop() {
    if (watchId !== null) {
      geolocation.clearWatch?.(watchId);
      watchId = null;
    }
  }

  return {
    supported,
    /** zones known to the engine right now — empty until they are authored */
    zones,
    referencedZones: REFERENCED_ZONES,
    missingNote: ZONES_MISSING_NOTE,
    start,
    stop,
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    get position() {
      return last;
    },
    get error() {
      return error;
    },
    get watching() {
      return watchId !== null;
    },
  };
}
