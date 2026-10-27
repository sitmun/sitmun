import { AndroidSettings, IOSSettings } from 'capacitor-native-settings';

export type LocationPermission = string;

export interface DeviceCoordinates {
  longitude: number;
  latitude: number;
}

export interface DeviceLocation {
  x: number;
  y: number;
  permission: boolean;
}

export function nativeLocationSettings() {
  return {
    optionAndroid: AndroidSettings.Location,
    optionIOS: IOSSettings.App
  };
}

export async function readDeviceLocation(
  geolocation: {
    requestPermissions: () => Promise<{ location: LocationPermission }>;
    getCurrentPosition: () => Promise<{ coords: DeviceCoordinates }>;
  }
): Promise<DeviceLocation> {
  const permission = await geolocation.requestPermissions();
  if (permission.location !== 'granted') {
    return { x: 0, y: 0, permission: false };
  }
  const current = await geolocation.getCurrentPosition();
  return {
    x: current.coords.longitude,
    y: current.coords.latitude,
    permission: true
  };
}
