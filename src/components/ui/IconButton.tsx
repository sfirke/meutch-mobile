import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
  type ColorValue,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, offsets, outline, radii } from '../../theme';
import { Icon, type IconName } from '../Icon';
import {
  DISABLED_OPACITY,
  MIN_TAP_TARGET,
  focusRingStyle,
  useFocusRing,
} from './Button';

export type IconButtonVariant = 'primary' | 'outline' | 'ghost';

export type IconButtonProps = {
  icon: IconName;
  // Required: the icon alone says nothing to a screen reader.
  accessibilityLabel: string;
  onPress?: PressableProps['onPress'];
  variant?: IconButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Look = { fill: ColorValue; icon: ColorValue; border: ColorValue };

const LOOKS: Record<IconButtonVariant, { rest: Look; pressed: Look }> = {
  primary: {
    rest: { fill: colors.teal, icon: colors.ink, border: colors.ink },
    pressed: { fill: colors.tangerine, icon: colors.ink, border: colors.ink },
  },
  outline: {
    rest: { fill: 'transparent', icon: colors.ink, border: colors.ink },
    pressed: { fill: colors.ink, icon: colors.paper, border: colors.ink },
  },
  ghost: {
    rest: { fill: 'transparent', icon: colors.ink, border: 'transparent' },
    pressed: { fill: colors.tealWash, icon: colors.ink, border: 'transparent' },
  },
};

// A 44x44 square, like the web's mobile "+" (.nav-create-mobile). Every
// variant keeps the primary's 2px offset strip below so they swap cleanly.
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'ghost',
  loading = false,
  disabled = false,
  accessibilityHint,
  accessibilityState,
  testID,
  style,
}: IconButtonProps) {
  const focus = useFocusRing();
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={[styles.target, style]}
      testID={testID}
    >
      {({ pressed }) => (
        <IconButtonBody
          disabled={disabled}
          focused={focus.focusVisible}
          icon={icon}
          loading={loading}
          pressed={pressed}
          variant={variant}
        />
      )}
    </Pressable>
  );
}

// Gallery only: the pressed look, drawn without a press.
export function PressedIconButtonPreview({
  icon,
  variant = 'ghost',
}: Pick<IconButtonProps, 'icon' | 'variant'>) {
  return (
    <View style={styles.target}>
      <IconButtonBody
        disabled={false}
        focused={false}
        icon={icon}
        loading={false}
        pressed
        variant={variant}
      />
    </View>
  );
}

type BodyProps = {
  icon: IconName;
  variant: IconButtonVariant;
  loading: boolean;
  disabled: boolean;
  pressed: boolean;
  focused: boolean;
};

function IconButtonBody({
  icon,
  variant,
  loading,
  disabled,
  pressed,
  focused,
}: BodyProps) {
  const isPressed = pressed && !disabled && !loading;
  const look = LOOKS[variant][isPressed ? 'pressed' : 'rest'];
  const isPrimary = variant === 'primary';

  return (
    <View
      needsOffscreenAlphaCompositing={disabled}
      style={[styles.body, disabled && styles.disabled]}
    >
      {isPrimary && !isPressed ? <View style={styles.offset} /> : null}
      <View
        style={[
          styles.face,
          { backgroundColor: look.fill, borderColor: look.border },
          isPrimary && isPressed && styles.facePressed,
          focused && focusRingStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={look.icon} size="small" />
        ) : (
          <Icon color={look.icon} name={icon} size={16} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  target: { width: MIN_TAP_TARGET, height: MIN_TAP_TARGET + offsets.sm },
  body: { paddingBottom: offsets.sm },
  disabled: { opacity: DISABLED_OPACITY },
  offset: {
    position: 'absolute',
    top: offsets.sm,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radii.control,
    backgroundColor: colors.ink,
  },
  face: {
    width: MIN_TAP_TARGET,
    height: MIN_TAP_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.control,
    borderWidth: outline,
  },
  facePressed: { transform: [{ translateY: offsets.sm }] },
});
