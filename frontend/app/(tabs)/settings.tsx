import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await signOut(auth);
            // Auth guard will auto-redirect to login
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <Text style={styles.title}>Settings</Text>

      {/* SETTINGS CARD */}
      <View style={styles.card}>
        {/* Edit Profile */}
        <TouchableOpacity
          style={styles.item}
          onPress={() => router.push("/(tabs)/profile")}
        >
          <Ionicons name="person-outline" size={22} color="#1F305E" />
          <Text style={styles.itemText}>Edit Profile</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Notifications */}
        <View style={styles.item}>
          <Ionicons name="notifications-outline" size={22} color="#1F305E" />
          <Text style={styles.itemText}>Notifications</Text>
          <Switch
            style={{ marginLeft: "auto" }}
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
        </View>

        <View style={styles.divider} />

        {/* Help */}
        <TouchableOpacity style={styles.item}>
          <Ionicons name="help-circle-outline" size={22} color="#1F305E" />
          <Text style={styles.itemText}>Help & Support</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* About */}
        <TouchableOpacity style={styles.item}>
          <Ionicons name="information-circle-outline" size={22} color="#1F305E" />
          <Text style={styles.itemText}>About Spenzia</Text>
        </TouchableOpacity>
      </View>

      {/* LOGOUT */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#D32F2F" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* =========================
   STYLES
   ========================= */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    paddingHorizontal: 20,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F305E",
    marginTop: 50,
    marginBottom: 20,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 8,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
  },

  itemText: {
    fontSize: 16,
    color: "#1F305E",
    fontWeight: "500",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 16,
  },

  logoutBtn: {
    marginTop: 40,
    backgroundColor: "#FFECEC",
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },

  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#D32F2F",
  },
});