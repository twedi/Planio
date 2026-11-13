import React from 'react';
import { View, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';

type Props = { children: React.ReactNode; style?: ViewStyle; bottomInset?: boolean };

export function Screen({ children, style, bottomInset = false }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: theme.colors.background, paddingTop: insets.top, paddingBottom: bottomInset ? insets.bottom : 0 },
        style,
      ]}
    >
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {children}
    </View>
  );
}
