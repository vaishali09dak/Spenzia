import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        
        {/* 1. Welcome/Onboarding Screen */}
        <Stack.Screen 
          name="welcome" 
          options={{ title: 'Welcome', headerShown: false }} 
        />
        
        {/* 2. Signup Screen */}
        <Stack.Screen 
          name="signup" 
          options={{ title: 'Create Account', headerShown: false }} 
        />
        
        {/* 3. Login Screen */}
        <Stack.Screen 
          name="login" 
          options={{ title: 'Welcome Back', headerShown: false }} 
        />
       
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
