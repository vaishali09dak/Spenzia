import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="FinancialHeatMapScreen"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />

      <Tabs.Screen
        name="CategoryManager"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />

      {/* <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color }) => (
            <Ionicons name="paper-plane" size={28} color={color} />
          ),
        }} */}
        
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
