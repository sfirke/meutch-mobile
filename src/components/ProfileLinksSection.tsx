import { StyleSheet, Text } from 'react-native';

import { WebLinkRow } from './WebLinkRow';
import { openExternalUrl } from '../lib/openExternalUrl';
import type { WebLink } from '../lib/profile';
import { colors, typography } from '../theme';

export type ProfileLinksSectionProps = {
  links: WebLink[];
};

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
        <WebLinkRow key={link.id} link={link} onPress={openExternalUrl} />
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
