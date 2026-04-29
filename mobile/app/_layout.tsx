import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ExpenseProvider } from '../lib/ExpenseContext';
import { Snackbar } from '../lib/Snackbar';

let QuickActions: any = null;
try { QuickActions = require('expo-quick-actions'); } catch {}

export default function RootLayout() {
  useEffect(() => {
    if (!QuickActions) return;
    const sub = QuickActions.addListener((action: any) => {
      const href = action?.params?.href;
      if (href) router.push(href);
    });
    QuickActions.initial().then((action: any) => {
      const href = action?.params?.href;
      if (href) setTimeout(() => router.push(href), 500);
    }).catch(() => {});
    return () => sub?.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <ExpenseProvider>
        <View style={{ flex: 1 }}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="register" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
            <Stack.Screen name="change-password" />
            <Stack.Screen name="expense/[id]" />
            <Stack.Screen name="recurring" />
          </Stack>
          <Snackbar />
        </View>
      </ExpenseProvider>
    </SafeAreaProvider>
  );
}
