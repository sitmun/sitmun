export const LOCATION_TIMEOUT_MS = 15_000;
export const RECENT_FIX_MS = 60_000;

export function locationRequestOptions() {
  return {
    enableHighAccuracy: true,
    timeout: LOCATION_TIMEOUT_MS,
    maximumAge: RECENT_FIX_MS,
  };
}

export function locationFromFix(
  fix: { coords?: { longitude?: number; latitude?: number; accuracy?: number } } | null
): { x: number; y: number; accuracy?: number } | null {
  const coords = fix?.coords;
  if (!coords || !Number.isFinite(coords.longitude) || !Number.isFinite(coords.latitude)) {
    return null;
  }
  const position: { x: number; y: number; accuracy?: number } = {
    x: coords.longitude as number,
    y: coords.latitude as number,
  };
  if (Number.isFinite(coords.accuracy)) {
    position.accuracy = Math.round(coords.accuracy as number);
  }
  return position;
}
