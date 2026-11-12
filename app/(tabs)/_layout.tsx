import { Tabs } from 'expo-router/js-tabs';

import { CreateMenu } from '../../src/components/CreateMenu';
import { RequireSession } from '../../src/components/RequireSession';
import {
  TabIcon,
  useTabScreenOptions,
} from '../../src/components/ui/NavigationChrome';
import { useInboxUnreadCount } from '../../src/query/useInboxUnreadCount';

export default function TabsLayout() {
  // Derived from the cached inbox page 1; there is no unread-count endpoint.
  const unreadCount = useInboxUnreadCount();
  const tabScreenOptions = useTabScreenOptions();

  return (
    <RequireSession>
      <Tabs
        screenOptions={{
          ...tabScreenOptions,
          headerRight: () => <CreateMenu />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} name="feed" />
            ),
          }}
        />
        <Tabs.Screen
          name="browse"
          options={{
            title: 'Browse',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} name="browse" />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: 'Inbox',
            tabBarAccessibilityLabel:
              unreadCount > 0 ? `Inbox, ${unreadCount} unread` : undefined,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                badgeCount={unreadCount}
                color={color}
                focused={focused}
                name="inbox"
              />
            ),
          }}
        />
        <Tabs.Screen
          name="circles"
          options={{
            title: 'Circles',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} name="circle" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon color={color} focused={focused} name="profile" />
            ),
          }}
        />
      </Tabs>
    </RequireSession>
  );
}
