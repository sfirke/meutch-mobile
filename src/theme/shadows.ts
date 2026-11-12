import { colors } from './colors';

// iOS only. Android can't draw hard shadows; Lifted handles that.
export function hardShadow(offset: number) {
  return {
    shadowColor: colors.ink,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: 1,
    shadowRadius: 0,
  } as const;
}

export const shadows = {
  /** @deprecated Content cards have no shadow. Use Lifted for a hard offset. */
  card: {},
} as const;
