import React, { useEffect, useState } from "react";
import { useRouter } from 'expo-router';

import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db1 } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";

const { height, width } = Dimensions.get("window");

export default function DashboardScreen() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db1, "users", user.uid));
          if (userDoc.exists()) {
            setUserData({
              ...userDoc.data(),
              email: user.email || "Not provided",
            });
          } else {
            // If user doc doesn't exist, use auth data
            setUserData({
              fullName: user.displayName || "User",
              email: user.email || "Not provided",
              phone: "Not provided",
              age: "Not provided",
            });
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* 🔵 PROFILE HEADER SECTION */}
        <View style={styles.profileHeader}>
          <View style={styles.headerTop}>

            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            {/* <TouchableOpacity onPress={() => router.push("/profile")}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity> */}

          </View>

          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color="#5B8DEF" />
            </View>
            <Text style={styles.userName}>
              {userData?.fullName || "User Name"}
            </Text>
            <TouchableOpacity onPress={() => router.push("/profile")}>
            <Text style={styles.userRole}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ⚪ CONTENT */}
        <View style={styles.content}>
          {/* MY DETAILS SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Details</Text>
            </View>

            <View style={styles.detailsCard}>
              <View style={styles.detailItem}>
                <View style={[styles.iconCircle, { backgroundColor: "#FFE5E5" }]}>
                  <Ionicons name="person-outline" size={20} color="#EF476F" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Full Name</Text>
                  <Text style={styles.detailValue}>
                    {userData?.fullName || "Not set"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={[styles.iconCircle, { backgroundColor: "#FFF4E5" }]}>
                  <Ionicons name="mail-outline" size={20} color="#FFB703" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>
                    {userData?.email || "Not set"}
                  </Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={[styles.iconCircle, { backgroundColor: "#E5F3FF" }]}>
                  <Ionicons name="call-outline" size={20} color="#5B8DEF" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>
                    {userData?.phone || "Not set"}
                  </Text>
                </View>
              </View>

              <View style={[styles.detailItem, styles.detailItemLast]}>
                <View style={[styles.iconCircle, { backgroundColor: "#E5F9F5" }]}>
                  <Ionicons name="calendar-outline" size={20} color="#06D6A0" />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Age</Text>
                  <Text style={styles.detailValue}>
                    {userData?.age ? `${userData.age} years` : "Not set"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* FINANCIAL SUMMARY SECTION */}
          {userData?.monthlyIncome && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Financial Summary</Text>
              </View>
              <View style={styles.financialCard}>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Monthly Income</Text>
                  <Text style={styles.financialValue}>
                    ₹{userData.monthlyIncome?.toLocaleString() || 0}
                  </Text>
                </View>
                <View style={styles.financialItem}>
                  <Text style={styles.financialLabel}>Monthly Budget</Text>
                  <Text style={styles.financialValue}>
                    ₹{userData.monthlyBudget?.toLocaleString() || 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
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
  },

  profileHeader: {
    backgroundColor: "#5B8DEF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  profileInfo: {
    alignItems: "center",
  },

  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 3,
    borderColor: "#FFB6C1",
  },

  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },

  userRole: {
    fontSize: 14,
    color: "#EAF0FF",
    fontWeight: "400",
  },

  content: {
    flex: 1,
    padding: 20,
    marginTop: -20,
  },

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8, 
    marginBottom: 8
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E3A5F",
    marginTop: 12
  },

  detailsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: -15
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },

  detailItemLast: {
    borderBottomWidth: 0,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },

  detailTextContainer: {
    flex: 1,
  },

  detailLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },

  financialCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: "row",
    justifyContent: "space-around",
  },

  financialItem: {
    alignItems: "center",
  },

  financialLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },

  financialValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5B8DEF",
  },
});
