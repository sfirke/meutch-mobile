import { use, type ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import {
  Header,
  HeaderBackground,
  HeaderShownContext,
  getHeaderTitle,
  type HeaderOptions,
} from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  colors,
  headerOptions,
  headerStitch,
  HEADER_HEIGHT,
  radii,
  tabActivePill,
  tabBarOptions,
  tabBarStitch,
  TAB_BAR_HEIGHT,
} from '../../theme';
import { Icon, type IconName } from '../Icon';
import { CountBadge } from './CountBadge';
import { Stitch } from './Stitch';

type AppHeaderProps = {
  // Native-stack and tab options both carry the shared header keys.
  options: object;
  route: { name: string };
  back?: { title: string | undefined; href: string | undefined };
};

// One JS header for every stack and the tabs. A native header can't take a
// custom background without turning translucent and sliding content under it.
export function AppHeader({ options, route, back }: AppHeaderProps) {
  const headerOpts = options as HeaderOptions & { title?: string };
  const insets = useSafeAreaInsets();
  const parentHeaderShown = use(HeaderShownContext);
  const statusBarHeight = parentHeaderShown ? 0 : insets.top;

  return (
    <Header
      {...headerOpts}
      back={back}
      headerBackground={renderHeaderBackground}
      headerStatusBarHeight={statusBarHeight}
      headerStyle={[
        headerOpts.headerStyle,
        { height: HEADER_HEIGHT + statusBarHeight },
      ]}
      title={getHeaderTitle(headerOpts, route.name)}
    />
  );
}

function renderHeaderBackground({
  style,
}: Pick<ComponentProps<typeof HeaderBackground>, 'style'>) {
  return (
    <HeaderBackground style={style}>
      {headerStitch ? <Stitch style={styles.headerStitch} /> : null}
    </HeaderBackground>
  );
}

export const stackScreenOptions = {
  ...headerOptions,
  header: (props: AppHeaderProps) => <AppHeader {...props} />,
};

export function useTabScreenOptions() {
  const insets = useSafeAreaInsets();

  return {
    ...headerOptions,
    ...tabBarOptions,
    header: (props: AppHeaderProps) => <AppHeader {...props} />,
    tabBarStyle: [
      tabBarOptions.tabBarStyle,
      { height: TAB_BAR_HEIGHT + insets.bottom },
    ],
    tabBarItemStyle: styles.tabItem,
    tabBarIconStyle: styles.iconSlot,
    tabBarBackground: tabBarStitch ? renderTabBarBackground : undefined,
  };
}

function renderTabBarBackground() {
  return (
    <View style={styles.tabBarBackground}>
      <Stitch />
    </View>
  );
}

type TabIconProps = {
  name: IconName;
  focused: boolean;
  color: ColorValue;
  badgeCount?: number;
};

export function TabIcon({
  name,
  focused,
  color,
  badgeCount = 0,
}: TabIconProps) {
  const pill = tabActivePill && focused;

  return (
    <View style={[styles.iconSlot, pill && styles.pill]}>
      <Icon color={pill ? colors.paper : color} name={name} size={20} />
      {badgeCount > 0 ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.badge, pill && styles.badgeOnPill]}
        >
          <CountBadge count={badgeCount} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerStitch: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  tabBarBackground: { flex: 1, backgroundColor: colors.paper },
  tabItem: { paddingTop: 6, paddingBottom: 4 },
  iconSlot: {
    width: 52,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
  },
  pill: { backgroundColor: colors.ink },
  badge: { position: 'absolute', top: -6, left: 32 },
  badgeOnPill: { top: -8, left: 38 },
});
