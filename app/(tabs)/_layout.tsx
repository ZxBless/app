import { Tabs } from 'expo-router';
import { Timer, History, FileText, Settings } from 'lucide-react-native';
import { colors } from '@/theme/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.grayText,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIconStyle: { marginTop: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Time - Maquiche', tabBarIcon: ({ color, size }) => <Timer size={size} color={color} strokeWidth={2.5} /> }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Panel', tabBarIcon: ({ color, size }) => <History size={size} color={color} strokeWidth={2.5} /> }}
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
