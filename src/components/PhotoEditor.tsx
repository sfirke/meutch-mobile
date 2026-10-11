import { Image } from 'expo-image';
import {
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import {
  clampView,
  cropFraction,
  fitRect,
  imageRect,
  INITIAL_VIEW,
  insetRect,
  intersectRect,
  isFullFrame,
  normalizeTurns,
  resizeCrop,
  rotatedSize,
  zoomView,
  type Corner,
  type CropView,
  type Rect,
  type Size,
} from '../lib/cropMath';
import { applyPhotoEdit, type PickedPhoto } from '../lib/photoPicker';
import { colors, spacing, typography } from '../theme';
import { Icon, type IconName } from './Icon';

export type PhotoEditorProps = {
  /** The photo to edit, local or remote; `null` hides the editor. */
  uri: string | null;
  onCancel: () => void;
  /** Called with the edited copy. An untouched photo calls `onCancel`. */
  onDone: (photo: PickedPhoto) => void;
};

type Side = 'top' | 'bottom' | 'left' | 'right';

const BACKDROP = '#000000';
const SHADE = 'rgba(0, 0, 0, 0.6)';
const GUIDE = 'rgba(255, 255, 255, 0.4)';
// Room around the photo so the corner handles stay inside the stage.
const FRAME_INSET = spacing[24];
const HANDLE_SIZE = 44;
const MARK_SIZE = 20;
const MARK_WIDTH = 3;
const ZOOM_STEP = 1.25;
const EMPTY_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };
const CORNERS: Corner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
const SIDES: Side[] = ['top', 'bottom', 'left', 'right'];

/** Full-screen crop, rotate, and zoom for one photo. */
export function PhotoEditor({ uri, onCancel, onDone }: PhotoEditorProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      visible={uri !== null}
    >
      {uri !== null ? (
        <Editor key={uri} onCancel={onCancel} onDone={onDone} uri={uri} />
      ) : null}
    </Modal>
  );
}

type EditorProps = {
  uri: string;
  onCancel: () => void;
  onDone: (photo: PickedPhoto) => void;
};

function Editor({ uri, onCancel, onDone }: EditorProps) {
  const insets = useContext(SafeAreaInsetsContext);
  const [stage, setStage] = useState<Size | null>(null);
  const [imageSize, setImageSize] = useState<Size | null>(null);
  const [turns, setTurns] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const crop = useSharedValue<Rect>(EMPTY_RECT);
  const view = useSharedValue<CropView>(INITIAL_VIEW);

  // Closing the editor mid-save drops the result.
  const open = useRef(true);
  useEffect(() => {
    open.current = true;
    return () => {
      open.current = false;
    };
  }, []);

  const frame = useMemo(
    () =>
      stage ? insetRect({ x: 0, y: 0, ...stage }, FRAME_INSET) : EMPTY_RECT,
    [stage],
  );
  const base = useMemo(
    () =>
      stage && imageSize ? fitRect(rotatedSize(imageSize, turns), frame) : null,
    [stage, imageSize, turns, frame],
  );
  const ready = base !== null && !saving;

  // Starts over with the whole photo selected whenever its fitted rect
  // changes (first layout, rotation) or Reset is pressed.
  const [resets, setResets] = useState(0);
  useLayoutEffect(() => {
    if (base) {
      crop.set(base);
      view.set(INITIAL_VIEW);
    }
  }, [base, resets, crop, view]);

  const rotate = (delta: number) => setTurns(normalizeTurns(turns + delta));

  const zoom = (factor: number) => {
    if (!base) return;
    view.set(zoomView(base, view.value, crop.value, view.value.scale * factor));
  };

  const save = async () => {
    if (!base) return;

    const fraction = cropFraction(crop.value, imageRect(base, view.value));

    if (turns === 0 && isFullFrame(fraction)) {
      onCancel();
      return;
    }

    setFailed(false);
    setSaving(true);
    try {
      const photo = await applyPhotoEdit(uri, {
        quarterTurns: turns,
        crop: fraction,
      });

      if (open.current) onDone(photo);
    } catch {
      if (open.current) {
        setFailed(true);
        setSaving(false);
      }
    }
  };

  const pan = Gesture.Pan()
    .enabled(ready)
    .onChange((event) => {
      if (!base) return;
      view.set(
        clampView(
          base,
          {
            scale: view.value.scale,
            translateX: view.value.translateX + event.changeX,
            translateY: view.value.translateY + event.changeY,
          },
          crop.value,
        ),
      );
    });
  const pinch = Gesture.Pinch()
    .enabled(ready)
    .onChange((event) => {
      if (!base) return;
      view.set(
        zoomView(
          base,
          view.value,
          crop.value,
          view.value.scale * event.scaleChange,
        ),
      );
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: view.value.translateX },
      { translateY: view.value.translateY },
      { scale: view.value.scale },
    ],
  }));
  const outlineStyle = useAnimatedStyle(() => ({
    height: crop.value.height,
    left: crop.value.x,
    top: crop.value.y,
    width: crop.value.width,
  }));

  // Before the photo's size is known it simply fills the frame.
  const placed = base ?? frame;
  const sideways = turns % 2 === 1;
  const unrotated = sideways
    ? { width: placed.height, height: placed.width }
    : { width: placed.width, height: placed.height };

  return (
    <GestureHandlerRootView
      style={[
        styles.root,
        { paddingBottom: insets?.bottom ?? 0, paddingTop: insets?.top ?? 0 },
      ]}
      testID="photo-editor"
    >
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          hitSlop={8}
          onPress={onCancel}
          testID="photo-editor-cancel"
        >
          <Text style={[styles.headerAction, saving && styles.dimmed]}>
            Cancel
          </Text>
        </Pressable>
        <Text accessibilityRole="header" style={styles.title}>
          Edit photo
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready, busy: saving }}
          disabled={!ready}
          hitSlop={8}
          onPress={() => {
            void save();
          }}
          testID="photo-editor-done"
        >
          {saving ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text
              style={[
                styles.headerAction,
                styles.done,
                !ready && styles.dimmed,
              ]}
            >
              Done
            </Text>
          )}
        </Pressable>
      </View>

      <View
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;

          setStage({ width, height });
        }}
        style={styles.stage}
        testID="photo-editor-stage"
      >
        <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
          <View collapsable={false} style={StyleSheet.absoluteFill}>
            <Animated.View
              style={[
                styles.absolute,
                {
                  height: placed.height,
                  left: placed.x,
                  top: placed.y,
                  width: placed.width,
                },
                imageStyle,
              ]}
            >
              <Image
                accessibilityLabel="Photo being edited"
                contentFit="contain"
                onLoad={(event) => {
                  setImageSize({
                    width: event.source.width,
                    height: event.source.height,
                  });
                }}
                source={{ uri }}
                style={[
                  styles.absolute,
                  {
                    height: unrotated.height,
                    left: (placed.width - unrotated.width) / 2,
                    top: (placed.height - unrotated.height) / 2,
                    transform: [{ rotate: `${turns * 90}deg` }],
                    width: unrotated.width,
                  },
                ]}
                testID="photo-editor-image"
              />
            </Animated.View>
          </View>
        </GestureDetector>

        {base ? (
          <>
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {SIDES.map((side) => (
                <Shade crop={crop} key={side} side={side} />
              ))}
              <Animated.View style={[styles.outline, outlineStyle]}>
                <View
                  style={[styles.guide, styles.guideVertical, styles.first]}
                />
                <View
                  style={[styles.guide, styles.guideVertical, styles.second]}
                />
                <View
                  style={[
                    styles.guide,
                    styles.guideHorizontal,
                    styles.firstRow,
                  ]}
                />
                <View
                  style={[
                    styles.guide,
                    styles.guideHorizontal,
                    styles.secondRow,
                  ]}
                />
              </Animated.View>
            </View>
            {CORNERS.map((corner) => (
              <CropHandle
                base={base}
                corner={corner}
                crop={crop}
                enabled={ready}
                frame={frame}
                key={corner}
                view={view}
              />
            ))}
          </>
        ) : (
          <ActivityIndicator
            color={colors.onPrimaryText}
            style={StyleSheet.absoluteFill}
            testID="photo-editor-loading"
          />
        )}
      </View>

      <Text
        style={[styles.hint, failed && styles.error]}
        testID="photo-editor-hint"
      >
        {failed
          ? "This photo couldn't be edited. Try again."
          : 'Drag the corners to crop. Pinch or drag to zoom and move.'}
      </Text>

      <View style={styles.toolbar}>
        <ToolButton
          disabled={!ready}
          icon="rotateLeft"
          label="Rotate left"
          onPress={() => rotate(-1)}
        />
        <ToolButton
          disabled={!ready}
          icon="rotateRight"
          label="Rotate right"
          onPress={() => rotate(1)}
        />
        <ToolButton
          disabled={!ready}
          icon="zoomOut"
          label="Zoom out"
          onPress={() => zoom(1 / ZOOM_STEP)}
        />
        <ToolButton
          disabled={!ready}
          icon="zoomIn"
          label="Zoom in"
          onPress={() => zoom(ZOOM_STEP)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !ready }}
          disabled={!ready}
          onPress={() => {
            setTurns(0);
            setResets((count) => count + 1);
          }}
          style={styles.tool}
          testID="photo-editor-reset"
        >
          <Text style={[styles.reset, !ready && styles.dimmed]}>Reset</Text>
        </Pressable>
      </View>
    </GestureHandlerRootView>
  );
}

type ToolButtonProps = {
  icon: IconName;
  label: string;
  disabled: boolean;
  onPress: () => void;
};

function ToolButton({ icon, label, disabled, onPress }: ToolButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tool, disabled && styles.dimmed]}
    >
      <Icon color={colors.onPrimaryText} name={icon} size={20} />
    </Pressable>
  );
}

type ShadeProps = {
  crop: SharedValue<Rect>;
  side: Side;
};

/** Dims one of the four areas outside the crop box. */
function Shade({ crop, side }: ShadeProps) {
  const style = useAnimatedStyle(() => {
    const { x, y, width, height } = crop.value;

    if (side === 'top') return { height: y, left: 0, right: 0, top: 0 };
    if (side === 'bottom') {
      return { bottom: 0, left: 0, right: 0, top: y + height };
    }
    if (side === 'left') return { height, left: 0, top: y, width: x };
    return { height, left: x + width, right: 0, top: y };
  });

  return <Animated.View style={[styles.shade, style]} />;
}

type CropHandleProps = {
  corner: Corner;
  crop: SharedValue<Rect>;
  view: SharedValue<CropView>;
  base: Rect;
  frame: Rect;
  enabled: boolean;
};

function CropHandle({
  corner,
  crop,
  view,
  base,
  frame,
  enabled,
}: CropHandleProps) {
  const start = useSharedValue<Rect>(EMPTY_RECT);
  const onRight = corner === 'topRight' || corner === 'bottomRight';
  const onBottom = corner === 'bottomLeft' || corner === 'bottomRight';

  const pan = Gesture.Pan()
    .enabled(enabled)
    .withTestId(`photo-editor-crop-${corner}`)
    .onStart(() => {
      start.set(crop.value);
    })
    .onUpdate((event) => {
      crop.set(
        resizeCrop(
          start.value,
          corner,
          event.translationX,
          event.translationY,
          intersectRect(imageRect(base, view.value), frame),
        ),
      );
    });

  const style = useAnimatedStyle(() => ({
    left: crop.value.x + (onRight ? crop.value.width : 0) - HANDLE_SIZE / 2,
    top: crop.value.y + (onBottom ? crop.value.height : 0) - HANDLE_SIZE / 2,
  }));

  // An L whose corner sits on the crop box's corner.
  const centre = HANDLE_SIZE / 2;
  const mark = {
    borderBottomWidth: onBottom ? MARK_WIDTH : 0,
    borderLeftWidth: onRight ? 0 : MARK_WIDTH,
    borderRightWidth: onRight ? MARK_WIDTH : 0,
    borderTopWidth: onBottom ? 0 : MARK_WIDTH,
    left: onRight ? centre - MARK_SIZE + 1 : centre - 1,
    top: onBottom ? centre - MARK_SIZE + 1 : centre - 1,
  };

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.handle, style]}
        testID={`photo-editor-handle-${corner}`}
      >
        <View style={[styles.mark, mark]} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: BACKDROP,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: spacing[16],
  },
  headerAction: {
    color: colors.onPrimaryText,
    ...typography.body,
  },
  done: {
    color: colors.primary,
    fontWeight: '700',
  },
  title: {
    color: colors.onPrimaryText,
    ...typography.itemName,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
  },
  absolute: {
    position: 'absolute',
  },
  shade: {
    backgroundColor: SHADE,
    position: 'absolute',
  },
  outline: {
    borderColor: colors.onPrimaryText,
    borderWidth: 1,
    position: 'absolute',
  },
  guide: {
    backgroundColor: GUIDE,
    position: 'absolute',
  },
  guideVertical: {
    bottom: 0,
    top: 0,
    width: StyleSheet.hairlineWidth,
  },
  guideHorizontal: {
    height: StyleSheet.hairlineWidth,
    left: 0,
    right: 0,
  },
  first: {
    left: '33.33%',
  },
  second: {
    left: '66.67%',
  },
  firstRow: {
    top: '33.33%',
  },
  secondRow: {
    top: '66.67%',
  },
  handle: {
    height: HANDLE_SIZE,
    position: 'absolute',
    width: HANDLE_SIZE,
  },
  mark: {
    borderColor: colors.onPrimaryText,
    height: MARK_SIZE,
    position: 'absolute',
    width: MARK_SIZE,
  },
  hint: {
    color: colors.border,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[8],
    textAlign: 'center',
    ...typography.itemMeta,
  },
  error: {
    color: colors.warning,
  },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[8],
  },
  tool: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    minWidth: 48,
  },
  reset: {
    color: colors.onPrimaryText,
    ...typography.body,
  },
  dimmed: {
    opacity: 0.4,
  },
});
