import { AndroidSettings, IOSSettings } from 'capacitor-native-settings';
import { nativeLocationSettings, readDeviceLocation } from './location-permission.util';

describe('location-permission.util', () => {
  it('requests permission and returns coords when granted', async () => {
    const geolocation = {
      requestPermissions: jasmine.createSpy('requestPermissions').and.resolveTo({ location: 'granted' }),
      getCurrentPosition: jasmine.createSpy('getCurrentPosition').and.resolveTo({
        coords: { longitude: 2.1, latitude: 41.4 }
      })
    };
    await expectAsync(readDeviceLocation(geolocation)).toBeResolvedTo({
      x: 2.1,
      y: 41.4,
      permission: true
    });
    expect(geolocation.requestPermissions).toHaveBeenCalled();
    expect(geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('does not read coords when permission is denied', async () => {
    const geolocation = {
      requestPermissions: jasmine.createSpy('requestPermissions').and.resolveTo({ location: 'denied' }),
      getCurrentPosition: jasmine.createSpy('getCurrentPosition')
    };
    await expectAsync(readDeviceLocation(geolocation)).toBeResolvedTo({
      x: 0,
      y: 0,
      permission: false
    });
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('opens Android Location settings so GPS can be enabled', () => {
    expect(nativeLocationSettings()).toEqual({
      optionAndroid: AndroidSettings.Location,
      optionIOS: IOSSettings.App
    });
  });
});
