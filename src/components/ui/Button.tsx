import { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityState,
  type ColorValue,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import {
  colors,
  focusRing,
  offsets,
  outline,
  radii,
  spacing,
  typography,
} from '../../theme';
import { Icon, type IconName } from '../Icon';

export type ButtonVariant =
  'primary' | 'outline' | 'danger' | 'outlineDanger' | 'light' | 'link';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  variant: ButtonVariant;
  onPress?: PressableProps['onPress'];
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityRole?: 'button' | 'link';
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: AccessibilityState;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

type Look = { fill: ColorValue; text: ColorValue; border: ColorValue };

// Rest and pressed (the web's :active) looks, from style.css.
const LOOKS: Record<ButtonVariant, { rest: Look; pressed: Look }> = {
  primary: {
    rest: { fill: colors.teal, text: colors.ink, border: colors.ink },
    pressed: { fill: colors.tangerine, text: colors.ink, border: colors.ink },
  },
  outline: {
    rest: { fill: 'transparent', text: colors.ink, border: colors.ink },
    pressed: { fill: colors.ink, text: colors.paper, border: colors.ink },
  },
  danger: {
    rest: { fill: colors.danger, text: colors.white, border: colors.ink },
    pressed: { fill: colors.ink, text: colors.white, border: colors.ink },
  },
  outlineDanger: {
    rest: { fill: 'transparent', text: colors.danger, border: colors.danger },
    pressed: { fill: colors.danger, text: colors.white, border: colors.danger },
  },
  light: {
    rest: { fill: colors.cardPaper, text: colors.ink, border: colors.ink },
    pressed: { fill: colors.tealWash, text: colors.ink, border: colors.ink },
  },
  link: {
    rest: { fill: 'transparent', text: colors.tealDeep, border: 'transparent' },
    pressed: { fill: 'transparent', text: colors.ink, border: 'transparent' },
  },
};

const SIZES: Record<
  ButtonSize,
  { paddingVertical: number; paddingHorizontal: number; text: TextStyle }
> = {
  sm: {
    paddingVertical: 6,
    paddingHorizontal: spacing[12],
    text: { ...typography.buttonSmall, lineHeight: 21 },
  },
  md: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    text: { ...typography.button, lineHeight: 24 },
  },
  lg: {
    paddingVertical: spacing[10],
    paddingHorizontal: 22,
    text: { ...typography.button, fontSize: 18, lineHeight: 27 },
  },
};

export const MIN_TAP_TARGET = 44;
export const DISABLED_OPACITY = 0.65;

type FocusEvent = Parameters<NonNullable<PressableProps['onFocus']>>[0];

// Tracks keyboard focus. On web, a mouse or touch focus doesn't count, the
// same as CSS :focus-visible.
export function useFocusRing() {
  const [focusVisible, setFocusVisible] = useState(false);

  return {
    focusVisible,
    onFocus: (event: FocusEvent) => {
      if (Platform.OS !== 'web') {
        setFocusVisible(true);
        return;
      }
      const target = event.target as unknown as {
        matches?: (selector: string) => boolean;
      };
      setFocusVisible(target.matches?.(':focus-visible') ?? true);
    },
    onBlur: () => setFocusVisible(false),
  };
}

export const focusRingStyle: ViewStyle = {
  outlineColor: colors.ink,
  outlineOffset: 2,
  outlineStyle: 'solid',
  outlineWidth: focusRing,
};

export function Button({
  label,
  variant,
  onPress,
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityRole = 'button',
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  testID,
  style,
}: ButtonProps) {
  const focus = useFocusRing();
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{
        ...accessibilityState,
        disabled: inactive,
        busy: loading,
      }}
      disabled={inactive}
      onBlur={focus.onBlur}
      onFocus={focus.onFocus}
      onPress={onPress}
      style={[styles.target, fullWidth && styles.fullWidth, style]}
      testID={testID}
    >
      {({ pressed }) => (
        <ButtonBody
          disabled={disabled}
          focused={focus.focusVisible}
          icon={icon}
          label={label}
          loading={loading}
          pressed={pressed}
          size={size}
          variant={variant}
        />
      )}
    </Pressable>
  );
}

// Gallery only: the pressed look, drawn without a press.
export function PressedButtonPreview(
  props: Pick<ButtonProps, 'label' | 'variant' | 'size' | 'icon'>,
) {
  return (
    <View style={styles.target}>
      <ButtonBody
        disabled={false}
        focused={false}
        loading={false}
        pressed
        {...props}
        size={props.size ?? 'md'}
      />
    </View>
  );
}

type BodyProps = {
  label: string;
  variant: ButtonVariant;
  size: ButtonSize;
  icon?: IconName;
  loading: boolean;
  disabled: boolean;
  pressed: boolean;
  focused: boolean;
};

// The face sits on a 2px strip kept for every variant, so mixed rows line up
// and a primary press moves the face into it without moving the layout.
function ButtonBody({
  label,
  variant,
  size,
  icon,
  loading,
  disabled,
  pressed,
  focused,
}: BodyProps) {
  const isPressed = pressed && !disabled && !loading;
  const look = LOOKS[variant][isPressed ? 'pressed' : 'rest'];
  const textColor = variant === 'link' && disabled ? colors.muted : look.text;
  const metrics = SIZES[size];
  const isPrimary = variant === 'primary';

  return (
    <View
      // Android otherwise fades each layer alone and the offset shows through.
      needsOffscreenAlphaCompositing={disabled}
      style={[styles.body, disabled && styles.disabled]}
    >
      {isPrimary && !isPressed ? <View style={styles.offset} /> : null}
      <View
        style={[
          styles.face,
          {
            backgroundColor: look.fill,
            borderColor: look.border,
            paddingVertical: metrics.paddingVertical,
            paddingHorizontal: metrics.paddingHorizontal,
          },
          isPrimary && isPressed && styles.facePressed,
          focused && focusRingStyle,
        ]}
      >
        <View style={[styles.content, loading && styles.hidden]}>
          {icon ? (
            <Icon color={textColor} name={icon} size={metrics.text.fontSize} />
          ) : null}
          <Text
            style={[
              metrics.text,
              styles.label,
              { color: textColor },
              variant === 'link' && styles.underline,
            ]}
          >
            {label}
          </Text>
        </View>
        {loading ? (
          <View style={styles.spinner}>
            <ActivityIndicator color={textColor} size="small" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  target: {
    minHeight: MIN_TAP_TARGET,
    minWidth: MIN_TAP_TARGET,
    maxWidth: '100%',
    justifyContent: 'center',
  },
  fullWidth: { alignSelf: 'stretch' },
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
    borderRadius: radii.control,
    borderWidth: outline,
    justifyContent: 'center',
  },
  facePressed: { transform: [{ translateY: offsets.sm }] },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  hidden: { opacity: 0 },
  label: { flexShrink: 1, textAlign: 'center' },
  underline: { textDecorationLine: 'underline' },
  spinner: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
