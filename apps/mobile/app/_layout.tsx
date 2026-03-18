import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/splash-ad');
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash-ad" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}