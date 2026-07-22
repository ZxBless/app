import { Tabs } from 'expo-router';
import { Timer, History, FileText, Settings } from 'lucide-react-native';
import { colors } from '@/theme/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.yellow,
        tabBarInactiveTintColor: colors.grayText,
        tabBarStyle: {
          backgroundColor: colors.black,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Cronómetro', tabBarIcon: ({ color, size }) => <Timer size={size} color={color} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Historial', tabBarIcon: ({ color, size }) => <History size={size} color={color} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="reports"
        options={{ title: 'Reportes', tabBarIcon: ({ color, size }) => <FileText size={size} color={color} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="config"
        options={{ title: 'Config', tabBarIcon: ({ color, size }) => <Settings size={size} color={color} strokeWidth={2.5} /> }}
      />
    </Tabs>
  );
}
