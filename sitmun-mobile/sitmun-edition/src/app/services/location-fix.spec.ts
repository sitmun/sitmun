import { LOCATION_TIMEOUT_MS, RECENT_FIX_MS, locationFromFix, locationRequestOptions } from './location-fix';

describe('location fix', () => {
  it('reuses a recent fix and stops waiting after 15 seconds', () => {
    expect(locationRequestOptions()).toEqual({
      enableHighAccuracy: true,
      timeout: LOCATION_TIMEOUT_MS,
      maximumAge: RECENT_FIX_MS,
    });
    expect(LOCATION_TIMEOUT_MS).toBe(15_000);
    expect(RECENT_FIX_MS).toBe(60_000);
  });

  it('keeps longitude, latitude, and rounded accuracy', () => {
    expect(
      locationFromFix({ coords: { longitude: 2.5, latitude: 41.5, accuracy: 12.4 } })
    ).toEqual({ x: 2.5, y: 41.5, accuracy: 12 });
  });

  it('returns nothing when the fix has no coordinates', () => {
    expect(locationFromFix(null)).toBeNull();
    expect(locationFromFix({ coords: {} })).toBeNull();
  });
});
