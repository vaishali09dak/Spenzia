import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db1 } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";

const PRIMARY = "#1F305E";
const BG = "#FFF9F2";
const GOLD = "#D4AF37";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  achieved?: boolean;
};

export default function SavingGoals() {
  const [user, setUser] = useState(auth.currentUser);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalName, setGoalName] = useState("");
  const [amount, setAmount] = useState("");
  const [addAmounts, setAddAmounts] = useState<Record<string, string>>({});
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAchievedModal, setShowAchievedModal] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db1, "users", user.uid, "savingGoals"),
      orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
      const data: Goal[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setGoals(data);
    });
  }, [user?.uid]);

  const addGoal = async () => {
    if (!goalName || !amount || !user) return;

    await addDoc(collection(db1, "users", user.uid, "savingGoals"), {
      name: goalName,
      targetAmount: Number(amount),
      savedAmount: 0,
      achieved: false,
      createdAt: new Date(),
    });

    setGoalName("");
    setAmount("");
    setShowAddGoal(false);
  };

  const addMoneyToGoal = async (goal: Goal) => {
    if (!user) return;

    const value = Number(addAmounts[goal.id]);
    if (!value || value <= 0) return;

    const userSnap = await getDoc(doc(db1, "users", user.uid));
    if (!userSnap.exists()) return;

    const { monthlyIncome = 0, monthlyBudget = 0 } = userSnap.data();
    const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const available = monthlyIncome - monthlyBudget - totalSaved;

    if (value > available) {
      Alert.alert("Insufficient balance", `Available to save: ₹${available}`);
      return;
    }

    const newSaved = goal.savedAmount + value;

    await updateDoc(
      doc(db1, "users", user.uid, "savingGoals", goal.id),
      {
        savedAmount: newSaved,
        achieved: newSaved >= goal.targetAmount,
      }
    );

    if (newSaved >= goal.targetAmount) {
      Alert.alert("🎉 Goal Achieved!", goal.name);
    }

    setAddAmounts((p) => ({ ...p, [goal.id]: "" }));
  };

  const activeGoals = goals.filter((g) => !g.achieved);
  const achievedGoals = goals.filter((g) => g.achieved);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.title}>Saving Goals</Text>
        </View>

        {/* ADD GOAL (CONNECTED DROPDOWN) */}
        <View style={[styles.addGoalContainer, styles.shadow]}>
          <TouchableOpacity
            style={styles.addGoalHeader}
            onPress={() => setShowAddGoal((p) => !p)}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.addGoalTitle}>Add Goal</Text>
              <Text style={styles.addGoalSub}>Create a saving target</Text>
            </View>
            <Ionicons
              name={showAddGoal ? "chevron-up" : "chevron-down"}
              size={22}
              color={PRIMARY}
            />
          </TouchableOpacity>

          {showAddGoal && (
            <View style={styles.addGoalBody}>
              <TextInput
                placeholder="Goal name"
                style={styles.input}
                value={goalName}
                onChangeText={setGoalName}
              />
              <TextInput
                placeholder="Target amount (₹)"
                style={styles.input}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
              <TouchableOpacity style={styles.button} onPress={addGoal}>
                <Text style={styles.buttonText}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ACTIVE GOALS */}
        <Text style={styles.sectionTitle}>Your Goals</Text>

        {activeGoals.map((goal) => {
          const progress = Math.min(
            (goal.savedAmount / goal.targetAmount) * 100,
            100
          );

          return (
            <View key={goal.id} style={[styles.goalCard, styles.shadow]}>
              <Text style={styles.goalName}>{goal.name}</Text>
              <Text style={styles.goalAmount}>
                ₹{goal.savedAmount} / ₹{goal.targetAmount}
              </Text>

              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>

              <View style={styles.addMoneyRow}>
                <TextInput
                  placeholder="₹ Amount"
                  keyboardType="numeric"
                  style={styles.addInput}
                  value={addAmounts[goal.id] || ""}
                  onChangeText={(t) =>
                    setAddAmounts((p) => ({ ...p, [goal.id]: t }))
                  }
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => addMoneyToGoal(goal)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* TROPHY FAB */}
      {achievedGoals.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAchievedModal(true)}
        >
          <Ionicons name="trophy" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* ACHIEVED GOALS MODAL */}
      <Modal visible={showAchievedModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Goals Achieved</Text>
            <TouchableOpacity onPress={() => setShowAchievedModal(false)}>
              <Ionicons name="close" size={24} />
            </TouchableOpacity>
          </View>

          {achievedGoals.map((g) => (
            <View key={g.id} style={styles.completedCard}>
              <Ionicons name="trophy-outline" size={22} color={GOLD} />
              <View>
                <Text style={styles.goalName}>{g.name}</Text>
                <Text style={styles.goalAmount}>
                  Target ₹{g.targetAmount}
                </Text>
              </View>
            </View>
          ))}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, padding: 16 },

  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "900", color: PRIMARY },

  addGoalContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginTop: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  addGoalHeader: {
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addGoalTitle: { fontSize: 16, fontWeight: "700", color: PRIMARY },
  addGoalSub: { fontSize: 12, color: "#666", marginTop: 2 },
  addGoalBody: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },

  input: {
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: PRIMARY,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: PRIMARY,
    marginBottom: 10,
  },

  goalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  goalName: { fontWeight: "700", color: PRIMARY },
  goalAmount: { color: "#666", marginVertical: 6 },

  progressBar: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 8,
  },
  progressFill: {
    height: 8,
    backgroundColor: PRIMARY,
    borderRadius: 8,
  },

  addMoneyRow: { flexDirection: "row", marginTop: 12 },
  addInput: {
    flex: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },

  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  modal: { flex: 1, padding: 16 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 22, fontWeight: "800" },

  completedCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFF8E1",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },

  shadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
});