import { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { t } from '@/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

function tabIcon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} size={size} color={color as string} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const colors = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.card, borderTopWidth: 0 },
        tabBarActiveTintColor: colors.primaryStrong,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab.today'), tabBarIcon: tabIcon('sunny-outline') }} />
      <Tabs.Screen name="lists" options={{ title: t('tab.lists'), tabBarIcon: tabIcon('list-outline') }} />
      <Tabs.Screen name="calendar" options={{ title: t('tab.calendar'), tabBarIcon: tabIcon('calendar-outline') }} />
      <Tabs.Screen name="settings" options={{ title: t('tab.settings'), tabBarIcon: tabIcon('settings-outline') }} />
    </Tabs>
  );
}
