import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const DARK_BLUE = "#1F305E";
const CREAM = "#FFF9F2";

export default function HelpSupport() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="help-circle-outline" size={34} color={DARK_BLUE} />
          <Text style={styles.title}>Help & Support</Text>
        </View>

        <Text style={styles.sectionTitle}>How can we help you?</Text>
        <Text style={styles.text}>
          If you are facing any issues while using the app, we are here to help
          you. Below are some common topics and ways to reach us.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Common Issues</Text>
          <Text style={styles.text}>• App not loading or crashing</Text>
          <Text style={styles.text}>• Expenses not updating</Text>
          <Text style={styles.text}>• Login or authentication issues</Text>
          <Text style={styles.text}>• Prediction not showing correctly</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Support</Text>
          <Text style={styles.text}>📧 Email: noreply@spenzia-29ccf.firebaseapp.com</Text>
          <Text style={styles.text}>📞 Phone: +91 90000 00000</Text>
          <Text style={styles.text}>🕒 Support Hours: 9 AM – 6 PM</Text>
        </View>

        <Text style={styles.footerText}>
          We usually respond within 24 hours. Thank you for using our app!
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    marginTop: 8,
    fontSize: 26,
    fontWeight: "900",
    color: DARK_BLUE,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: DARK_BLUE,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(0,0,0,0.7)",
    marginBottom: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginTop: 14,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: DARK_BLUE,
    marginBottom: 10,
  },
  footerText: {
    marginTop: 20,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    textAlign: "center",
  },
});
