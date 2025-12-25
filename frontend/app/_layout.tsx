import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import * as Notifications from "expo-notifications";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { onIdTokenChanged } from "firebase/auth";
import { auth, db1 } from "../firebase";
import { useEffect, useState } from "react";
import { ActivityIndicator, LogBox, Platform, View } from "react-native";
import { doc, onSnapshot } from "firebase/firestore";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    LogBox.ignoreLogs([
      "expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go",
    ]);

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });
    }
  }, []);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setProfileComplete(firebaseUser ? null : false);
      setChecking(false);

      if (firebaseUser && !firebaseUser.emailVerified) {
        firebaseUser
          .reload()
          .then(() => {
            if (auth.currentUser) {
              setUser(auth.currentUser);
            }
          })
          .catch(() => undefined);
      }
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const unsub = onSnapshot(doc(db1, "users", user.uid), (snap) => {
      const data: any = snap.data();
      setProfileComplete(!!data?.fullName);
    });

    return unsub;
  }, [user?.uid]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const canEnterApp = !!user?.emailVerified && profileComplete === true;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        {canEnterApp ? (
          <Stack.Screen name="(tabs)" />
        ) : (
          <Stack.Screen name="(auth)" />
        )}
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
