import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { auth, db1 } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const snap = await getDoc(doc(db1, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setFullName(data.fullName || "");
          setPhone(data.phone || "");
          setAge(data.age ? String(data.age) : "");
          setMonthlyIncome(
            data.monthlyIncome !== undefined && data.monthlyIncome !== null
              ? String(data.monthlyIncome)
              : ""
          );
          setMonthlyBudget(
            data.monthlyBudget !== undefined && data.monthlyBudget !== null
              ? String(data.monthlyBudget)
              : ""
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!fullName || !phone || !age || !monthlyIncome || !monthlyBudget) {
      Alert.alert("Missing details", "Please fill all fields");
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Invalid phone", "Phone number must be 10 digits");
      return;
    }

    const incomeValue = Number(monthlyIncome);
    const budgetValue = Number(monthlyBudget);

    if (Number.isNaN(incomeValue) || Number.isNaN(budgetValue)) {
      Alert.alert("Invalid amount", "Monthly income and budget must be numbers");
      return;
    }

    try {
      setSaving(true);
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db1, "users", user.uid), {
        fullName,
        phone,
        age: Number(age),
        monthlyIncome: incomeValue,
        monthlyBudget: budgetValue,
      });

      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1F305E" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 96 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>
            {/* HEADER */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.topIconBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color="#1F305E" />
              </TouchableOpacity>

              <View style={styles.topRightSpacer} />
            </View>

            <View style={styles.hero}>
              <Text style={styles.pageTitle}>Edit Profile</Text>
            </View>

            {/* FORM */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Personal Details</Text>

          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color="#1F305E" />
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.inputRow}>
            <Ionicons name="call-outline" size={18} color="#1F305E" />
            <TextInput
              style={styles.input}
              placeholder="10-digit number"
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              returnKeyType="next"
            />
          </View>

          <Text style={styles.label}>Age</Text>
          <View style={styles.inputRow}>
            <Ionicons name="calendar-outline" size={18} color="#1F305E" />
            <TextInput
              style={styles.input}
              placeholder="Your age"
              keyboardType="number-pad"
              maxLength={3}
              value={age}
              onChangeText={setAge}
              returnKeyType="done"
            />
          </View>
        </View>

              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Financial Details</Text>

          <Text style={styles.label}>Monthly Income</Text>
          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={18} color="#1F305E" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              keyboardType="number-pad"
              value={monthlyIncome}
              onChangeText={setMonthlyIncome}
            />
          </View>

          <Text style={styles.label}>Monthly Budget</Text>
          <View style={styles.inputRow}>
            <Ionicons name="wallet-outline" size={18} color="#1F305E" />
            <TextInput
              style={styles.input}
              placeholder="e.g. 20000"
              keyboardType="number-pad"
              value={monthlyBudget}
              onChangeText={setMonthlyBudget}
            />
          </View>
        </View>

      {/* SAVE BUTTON */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <View style={styles.saveRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.saveText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.saveText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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

  flex: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 160,
  },

  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },

  loadingText: {
    color: "#1F305E",
    fontSize: 14,
    fontWeight: "600",
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 2,
  },

  topIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },

  topRightSpacer: {
    width: 44,
    height: 44,
  },

  hero: {
    paddingTop: 10,
    paddingBottom: 14,
  },

  pageTitle: {
    marginTop: 6,
    fontSize: 34,
    fontWeight: "900",
    color: "#1F305E",
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1F305E",
    marginBottom: 14,
  },

  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F305E",
    marginBottom: 8,
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF1F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    fontSize: 16,
  },

  saveBtn: {
    backgroundColor: "#1F305E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },

  saveBtnDisabled: {
    opacity: 0.75,
  },

  saveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
