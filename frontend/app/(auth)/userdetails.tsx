"use client";

import React, { useState } from "react";
import BackgroundDecor from "../../components/BackgroundDecor";

import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db1 } from "../../firebase";
import { db } from "../../firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";

export default function UserDetailsScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    // 🔍 Simple validation
    if (!name || !phone || !age || !income || !budget) {
      Alert.alert("Missing details", "Please fill all fields");
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Invalid phone", "Phone number must be 10 digits");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    try {
      setLoading(true);

      await setDoc(doc(db1, "users", user.uid), {
        fullName: name,
        phone,
        age: Number(age),
        monthlyIncome: Number(income),
        monthlyBudget: Number(budget),
        createdAt: serverTimestamp(),
      });

      // 🚀 Go to home
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackgroundDecor />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="id-card-outline" size={64} color="#1F305E" />
          <Text style={styles.title}>Tell us about you</Text>
          <Text style={styles.subtitle}>
            This helps us personalize your spending insights
          </Text>
        </View>

        {/* Personal Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            maxLength={10}
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            style={styles.input}
            placeholder="Age"
            keyboardType="numeric"
            value={age}
            onChangeText={setAge}
          />
        </View>

        {/* Financial Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Financial Details</Text>

          <TextInput
            style={styles.input}
            placeholder="Monthly Income (₹)"
            keyboardType="numeric"
            value={income}
            onChangeText={setIncome}
          />

          <TextInput
            style={styles.input}
            placeholder="Monthly Budget (₹)"
            keyboardType="numeric"
            value={budget}
            onChangeText={setBudget}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.7 }]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Saving..." : "Continue"}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>
          You can change this later from settings
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF9F2",
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 28,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F305E",
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F305E",
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EEF1F7",
    paddingHorizontal: 14,
    fontSize: 15,
    color: "#111827",
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#1F305E",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  footerText: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 12,
    marginTop: 14,
    marginBottom: 30,
  },
});
