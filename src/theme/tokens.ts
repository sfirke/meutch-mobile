import { colors } from './colors';

export const outline = 1.5;
export const focusRing = 2;

export const offsets = { sm: 2, md: 3, lg: 4, dialog: 5, xl: 6 } as const;

export const stitch = {
  dash: 14,
  gap: 9,
  height: 3,
  color: colors.tangerine,
} as const;

export const pinked = { toothWidth: 24, toothHeight: 12 } as const;

// Degrees.
export const tilt = { tag: -3, thumb: 2, photo: -1.5, logo: -4 } as const;
