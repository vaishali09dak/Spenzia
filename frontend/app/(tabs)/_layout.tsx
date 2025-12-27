import { Tabs } from "expo-router";
import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

const ACTIVE_BORDER = "#213c74";
const INACTIVE_ICON = "#9CA3AF";
const ACTIVE_ICON = "#213c74";
const CREAM = "#FFF9F2";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarItemStyle: { flex: 1 }, // equal width

        tabBarStyle: {
          height: 70,
          backgroundColor: CREAM,
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: "transparent",
        },
      }}
    >
      {/* HOME */}
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: CREAM,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -12,

                borderWidth: focused ? 1.5 : 0,
                borderColor: focused ? ACTIVE_BORDER : "transparent",

                shadowColor: ACTIVE_BORDER,
                shadowOpacity: focused ? 0.25 : 0,
                shadowRadius: focused ? 6 : 0,
                shadowOffset: { width: 0, height: 0 },
                elevation: focused ? 4 : 0,
              }}
            >
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={24}
                color={focused ? ACTIVE_ICON : INACTIVE_ICON}
              />
            </View>
          ),
        }}
      />

      {/* HIDDEN ROUTES — COMPLETELY REMOVED FROM TAB BAR */}
      <Tabs.Screen
        name="FinancialHeatMapScreen"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="CategoryManager"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="Alerts"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="savingGoals"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="MonthlyReport"
        options={{ href: null }}
      />

      {/* SETTINGS */}
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                backgroundColor: CREAM,
                alignItems: "center",
                justifyContent: "center",
                marginTop: -12,

                borderWidth: focused ? 1.5 : 0,
                borderColor: focused ? ACTIVE_BORDER : "transparent",

                shadowColor: ACTIVE_BORDER,
                shadowOpacity: focused ? 0.25 : 0,
                shadowRadius: focused ? 6 : 0,
                shadowOffset: { width: 0, height: 0 },
                elevation: focused ? 4 : 0,
              }}
            >
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={24}
                color={focused ? ACTIVE_ICON : INACTIVE_ICON}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
