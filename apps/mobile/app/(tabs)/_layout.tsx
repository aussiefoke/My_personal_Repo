import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguageStore } from '../../store/languageStore';

export default function TabLayout() {
  const { t } = useLanguageStore();

  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1DB954' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: t('tab.map'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="map" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rank"
        options={{
          title: t('tab.rank'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="trophy" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tab.profile'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="person" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: t('tab.ai'),
          tabBarIcon: ({ color }) => (
            <Ionicons name="chatbubble-ellipses" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calculator"
        options={{ href: null }}
      />
    </Tabs>
  );
}