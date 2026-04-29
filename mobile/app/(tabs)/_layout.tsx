import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color }: { name: IoniconsName; color: string }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#16a34a',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 62,
          paddingBottom: 10,
          paddingTop: 6,
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tổng quan',
          tabBarIcon: ({ color }) => <TabIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Chi tiêu',
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Thống kê',
          tabBarIcon: ({ color }) => <TabIcon name="bar-chart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Cài đặt',
          tabBarIcon: ({ color }) => <TabIcon name="settings-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
