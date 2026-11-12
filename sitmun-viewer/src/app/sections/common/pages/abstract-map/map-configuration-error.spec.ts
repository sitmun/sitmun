import { mapConfigurationErrorKey } from './map-configuration-error';

describe('map configuration error', () => {
  it('says the person cannot open the map when the profile refuses access', () => {
    expect(mapConfigurationErrorKey(403)).toBe('map.error.access.denied');
  });

  it('keeps the generic configuration error for any other failure', () => {
    expect(mapConfigurationErrorKey(500)).toBe('map.error.config.fetch.failed');
    expect(mapConfigurationErrorKey(undefined)).toBe(
      'map.error.config.fetch.failed'
    );
  });
});
