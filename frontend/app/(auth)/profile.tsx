import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db1 } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { router } from "expo-router";

export default function ProfileScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [loading, setLoading] = useState(true);

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
    if (!fullName || !phone || !age) {
      Alert.alert("Missing details", "Please fill all fields");
      return;
    }

    if (phone.length !== 10) {
      Alert.alert("Invalid phone", "Phone number must be 10 digits");
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) return;

      await updateDoc(doc(db1, "users", user.uid), {
        fullName,
        phone,
        age: Number(age),
      });

      Alert.alert("Success", "Profile updated successfully");
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1F305E" />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* FORM */}
      <View style={styles.card}>
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={fullName}
          onChangeText={setFullName}
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

      {/* SAVE BUTTON */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>Save Changes</Text>
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
    justifyContent: "space-between",
  },

  title: {
    marginTop:30,
    fontSize: 20,
    fontWeight: "700",
    color: "#1F305E",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 3,
  },

  input: {
    backgroundColor: "#EEF1F7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },

  saveBtn: {
    backgroundColor: "#1F305E",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
  },

  saveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
