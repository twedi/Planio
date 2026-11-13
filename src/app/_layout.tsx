import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { ThemeMode, ThemeProvider, useTheme } from '@/ThemeContext';
import { getDb } from '@/db';
import { getSettings } from '@/db/repo';
import { onReminderOpened, syncNotifications } from '@/notifications';
import { ToastProvider } from '@/components/Toast';

SplashScreen.preventAutoHideAsync();

function Navigator() {
  const { theme } = useTheme();
  const router = useRouter();

  // Görev hatırlatıcısına dokununca o görevin sayfası açılır
  useEffect(
    () => onReminderOpened((cardId) => router.push({ pathname: '/task/[id]', params: { id: String(cardId) } })),
    [router]
  );

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'slide_from_right',
        animationDuration: 260,
      }}
    >
      {/* Form ekranları alttan açılır, diğerleri sağdan kayar */}
      <Stack.Screen name="card/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="board/new" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="templates/[id]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="focus/[id]" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="checklist/edit" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="search" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [dbReady, setDbReady] = useState(false);
  const [initialMode, setInitialMode] = useState<ThemeMode>('system');

  useEffect(() => {
    getDb()
      .then(() => getSettings())
      .then((s) => {
        setInitialMode(s.theme);
        setDbReady(true);
      })
      .catch((e) => console.warn('Veritabanı açılamadı', e));
  }, []);

  useEffect(() => {
    if (fontsLoaded && dbReady) {
      SplashScreen.hideAsync();
      syncNotifications(false);
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) return <View style={{ flex: 1 }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider initialMode={initialMode}>
          <ToastProvider>
            <Navigator />
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
