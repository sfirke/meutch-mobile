import { StyleSheet, Text, View } from 'react-native';

import { Card } from '../../components/ui/Card';
import { Lifted, type LiftedOffset } from '../../components/ui/Lifted';
import { PaperStrip } from '../../components/ui/PaperStrip';
import { PinkedEdge } from '../../components/ui/PinkedEdge';
import { PressableCard } from '../../components/ui/PressableCard';
import { Stitch } from '../../components/ui/Stitch';
import {
  colors,
  offsets,
  outline,
  radii,
  spacing,
  typography,
} from '../../theme';
import { GalleryExample, GallerySection } from './GallerySection';

const liftedOffsets = Object.keys(offsets) as LiftedOffset[];

function CardText({ title, body }: { title: string; body: string }) {
  return (
    <>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </>
  );
}

export function SurfacesSection() {
  return (
    <GallerySection title="Surfaces">
      <GalleryExample label="Card">
        <Card testID="gallery-card">
          <CardText body="A plain content card." title="Cordless drill" />
        </Card>
      </GalleryExample>

      <GalleryExample label="Card, padding 0, full-bleed photo">
        <Card padding={0}>
          <View style={styles.photo} />
          <View style={styles.photoBody}>
            <CardText body="The block stands in for a photo." title="Tent" />
          </View>
        </Card>
      </GalleryExample>

      <GalleryExample label="Card variant callout">
        <Card variant="callout">
          <CardText body="Set apart, with a 4px offset." title="Callout" />
        </Card>
      </GalleryExample>

      <GalleryExample label="Card variant attention">
        <Card variant="attention">
          <CardText body="Something needs your answer." title="Attention" />
        </Card>
      </GalleryExample>

      <GalleryExample label="PressableCard at rest (press it)">
        <PressableCard accessibilityLabel="Ladder" onPress={() => {}}>
          <CardText body="Press to see the offset." title="Ladder" />
        </PressableCard>
      </GalleryExample>

      <GalleryExample label="PressableCard pressed look (previewPressed)">
        <PressableCard
          accessibilityLabel="Ladder"
          onPress={() => {}}
          previewPressed
          testID="gallery-pressable-pressed"
        >
          <CardText body="Ink border and a 4px offset." title="Ladder" />
        </PressableCard>
      </GalleryExample>

      <GalleryExample label="PressableCard disabled">
        <PressableCard accessibilityLabel="Ladder" disabled onPress={() => {}}>
          <CardText body="No press feedback." title="Ladder" />
        </PressableCard>
      </GalleryExample>

      <GalleryExample label="Lifted at each offset (sm 2, md 3, lg 4, dialog 5, xl 6)">
        <View style={styles.liftedRow}>
          {liftedOffsets.map((offset) => (
            <Lifted key={offset} offset={offset} radius={radii.control}>
              <View style={styles.liftedBox}>
                <Text style={styles.meta}>{offset}</Text>
              </View>
            </Lifted>
          ))}
        </View>
      </GalleryExample>

      <GalleryExample label="Lifted xl with reserveSpace, full width">
        <Lifted offset="xl" reserveSpace>
          <View style={styles.liftedWide} testID="gallery-lifted-reserved">
            <Text style={styles.meta}>The offset stays inside the box</Text>
          </View>
        </Lifted>
      </GalleryExample>

      <GalleryExample label="Stitch, full container width">
        <Stitch />
      </GalleryExample>

      <GalleryExample label="Stitch, in a 100 wide box">
        <View style={styles.narrow}>
          <Stitch />
        </View>
      </GalleryExample>

      <GalleryExample label="PinkedEdge down, under a tangerine band">
        <View>
          <View style={styles.band} />
          <PinkedEdge color={colors.tangerine} direction="down" />
        </View>
      </GalleryExample>

      <GalleryExample label="PinkedEdge up, over a tangerine band">
        <View>
          <PinkedEdge color={colors.tangerine} direction="up" />
          <View style={styles.band} />
        </View>
      </GalleryExample>

      <GalleryExample label="PaperStrip inside an h1">
        <Text accessibilityRole="header" style={styles.h1}>
          What if <PaperStrip>borrowing</PaperStrip> from a neighbor was easy?
        </Text>
      </GalleryExample>

      <GalleryExample label="PaperStrip block, beside an h1">
        <View style={styles.baselineRow}>
          <Text style={styles.h1}>Lend your </Text>
          <PaperStrip block textStyle={styles.h1}>
            tools
          </PaperStrip>
        </View>
      </GalleryExample>
    </GallerySection>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.cardTitle, color: colors.ink },
  body: { ...typography.body, color: colors.muted },
  meta: { ...typography.meta, color: colors.ink },
  h1: { ...typography.h1, color: colors.ink },
  photo: { height: 120, backgroundColor: colors.tangerineWash },
  photoBody: { padding: spacing[16] },
  liftedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[16] },
  liftedBox: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardPaper,
    borderColor: colors.ink,
    borderWidth: outline,
    borderRadius: radii.control,
  },
  liftedWide: {
    padding: spacing[16],
    backgroundColor: colors.cardPaper,
    borderColor: colors.ink,
    borderWidth: outline,
    borderRadius: radii.card,
  },
  narrow: { width: 100 },
  band: { height: 48, backgroundColor: colors.tangerine },
  baselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
});
