import { Pressable, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { colors, radii } from '../../theme';
import { Icon } from '../Icon';

export type UploadTileProps = {
  accessibilityLabel: string;
  onPress: () => void;
  // Fixed side length. Omit to fill the parent's width as a square.
  size?: number;
  // A file is already attached: emerald border on a tealWash fill.
  hasFile?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

// Add-photo tile: dashed tangerine edge on paper, with a plus.
export function UploadTile({
  accessibilityLabel,
  onPress,
  size,
  hasFile = false,
  disabled = false,
  style,
}: UploadTileProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        size === undefined ? styles.fluid : { height: size, width: size },
        hasFile && styles.hasFile,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View pointerEvents="none">
        <Icon color={colors.ink} name="plus" size={22} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.tangerine,
    borderRadius: radii.control,
    borderStyle: 'dashed',
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  fluid: {
    aspectRatio: 1,
    width: '100%',
  },
  hasFile: {
    backgroundColor: colors.tealWash,
    borderColor: colors.emerald,
  },
  pressed: {
    backgroundColor: colors.tealWash,
  },
  disabled: {
    opacity: 0.5,
  },
});
