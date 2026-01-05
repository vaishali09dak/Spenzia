import React, { useEffect, useState, useRef } from "react";
import { auth, db1 } from "../../firebase";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PieChart } from "react-native-chart-kit";
import { router } from "expo-router";
import { BlurView } from "expo-blur";
import { collection, doc, onSnapshot, query, where } from "firebase/firestore";
import ExpenseFabModal from '../(auth)/ExpenseFabModal';

const { height, width } = Dimensions.get("window");
const MENU_WIDTH = width * 0.70;

const CATEGORY_COLORS: Record<string, string> = {
  education: "#F7B6C8",
  bills: "#C7B1DB",
  utilities: "#C7B1DB",
  entertainment: "#F3C3A7",
  food: "#BFF4C9",
  transport: "#7FC4C4",
  travel: "#7FC4C4",
  health: "#B5D7F4",
  shopping: "#F5D7A6",
  rent: "#C9D4E6",
  other: "#CBD5E1",
};

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
  const [baseIncome, setBaseIncome] = useState(0);
  const [incomeTxTotal, setIncomeTxTotal] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [budget, setBudget] = useState(0);
  const [expenseData, setExpenseData] = useState<any[]>([]);

  const budgetRef = useRef(0);
  const lastDailyBudgetAlertRef = useRef<{ dateKey: string | null; exceeded: boolean }>({
    dateKey: null,
    exceeded: false,
  });

  const dateKeyLocal = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isSameLocalDay = (a: Date, b: Date) => {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };

  /* DERIVED VALUES */
  const income = baseIncome + incomeTxTotal;
  const balance = income - expenses;
  const remaining = budget - expenses;
  const progress = budget > 0 ? expenses / budget : 0;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 🔴 Listen to user profile (income/budget)
    const userUnsub = onSnapshot(
      doc(db1, "users", user.uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setBaseIncome(data.monthlyIncome || 0);
        const mb = Number(data.monthlyBudget || 0);
        const resolvedBudget = Number.isFinite(mb) ? mb : 0;
        setBudget(resolvedBudget);
        budgetRef.current = resolvedBudget;
      }
    );

    // 🔴 Listen to transactions in real-time
    const txQuery = query(
      collection(db1, "users", user.uid, "transactions"),
      where("type", "==", "expense")
    );

    const txUnsub = onSnapshot(txQuery, (snapshot) => {
      let total = 0;
      let todayTotal = 0;
      const categoryTotals: Record<string, number> = {};
      const today = new Date();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const amount = Number(data.amount) || 0;
        const rawCategory = String(data.category || "Other").toLowerCase();
        const category = rawCategory === 'transport' ? 'travel' : rawCategory === 'bills' ? 'utilities' : rawCategory;

        const createdAt = data.createdAt?.toDate
          ? data.createdAt.toDate()
          : data.createdAt instanceof Date
            ? data.createdAt
            : null;
        if (createdAt && isSameLocalDay(createdAt, today)) {
          todayTotal += amount;
        }

        total += amount;
        categoryTotals[category] =
          (categoryTotals[category] || 0) + amount;
      });

      setExpenses(total);

      const currentBudget = budgetRef.current;
      if (currentBudget > 0) {
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const dailyBudget = currentBudget / Math.max(1, daysInMonth);
        const key = dateKeyLocal(today);
        const alertState = lastDailyBudgetAlertRef.current;

        if (alertState.dateKey !== key) {
          alertState.dateKey = key;
          alertState.exceeded = false;
        }

        if (!alertState.exceeded && todayTotal > dailyBudget) {
          alertState.exceeded = true;
          Alert.alert(
            "Daily budget exceeded",
            `Today's spending: ₹${Math.round(todayTotal).toLocaleString('en-IN')}
Daily limit: ₹${Math.round(dailyBudget).toLocaleString('en-IN')}`
          );
        }
      }

      const pieData = Object.entries(categoryTotals).map(
        ([category, amount]) => ({
          name: category.charAt(0).toUpperCase() + category.slice(1),
          amount,
          color: CATEGORY_COLORS[category] || "#CBD5E1",
          legendFontColor: "#555",
          legendFontSize: 12,
        })
      );

      setExpenseData(pieData);
    });

    const incomeQuery = query(
      collection(db1, "users", user.uid, "transactions"),
      where("type", "==", "income")
    );

    const incomeUnsub = onSnapshot(incomeQuery, (snapshot) => {
      let total = 0;
      snapshot.forEach((d) => {
        const data = d.data();
        total += Number(data.amount) || 0;
      });
      setIncomeTxTotal(total);
    });

    // 🧹 CLEANUP
    return () => {
      userUnsub();
      txUnsub();
      incomeUnsub();
    };
  }, []);

  const [fabModalVisible, setFabModalVisible] = useState(false);
  return (
    <SafeAreaView style={styles.container}>
       {/* <BackgroundDecor /> */}

      {/* TOP SECTION */}
      <View style={styles.topSection} >
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

      {/* CONTENT */}
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

        {/* CHART */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>This Month Spending</Text>

          <PieChart
            data={expenseData}
            width={width - 40}
            height={180}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="-2"
            absolute
            chartConfig={{
              color: () => "#000",
            }}
          />
        </View>

        {/* BUDGET */}
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

      {/* ADD EXPENSE */}
      <TouchableOpacity style={styles.fab} onPress={() => setFabModalVisible(true)} >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
      <ExpenseFabModal visible={fabModalVisible} onClose={() => setFabModalVisible(false)} />

      {/* BLUR OVERLAY */}
{menuOpen && (
  <TouchableOpacity
    activeOpacity={1}
    onPress={closeMenu}
    style={[
      StyleSheet.absoluteFillObject,
      { zIndex: 15 },
    ]}
  >
    <BlurView
      intensity={30}
      tint="light"
      style={StyleSheet.absoluteFillObject}
    />
  </TouchableOpacity>
)}


{/* SLIDING SIDE MENU */}
<Animated.View
  style={[
    styles.sideMenu,
    { transform: [{ translateX: slideAnim }] },
  ]}
>
  <Text style={styles.menuTitle}>Spenzia</Text>

  <MenuItem
    icon="pulse-outline"
    label="Expense Heatmap"
    onPress={() => {
      closeMenu();
      router.push('/(tabs)/FinancialHeatMapScreen');
    }}
  />
  <MenuItem icon="list-outline" label="Recent Transactions" 
  onPress={() => {closeMenu(); router.push('../(auth)/RecentTransaction')} }/>
  
  <MenuItem
    icon="folder-outline"
    label="Category Manager"
    onPress={() => {
      closeMenu();
      router.push('/(tabs)/CategoryManager');
    }}
  />
  <MenuItem
    icon="analytics-outline"
    label="Prediction"
    onPress={() => {
      closeMenu();
      router.push('/(tabs)/Prediction');
    }}
  />
  <MenuItem
    icon="wallet-outline"
    label="Savings Goal"
    onPress={() => {
      closeMenu();
      router.push('/savingGoals');
    }}
  />
  <MenuItem icon="stats-chart-outline" label="Monthly Reports" />
  <MenuItem icon="trending-up-outline" label="Spending Insights"
  onPress={() => {closeMenu(); router.push('../(auth)/SpendingInsights')} } /> 
  <MenuItem
    icon="alert-circle-outline"
    label="Alerts"
    onPress={() => {
      closeMenu();
      router.push("/(tabs)/Alerts");
    }}
  />

</Animated.View>

  </SafeAreaView>
);

}

function MenuItem({ icon, label, onPress }: any) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
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
    position: "relative",
  },

  topSection: {
    height: height * 0.30,
    backgroundColor: "#213c74ff",
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 16,
    zIndex: 1,
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
    zIndex: 1,
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
    backgroundColor: "#213c74ff",
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
    bottom: 25,
    right: 24,
    backgroundColor: "#213c74ff",
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    zIndex: 30,    
  },

  sideMenu: {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: MENU_WIDTH,
  backgroundColor: "#f2f8fbff",
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