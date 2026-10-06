import { Linking } from 'react-native';

export function openExternalUrl(url: string): void {
  // Nothing to tell the member if the OS declines the url, so the rejection
  // is swallowed rather than surfaced.
  void Linking.openURL(url).catch(() => undefined);
}
