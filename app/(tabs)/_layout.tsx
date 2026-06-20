import { Tabs } from 'expo-router';
import { theme } from '@/lib/ui/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.bg.surface,
          borderTopColor: theme.border.subtle,
        },
        tabBarActiveTintColor: theme.accent.indigo,
        tabBarInactiveTintColor: theme.text.muted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Briefing' }} />
      <Tabs.Screen name="market" options={{ title: 'Market' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="holdfold" options={{ title: 'HoldFold' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
