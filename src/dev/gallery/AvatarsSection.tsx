import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Avatar, type AvatarUser } from '../../components/Avatar';
import { ImagePlaceholder } from '../../components/ImagePlaceholder';
import { PhotoFrame } from '../../components/ui/PhotoFrame';
import { colors, spacing, tilt } from '../../theme';
import { GalleryExample, GallerySection } from './GallerySection';

const SIZES = [28, 34, 40, 120] as const;
const PHOTO_URL = 'https://avatars.example.test/ada.png';

function person(fullName: string, photo: string | null = null): AvatarUser {
  const [first = '', ...rest] = fullName.split(' ');

  return {
    first_name: first,
    last_name: rest.join(' '),
    full_name: fullName,
    profile_image_url: photo,
  };
}

const TONES = [
  { label: 'Tone 0: teal (name length 9)', name: 'Ada Marsh' },
  { label: 'Tone 1: tangerine (name length 10)', name: 'Sam Firkes' },
  { label: 'Tone 2: purple, white text (name length 11)', name: 'Grace Hoppe' },
];

function Row({ user }: { user: AvatarUser | null }) {
  return (
    <View style={styles.row}>
      {SIZES.map((size) => (
        <Avatar key={size} size={size} testID={`gallery-${size}`} user={user} />
      ))}
    </View>
  );
}

export function AvatarsSection() {
  return (
    <GallerySection title="Avatars">
      {TONES.map((tone) => (
        <GalleryExample key={tone.name} label={`${tone.label}, 28/34/40/120`}>
          <Row user={person(tone.name)} />
        </GalleryExample>
      ))}
      <GalleryExample label="One word">
        <Row user={person('Ada')} />
      </GalleryExample>
      <GalleryExample label="Three words (first and last letter)">
        <Row user={person('Ada Byron King')} />
      </GalleryExample>
      <GalleryExample label="Empty name">
        <Row user={person('')} />
      </GalleryExample>
      <GalleryExample label="Deleted user (null)">
        <Row user={null} />
      </GalleryExample>
      <GalleryExample label="Photo">
        <Row user={person('Ada Marsh', PHOTO_URL)} />
      </GalleryExample>

      <GalleryExample label="ImagePlaceholder 32">
        <View style={styles.sized32}>
          <ImagePlaceholder testID="gallery-ph-32" />
        </View>
      </GalleryExample>
      <GalleryExample label="ImagePlaceholder 68">
        <View style={styles.sized68}>
          <ImagePlaceholder testID="gallery-ph-68" />
        </View>
      </GalleryExample>
      <GalleryExample label="ImagePlaceholder card photo (full width, 210 tall)">
        <View style={styles.card}>
          <ImagePlaceholder testID="gallery-ph-card" />
        </View>
      </GalleryExample>
      <GalleryExample label="ImagePlaceholder carousel (wide, 260 tall)">
        <View style={styles.carousel}>
          <ImagePlaceholder testID="gallery-ph-carousel" />
        </View>
      </GalleryExample>

      <GalleryExample label="PhotoFrame plain">
        <PhotoFrame style={styles.frame}>
          <Image source={{ uri: PHOTO_URL }} style={styles.fill} />
        </PhotoFrame>
      </GalleryExample>
      <GalleryExample label="PhotoFrame tilted, thumb +2 deg">
        <View style={styles.room}>
          <PhotoFrame style={styles.frame} tilt={tilt.thumb}>
            <Image source={{ uri: PHOTO_URL }} style={styles.fill} />
          </PhotoFrame>
        </View>
      </GalleryExample>
      <GalleryExample label="PhotoFrame tilted, photo -1.5 deg">
        <View style={styles.room}>
          <PhotoFrame style={styles.frame} tilt={tilt.photo}>
            <Image source={{ uri: PHOTO_URL }} style={styles.fill} />
          </PhotoFrame>
        </View>
      </GalleryExample>
      <GalleryExample label="PhotoFrame lifted (lg), radius 14">
        <View style={styles.room}>
          <PhotoFrame lifted="lg" radius={14} style={styles.frame}>
            <Image source={{ uri: PHOTO_URL }} style={styles.fill} />
          </PhotoFrame>
        </View>
      </GalleryExample>
      <GalleryExample label="PhotoFrame lifted and tilted, around a placeholder">
        <View style={styles.room}>
          <PhotoFrame lifted="md" style={styles.frame} tilt={tilt.photo}>
            <ImagePlaceholder testID="gallery-frame-ph" />
          </PhotoFrame>
        </View>
      </GalleryExample>
    </GallerySection>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing[12] },
  sized32: { height: 32, width: 32 },
  sized68: { height: 68, width: 68 },
  card: { height: 210, width: '100%' },
  carousel: { height: 260, width: '100%' },
  room: { padding: spacing[12], paddingRight: spacing[16] },
  frame: { height: 120, width: 160 },
  fill: { backgroundColor: colors.tealWash, height: '100%', width: '100%' },
});
