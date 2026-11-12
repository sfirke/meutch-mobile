import { Redirect, Stack } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { AvatarsSection } from '../../src/dev/gallery/AvatarsSection';
import { ButtonsSection } from '../../src/dev/gallery/ButtonsSection';
import { FormsSection } from '../../src/dev/gallery/FormsSection';
import { OverlaysSection } from '../../src/dev/gallery/OverlaysSection';
import { SurfacesSection } from '../../src/dev/gallery/SurfacesSection';
import { TagsSection } from '../../src/dev/gallery/TagsSection';
import { colors, spacing } from '../../src/theme';

// Every UI primitive in every state. Development builds only.
export default function ComponentGallery() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Components' }} />
      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.screen}
        testID="component-gallery"
      >
        <ButtonsSection />
        <SurfacesSection />
        <TagsSection />
        <AvatarsSection />
        <FormsSection />
        <OverlaysSection />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing[16], gap: spacing[24] },
});
