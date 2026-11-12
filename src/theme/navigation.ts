import type { Theme } from 'expo-router';

import { colors } from './colors';
import { fonts } from './fonts';
import { spacing } from './spacing';
import { outline } from './tokens';

// Look switches for the owner's checkpoint.
export const headerStitch = true;
export const tabActivePill = false;
export const tabBarStitch = false;

// Header row height, not counting the status bar. Leaves room for the 44px
// "+" and its 2px offset.
export const HEADER_HEIGHT = 64;
// Tab bar height, not counting the bottom safe area.
export const TAB_BAR_HEIGHT = 60;

// Navigation's built-in text pairs each family with a fontWeight; 'normal'
// stops it faux-bolding our single-weight families on web and Android.
export const navigationTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.tealDeep,
    background: colors.paper,
    card: colors.paper,
    text: colors.ink,
    border: colors.line,
    notification: colors.purple,
  },
  fonts: {
    regular: { fontFamily: fonts.body[400], fontWeight: 'normal' },
    medium: { fontFamily: fonts.body[500], fontWeight: 'normal' },
    bold: { fontFamily: fonts.display[600], fontWeight: 'normal' },
    heavy: { fontFamily: fonts.display[700], fontWeight: 'normal' },
  },
};

// Shared by every stack and the tabs.
export const headerOptions = {
  headerTintColor: colors.ink,
  headerShadowVisible: false,
  headerTitleAlign: 'left',
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: { backgroundColor: colors.paper },
  headerTitleStyle: {
    fontFamily: fonts.display[600],
    fontWeight: 'normal',
    fontSize: 20,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  headerLeftContainerStyle: { paddingStart: spacing[4] },
  headerRightContainerStyle: { paddingEnd: spacing[12] },
} as const;

export const tabBarOptions = {
  tabBarActiveTintColor: colors.ink,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: {
    fontFamily: fonts.body[600],
    fontWeight: 'normal',
    fontSize: 12,
  },
  tabBarStyle: {
    backgroundColor: colors.paper,
    borderTopWidth: tabBarStitch ? 0 : outline,
    borderTopColor: colors.line,
    elevation: 0,
    shadowOpacity: 0,
  },
} as const;
