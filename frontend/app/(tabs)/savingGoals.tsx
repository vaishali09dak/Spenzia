import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db1 } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

const PRIMARY = "#1F305E";
const BG = "#FFF9F2";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
};

export default function SavingGoals() {
  const [goalName, setGoalName] = useState("");
  const [amount, setAmount] = useState("");
  const [goals, setGoals] = useState<Goal[]>([]);

  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });

    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db1, "users", user.uid, "savingGoals"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data: Goal[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Goal, "id">),
      }));
      setGoals(data);
    });

    return unsub;
  }, [user?.uid]);

  const addGoal = async () => {
    if (!goalName || !amount) return;
    if (!user) return;

    await addDoc(
      collection(db1, "users", user.uid, "savingGoals"),
      {
        name: goalName,
        targetAmount: Number(amount),
        savedAmount: 0,
        createdAt: new Date(),
      }
    );

    setGoalName("");
    setAmount("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Saving Goals</Text>
        <Text style={styles.subtitle}>
          Plan today. Relax tomorrow.
        </Text>

        {/* ADD GOAL */}
        <View style={styles.card}>
          <TextInput
            placeholder="Goal name (e.g. Trip to Goa)"
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

        {/* GOALS LIST */}
        {goals.map((goal) => {
          const progress =
            goal.savedAmount / goal.targetAmount;

          return (
            <View key={goal.id} style={styles.goalCard}>
              <Text style={styles.goalName}>{goal.name}</Text>
              <Text style={styles.amountText}>
                ₹{goal.savedAmount} / ₹{goal.targetAmount}
              </Text>

              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: PRIMARY,
  },
  subtitle: {
    color: "#666",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
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
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  goalCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: PRIMARY,
  },
  amountText: {
    color: "#666",
    marginVertical: 6,
  },
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
});
