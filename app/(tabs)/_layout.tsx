import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet } from 'react-native';

import { Icon } from '../../src/components/Icon';
import { RequireSession } from '../../src/components/RequireSession';
import { colors } from '../../src/theme';

export default function TabsLayout() {
  return (
    <RequireSession>
      <Tabs
        screenOptions={{
          headerStyle: styles.header,
          headerTintColor: colors.text,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.secondary,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="feed" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: 'Browse',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="browse" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="inbox" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="circles"
          options={{
            title: 'Circles',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="circle" size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Icon color={color} name="profile" size={size} />
            ),
          }}
        />
      </Tabs>
    </RequireSession>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
  },
});
