import { Linking, StyleSheet, Text } from 'react-native';

import { WebLinkRow } from './WebLinkRow';
import type { WebLink } from '../lib/profile';
import { colors, typography } from '../theme';

export type ProfileLinksSectionProps = {
  links: WebLink[];
};

function openLink(url: string) {
  // Nothing to tell the member if the OS declines the url, so the rejection
  // is swallowed rather than surfaced.
  void Linking.openURL(url).catch(() => undefined);
}

// Read-only list of a member's web links. Renders nothing when there are
// none, leaving any surrounding empty-state copy to the caller.
export function ProfileLinksSection({ links }: ProfileLinksSectionProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <>
      <Text style={styles.sectionLabel}>Links</Text>
      {links.map((link) => (
        <WebLinkRow key={link.id} link={link} onPress={openLink} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.secondary,
    ...typography.label,
  },
});
