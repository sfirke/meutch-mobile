import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type AccessibilityActionEvent,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { MAX_ITEM_PHOTOS, type PhotoDraft } from '../lib/itemPhotos';
import {
  pickFromLibrary,
  takePhoto,
  type PickResult,
} from '../lib/photoPicker';
import {
  moveItem,
  positionForSlot,
  slotForPosition,
  type GridLayout,
} from '../lib/reorder';
import { colors, radii, spacing, typography } from '../theme';
import { Icon } from './Icon';
import { ImagePlaceholder } from './ImagePlaceholder';
import { OptionSheet } from './OptionSheet';

export type PhotoGridProps = {
  photos: PhotoDraft[];
  onChange: (photos: PhotoDraft[]) => void;
  /** Called alongside onChange when an existing (uploaded) photo is removed. */
  onRemoveExisting?: (id: string) => void;
  disabled?: boolean;
  testID?: string;
};

type Source = 'camera' | 'library';
type SheetValue = Source | 'none';

const COLUMNS = 3;
const GAP = spacing[8];
const LONG_PRESS_MS = 250;
// iOS can't present the picker while the sheet's modal is still dismissing.
const PICKER_DELAY_MS = Platform.OS === 'ios' ? 350 : 0;

const SOURCE_OPTIONS: { value: SheetValue; label: string }[] = [
  { value: 'camera', label: 'Take photo' },
  { value: 'library', label: 'Choose from library' },
];

let draftCounter = 0;

function newDraftKey(): string {
  draftCounter += 1;
  return `new-${Date.now()}-${draftCounter}`;
}

function draftKey(photo: PhotoDraft): string {
  return photo.kind === 'existing' ? `existing-${photo.id}` : photo.key;
}

function draftUri(photo: PhotoDraft): string | null {
  return photo.kind === 'existing' ? photo.url : photo.uri;
}

/** Editable photo grid for the item form: add, remove, and reorder. */
export function PhotoGrid({
  photos,
  onChange,
  onRemoveExisting,
  disabled = false,
  testID = 'photo-grid',
}: PhotoGridProps) {
  const [width, setWidth] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState<Source | null>(null);

  // Picking is async; append to the latest photos, not the ones at tap time.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const cellSize =
    width > 0 ? Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS) : 0;
  const layout: GridLayout = {
    columns: COLUMNS,
    cellWidth: cellSize,
    cellHeight: cellSize,
    gap: GAP,
  };
  const cellStyle = cellSize > 0 ? { width: cellSize, height: cellSize } : null;
  const total = photos.length;
  const canAdd = total < MAX_ITEM_PHOTOS;

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length || from === to) return;
    onChange(moveItem(photos, from, to));
  };

  const remove = (index: number) => {
    const photo = photos[index];
    onChange(photos.filter((_, i) => i !== index));
    if (photo.kind === 'existing') onRemoveExisting?.(photo.id);
  };

  const pick = async (source: Source) => {
    setDenied(null);
    setBusy(true);
    try {
      const remaining = MAX_ITEM_PHOTOS - photosRef.current.length;
      const result: PickResult =
        source === 'camera'
          ? await takePhoto()
          : await pickFromLibrary(remaining);

      if (result.kind === 'denied') {
        setDenied(result.source);
      } else if (result.kind === 'picked') {
        const added: PhotoDraft[] = result.photos.map((photo) => ({
          kind: 'new',
          key: newDraftKey(),
          uri: photo.uri,
        }));
        onChange([...photosRef.current, ...added].slice(0, MAX_ITEM_PHOTOS));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSelectSource = (value: SheetValue) => {
    if (value === 'none') return;
    setTimeout(() => {
      void pick(value);
    }, PICKER_DELAY_MS);
  };

  return (
    <View style={styles.root} testID={testID}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={styles.grid}
      >
        {photos.map((photo, index) => (
          <PhotoCell
            cellStyle={cellStyle}
            count={total}
            disabled={disabled}
            index={index}
            key={draftKey(photo)}
            layout={layout}
            onMove={move}
            onRemove={remove}
            uri={draftUri(photo)}
          />
        ))}

        {canAdd ? (
          <Pressable
            accessibilityLabel="Add photo"
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || busy, busy }}
            disabled={disabled || busy}
            onPress={() => setSheetVisible(true)}
            style={[
              styles.cell,
              styles.addTile,
              cellStyle,
              (disabled || busy) && styles.dimmed,
            ]}
            testID="photo-add"
          >
            {busy ? (
              <ActivityIndicator
                color={colors.primaryDark}
                testID="photo-busy"
              />
            ) : (
              <Icon color={colors.primaryDark} name="plus" size={22} />
            )}
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.count} testID="photo-count">
        {total} of {MAX_ITEM_PHOTOS} photos
      </Text>

      {denied ? (
        <View style={styles.denied} testID="photo-permission-denied">
          <Text style={styles.deniedText}>
            {denied === 'camera'
              ? 'Meutch needs camera access to take photos.'
              : 'Meutch needs photo library access to add photos.'}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void Linking.openSettings();
            }}
            testID="photo-open-settings"
          >
            <Text style={styles.settingsLink}>Open settings</Text>
          </Pressable>
        </View>
      ) : null}

      <OptionSheet<SheetValue>
        onClose={() => setSheetVisible(false)}
        onSelect={handleSelectSource}
        options={SOURCE_OPTIONS}
        title="Add photo"
        value="none"
        visible={sheetVisible}
      />
    </View>
  );
}

type PhotoCellProps = {
  uri: string | null;
  index: number;
  count: number;
  layout: GridLayout;
  cellStyle: { width: number; height: number } | null;
  disabled: boolean;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
};

function PhotoCell({
  uri,
  index,
  count,
  layout,
  cellStyle,
  disabled,
  onMove,
  onRemove,
}: PhotoCellProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lift = useSharedValue(0);
  const target = useSharedValue(index);

  const pan = Gesture.Pan()
    .enabled(!disabled && count > 1 && layout.cellWidth > 0)
    .activateAfterLongPress(LONG_PRESS_MS)
    .onStart(() => {
      target.value = index;
      lift.value = withTiming(1, { duration: 120 });
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      const origin = positionForSlot(layout, index);
      target.value = slotForPosition(
        layout,
        origin.x + event.translationX + layout.cellWidth / 2,
        origin.y + event.translationY + layout.cellHeight / 2,
        count,
      );
    })
    .onEnd(() => {
      if (target.value !== index) scheduleOnRN(onMove, index, target.value);
    })
    .onFinalize(() => {
      translateX.value = 0;
      translateY.value = 0;
      lift.value = withTiming(0, { duration: 120 });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    elevation: lift.value > 0 ? 6 : 0,
    opacity: 1 - lift.value * 0.1,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: 1 + lift.value * 0.06 },
    ],
    zIndex: lift.value > 0 ? 10 : 0,
  }));

  const handleAction = (event: AccessibilityActionEvent) => {
    if (disabled) return;
    if (event.nativeEvent.actionName === 'moveEarlier')
      onMove(index, index - 1);
    if (event.nativeEvent.actionName === 'moveLater') onMove(index, index + 1);
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cell, cellStyle, animatedStyle]}>
        <View
          accessibilityActions={[
            { name: 'moveEarlier', label: 'Move earlier' },
            { name: 'moveLater', label: 'Move later' },
          ]}
          accessibilityLabel={`Photo ${index + 1} of ${count}`}
          accessibilityRole="image"
          accessible
          onAccessibilityAction={handleAction}
          style={styles.thumb}
          testID={`photo-${index}`}
        >
          {uri ? (
            <Image
              contentFit="cover"
              source={{ uri }}
              style={StyleSheet.absoluteFill}
              transition={150}
            />
          ) : (
            <ImagePlaceholder testID={`photo-${index}-placeholder`} />
          )}
          {index === 0 ? (
            <View style={styles.cover}>
              <Text style={styles.coverText}>Cover</Text>
            </View>
          ) : null}
        </View>
        <Pressable
          accessibilityLabel={`Remove photo ${index + 1}`}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
          disabled={disabled}
          hitSlop={6}
          onPress={() => onRemove(index)}
          style={[styles.remove, disabled && styles.dimmed]}
          testID={`photo-remove-${index}`}
        >
          <Icon color={colors.onPrimaryText} name="clear" size={12} />
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing[8],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  cell: {
    aspectRatio: 1,
    borderRadius: radii.sm,
    width: '31%',
  },
  thumb: {
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    flex: 1,
    overflow: 'hidden',
  },
  cover: {
    backgroundColor: colors.primaryDark,
    borderRadius: radii.sm,
    bottom: spacing[4],
    left: spacing[4],
    paddingHorizontal: spacing[8],
    paddingVertical: 2,
    position: 'absolute',
  },
  coverText: {
    color: colors.onPrimaryText,
    fontSize: 12,
    fontWeight: '700',
  },
  remove: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing[4],
    top: spacing[4],
    width: 24,
  },
  addTile: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.5,
  },
  count: {
    color: colors.secondary,
    ...typography.meta,
  },
  denied: {
    backgroundColor: colors.errorSurface,
    borderRadius: radii.sm,
    gap: spacing[4],
    padding: spacing[12],
  },
  deniedText: {
    color: colors.errorText,
    ...typography.meta,
  },
  settingsLink: {
    ...typography.meta,
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
