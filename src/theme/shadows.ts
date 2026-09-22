import { colors } from './colors';

// Card shadow lifted from the AppShell card style.
export const shadows = {
  card: {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
} as const;
