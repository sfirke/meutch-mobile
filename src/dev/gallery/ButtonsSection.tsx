import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  PressedButtonPreview,
  type ButtonVariant,
} from '../../components/ui/Button';
import {
  IconButton,
  PressedIconButtonPreview,
} from '../../components/ui/IconButton';
import { colors, radii, spacing } from '../../theme';
import { GalleryExample, GallerySection } from './GallerySection';

const VARIANTS: ButtonVariant[] = [
  'primary',
  'outline',
  'danger',
  'outlineDanger',
  'link',
];

const noop = () => {};

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

export function ButtonsSection() {
  return (
    <GallerySection title="Buttons">
      {VARIANTS.map((variant) => (
        <GalleryExample key={variant} label={`${variant}: sm, md, lg`}>
          <Row>
            <Button label="Small" onPress={noop} size="sm" variant={variant} />
            <Button label="Medium" onPress={noop} variant={variant} />
            <Button label="Large" onPress={noop} size="lg" variant={variant} />
          </Row>
        </GalleryExample>
      ))}

      <GalleryExample label="light: sm, md, lg on a tangerine band">
        <View style={styles.band}>
          <Row>
            <Button label="Small" onPress={noop} size="sm" variant="light" />
            <Button label="Medium" onPress={noop} variant="light" />
            <Button label="Large" onPress={noop} size="lg" variant="light" />
          </Row>
        </View>
      </GalleryExample>

      <GalleryExample label="Pressed (drawn statically)">
        <Row>
          <PressedButtonPreview label="Primary" variant="primary" />
          <PressedButtonPreview label="Outline" variant="outline" />
          <PressedButtonPreview label="Danger" variant="danger" />
        </Row>
        <Row>
          <PressedButtonPreview
            label="Outline danger"
            variant="outlineDanger"
          />
          <PressedButtonPreview label="Link" variant="link" />
        </Row>
        <View style={styles.band}>
          <Row>
            <PressedButtonPreview label="Light" variant="light" />
          </Row>
        </View>
      </GalleryExample>

      <GalleryExample label="Resting next to pressed">
        <Row>
          <Button label="Save" onPress={noop} variant="primary" />
          <PressedButtonPreview label="Save" variant="primary" />
        </Row>
      </GalleryExample>

      <GalleryExample label="Disabled">
        <Row>
          <Button disabled label="Primary" variant="primary" />
          <Button disabled label="Outline" variant="outline" />
          <Button disabled label="Danger" variant="danger" />
        </Row>
        <Row>
          <Button disabled label="Outline danger" variant="outlineDanger" />
          <Button disabled label="Link" variant="link" />
        </Row>
      </GalleryExample>

      <GalleryExample label="Loading">
        <Row>
          <Button label="Save" loading variant="primary" />
          <Button label="Send" loading variant="outline" />
          <Button label="Delete" loading variant="danger" />
        </Row>
      </GalleryExample>

      <GalleryExample label="With a leading icon">
        <Row>
          <Button
            icon="plus"
            label="List an item"
            onPress={noop}
            variant="primary"
          />
          <Button
            icon="pen"
            label="Edit"
            onPress={noop}
            size="sm"
            variant="outline"
          />
        </Row>
        <Row>
          <Button
            icon="trash"
            label="Delete item"
            onPress={noop}
            variant="danger"
          />
          <Button
            icon="send"
            label="Send"
            onPress={noop}
            size="lg"
            variant="outline"
          />
        </Row>
      </GalleryExample>

      <GalleryExample label="A dialog's actions: cancel, then confirm">
        <Row>
          <Button label="Cancel" onPress={noop} variant="outline" />
          <Button label="Mark as rehomed" onPress={noop} variant="primary" />
        </Row>
      </GalleryExample>

      <GalleryExample label="fullWidth">
        <View style={styles.startAligned}>
          <Button
            fullWidth
            label="Ask to borrow this"
            onPress={noop}
            size="lg"
            variant="primary"
          />
          <Button
            fullWidth
            label="Message the owner"
            onPress={noop}
            variant="outline"
          />
        </View>
      </GalleryExample>

      <GalleryExample label="A long label wraps">
        <Row>
          <Button
            label="Ask the owner whether you can borrow this for the whole weekend"
            onPress={noop}
            variant="primary"
          />
        </Row>
      </GalleryExample>

      <GalleryExample label="IconButton: primary, outline, ghost">
        <Row>
          <IconButton
            accessibilityLabel="Create"
            icon="plus"
            onPress={noop}
            variant="primary"
          />
          <IconButton
            accessibilityLabel="Edit"
            icon="pen"
            onPress={noop}
            variant="outline"
          />
          <IconButton accessibilityLabel="Send" icon="send" onPress={noop} />
        </Row>
      </GalleryExample>

      <GalleryExample label="IconButton: pressed, disabled, loading">
        <Row>
          <PressedIconButtonPreview icon="plus" variant="primary" />
          <PressedIconButtonPreview icon="pen" variant="outline" />
          <PressedIconButtonPreview icon="send" />
        </Row>
        <Row>
          <IconButton
            accessibilityLabel="Create"
            disabled
            icon="plus"
            variant="primary"
          />
          <IconButton accessibilityLabel="Send" disabled icon="send" />
          <IconButton
            accessibilityLabel="Sending"
            icon="send"
            loading
            variant="primary"
          />
          <IconButton accessibilityLabel="Sending" icon="send" loading />
        </Row>
      </GalleryExample>
    </GallerySection>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[8],
  },
  band: {
    backgroundColor: colors.tangerine,
    borderRadius: radii.card,
    padding: spacing[16],
  },
  startAligned: { alignItems: 'flex-start', gap: spacing[8] },
});
