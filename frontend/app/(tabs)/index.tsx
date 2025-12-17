import React, { useEffect, useState, useRef } from "react";
import { auth, db1 } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import { router } from "expo-router";
import { BlurView } from "expo-blur";


const { height, width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.75;

export default function HomeScreen() {

  /* SIDE MENU ANIMATION */
  const [menuOpen, setMenuOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(slideAnim, {
      toValue: -MENU_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  /* STATE (Backend-ready) */
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [budget, setBudget] = useState(0);
  const [expenseData, setExpenseData] = useState<any[]>([]);

  /* DERIVED VALUES */
  const balance = income - expenses;
  const remaining = budget - expenses;
  const progress = budget > 0 ? expenses / budget : 0;

  useEffect(() => {
  const fetchUserFinance = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db1, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();

        setIncome(data.monthlyIncome || 0);
        setBudget(data.monthlyBudget || 0);
      }

      // TEMP expenses (replace later with transactions sum)
      setExpenses(2770);

      // TEMP category breakdown
      setExpenseData([
        {
          name: "Food",
          amount: 1200,
          color: "#5B8DEF",
          legendFontColor: "#555",
          legendFontSize: 12,
        },
        {
          name: "Transport",
          amount: 600,
          color: "#FFB703",
          legendFontColor: "#555",
          legendFontSize: 12,
        },
        {
          name: "Shopping",
          amount: 500,
          color: "#EF476F",
          legendFontColor: "#555",
          legendFontSize: 12,
        },
        {
          name: "Other",
          amount: 470,
          color: "#06D6A0",
          legendFontColor: "#555",
          legendFontSize: 12,
        },
      ]);
    } catch (error) {
      console.error("Error fetching finance data:", error);
    }
  };

  fetchUserFinance();
}, []);


  return (
    <SafeAreaView style={styles.container}>
      {/* 🔵 TOP SECTION */}
      <View style={styles.topSection}>
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu}>
            <Ionicons name="menu" size={26} color="#fff" />
          </TouchableOpacity>          
          <TouchableOpacity onPress={() => router.push("/(auth)/dashboard")}>
            <Ionicons name="person-circle-outline" size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 30 }}>
          <Text style={styles.balanceLabel}>Total Balance</Text>
          <Text style={styles.balanceValue}>
            ₹{balance.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ⚪ CONTENT */}
      <View style={styles.content}>
        {/* Income & Expense */}
        <View style={styles.row}>
          <View style={styles.smallCard}>
            <Text style={styles.cardTitle}>Income</Text>
            <Text style={styles.income}>₹{income}</Text>
          </View>

          <View style={styles.smallCard}>
            <Text style={styles.cardTitle}>Expenses</Text>
            <Text style={styles.expense}>₹{expenses}</Text>
          </View>
        </View>

        {/* 📊 CHART */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>This Month Spending</Text>

          <PieChart
            data={expenseData}
            width={width - 40}
            height={180}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            chartConfig={{
              color: () => "#000",
            }}
          />
        </View>

        {/* 💳 BUDGET */}
        <View style={styles.budgetCard}>
          <Text style={styles.budgetTitle}>Monthly Budget</Text>

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <View style={styles.budgetFooter}>
            <Text>Budget ₹{budget}</Text>
            <Text style={styles.remaining}>
              Remaining ₹{remaining}
            </Text>
          </View>
        </View>
      </View>

      {/* ➕ ADD EXPENSE */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* 🌫 BLUR OVERLAY */}
{menuOpen && (
  <TouchableOpacity
    style={StyleSheet.absoluteFill}
    activeOpacity={1}
    onPress={closeMenu}
  >
    <BlurView
      intensity={40}
      tint="light"
      style={StyleSheet.absoluteFillObject}
    />
  </TouchableOpacity>
)}

{/* 📂 SLIDING SIDE MENU */}
<Animated.View
  style={[
    styles.sideMenu,
    { transform: [{ translateX: slideAnim }] },
  ]}
>
  <Text style={styles.menuTitle}>Spenzia</Text>

  <MenuItem icon="pulse-outline" label="Expense Heatmap" />
  <MenuItem icon="list-outline" label="Recent Transactions" />
  <MenuItem icon="folder-outline" label="Category Manager" />
  <MenuItem icon="wallet-outline" label="Savings Goal" />
  <MenuItem icon="stats-chart-outline" label="Monthly Reports" />
  <MenuItem icon="trending-up-outline" label="Spending Insights" /> 
  <MenuItem icon="alert-circle-outline" label="Alerts" />

</Animated.View>

    </SafeAreaView>
  );
}

function MenuItem({ icon, label }: any) {
  return (
    <TouchableOpacity style={styles.menuItem}>
      <Ionicons name={icon} size={20} color="#444" />
      <Text style={styles.menuText}>{label}</Text>
    </TouchableOpacity>
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

  topSection: {
    height: height * 0.32,
    backgroundColor: "#5B8DEF",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  balanceLabel: {
    color: "#EAF0FF",
    textAlign: "center",
  },

  balanceValue: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "700",
    textAlign: "center",
  },

  content: {
    flex: 1,
    padding: 20,
    marginTop: -70,
  },

  row: {
    flexDirection: "row",
    gap: 12,
  },

  smallCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    elevation: 4,
  },

  cardTitle: {
    color: "#888",
  },

  income: {
    color: "#2E7D32",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
  },

  expense: {
    color: "#C62828",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 6,
  },

  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    elevation: 4,
  },

  chartTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },

  budgetCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginTop: 12,
    elevation: 4,
  },

  budgetTitle: {
    fontSize: 16,
    fontWeight: "600",
  },

  progressBar: {
    height: 8,
    backgroundColor: "#E6ECFF",
    borderRadius: 8,
    marginVertical: 12,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#1F305E",
  },

  budgetFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  remaining: {
    color: "#2E7D32",
    fontWeight: "600",
  },

  fab: {
    position: "absolute",
    bottom: 16,
    right: 24,
    backgroundColor: "#5B8DEF",
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  sideMenu: {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: MENU_WIDTH,
  backgroundColor: "#fff",
  paddingTop: 60,
  paddingHorizontal: 20,
  elevation: 12,
  zIndex: 20,
},

menuTitle: {
  fontSize: 20,
  fontWeight: "700",
  marginBottom: 30,
},

menuItem: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
},

menuText: {
  marginLeft: 16,
  fontSize: 16,
  color: "#333",
},

});