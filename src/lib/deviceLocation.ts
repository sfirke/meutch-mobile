import * as Location from 'expo-location';

import { type Coordinates } from './location';

export type DeviceLocationResult =
  | { kind: 'located'; coordinates: Coordinates }
  | { kind: 'denied' }
  | { kind: 'unavailable' };

export async function readDeviceCoordinates(): Promise<DeviceLocationResult> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { kind: 'denied' };

    // Distances are approximate, so a quick network-level fix is enough.
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    return {
      kind: 'located',
      coordinates: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
    };
  } catch {
    return { kind: 'unavailable' };
  }
}
