import { AndroidSettings, IOSSettings } from 'capacitor-native-settings';

import { nativeLocationSettings, readDeviceLocation } from './location-permission.util';

describe('location-permission.util', () => {
  it('requests permission and returns coords when granted', async () => {
    const geolocation = {
      requestPermissions: jest.fn().mockResolvedValue({ location: 'granted' }),
      getCurrentPosition: jest.fn().mockResolvedValue({
        coords: { longitude: 2.1, latitude: 41.4 }
      })
    };
    await expect(readDeviceLocation(geolocation)).resolves.toEqual({
      x: 2.1,
      y: 41.4,
      permission: true
    });
    expect(geolocation.requestPermissions).toHaveBeenCalled();
    expect(geolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('does not read coords when permission is denied', async () => {
    const geolocation = {
      requestPermissions: jest.fn().mockResolvedValue({ location: 'denied' }),
      getCurrentPosition: jest.fn()
    };
    await expect(readDeviceLocation(geolocation)).resolves.toEqual({
      x: 0,
      y: 0,
      permission: false
    });
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('returns Android Location and iOS App settings options', () => {
    expect(nativeLocationSettings()).toEqual({
      optionAndroid: AndroidSettings.Location,
      optionIOS: IOSSettings.App
    });
  });
});
