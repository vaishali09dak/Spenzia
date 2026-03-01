import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const DARK_BLUE = "#1F305E";
const CREAM = "#FFF9F2";

export default function AboutUs() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Ionicons name="information-circle-outline" size={34} color={DARK_BLUE} />
          <Text style={styles.title}>About Us</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our Mission</Text>
          <Text style={styles.text}>
            Our mission is to help users understand, manage, and predict their
            spending habits in a simple and meaningful way.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>What We Do</Text>
          <Text style={styles.text}>
            • Track your daily expenses
          </Text>
          <Text style={styles.text}>
            • Categorize spending automatically
          </Text>
          <Text style={styles.text}>
            • Predict future expenses using past data
          </Text>
          <Text style={styles.text}>
            • Provide clear insights for better financial decisions
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Why Choose Us?</Text>
          <Text style={styles.text}>
            We focus on clean design, accurate insights, and user-friendly
            experiences tailored for everyday users.
          </Text>
        </View>

        <Text style={styles.footerText}>
          © 2026 Spenzia. All rights reserved.
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
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(0,0,0,0.7)",
    marginBottom: 6,
  },
  footerText: {
    marginTop: 24,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    textAlign: "center",
  },
});
