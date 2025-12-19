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
  doc,
  updateDoc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";



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
  const [addAmounts, setAddAmounts] = useState<{ [key: string]: string }>({});
  const [user, setUser] = useState(auth.currentUser);
  const getTotalSaved = () => {
  return goals.reduce((sum, goal) => sum + goal.savedAmount, 0);
};

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

  const addMoneyToGoal = async (goal: Goal) => {
  if (!user) return;

  const amountStr = addAmounts[goal.id];
  if (!amountStr) return;

  const amountToAdd = Number(amountStr);
  if (amountToAdd <= 0) return;

  try {
    const userRef = doc(db1, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const monthlyIncome = Number(userSnap.data().monthlyIncome || 0);
    const monthlyBudget = Number(userSnap.data().monthlyBudget || 0);

    const totalSaved = getTotalSaved();
    const availableToSave =
      monthlyIncome - monthlyBudget - totalSaved;

    if (availableToSave < amountToAdd) {
      Alert.alert(
        "Insufficient balance",
        `Available to save: ₹${availableToSave}`
      );
      return;
    }

    const goalRef = doc(
      db1,
      "users",
      user.uid,
      "savingGoals",
      goal.id
    );

    await updateDoc(goalRef, {
      savedAmount: goal.savedAmount + amountToAdd,
    });

    setAddAmounts((prev) => ({
      ...prev,
      [goal.id]: "",
    }));
  } catch (err) {
    console.log(err);
  }
};

  return (
    
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
  <TouchableOpacity onPress={() => router.back()}>
    <Ionicons name="arrow-back" size={24} color={PRIMARY} />
  </TouchableOpacity>
</View>


        <Text style={styles.title}>Saving Goals</Text>
        {/* <Text style={styles.subtitle}>
          Plan today. Relax tomorrow.
        </Text> */}

        {/* ADD GOAL */}
        <View style={[styles.card, styles.cardShadow]}>

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
    <View key={goal.id} style={[styles.goalCard, styles.cardShadow]}>

      <Text style={styles.goalName}>{goal.name}</Text>

      <Text style={styles.amountText}>
        ₹{goal.savedAmount} / ₹{goal.targetAmount}
      </Text>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(progress * 100, 100)}%`,
            },
          ]}
        />
      </View>

      {/* ADD MONEY INPUT */}
      <View style={styles.addMoneyRow}>
  <TextInput
    placeholder="₹ Amount"
    style={styles.addMoneyInput}
    keyboardType="numeric"
    value={addAmounts[goal.id] || ""}
onChangeText={(text) =>
  setAddAmounts((prev) => ({
    ...prev,
    [goal.id]: text,
  }))
}

  />

  <TouchableOpacity
    style={styles.addMoneyBtn}
    onPress={() => addMoneyToGoal(goal)}
  >
    <Ionicons name="add" size={22} color="#fff" />
  </TouchableOpacity>
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
    marginTop: 10,
    fontSize: 34,
    fontWeight: '900',
    color: '#1F305E',
    letterSpacing: 0.2,
    marginBottom: 30,
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
  addMoneyRow: {
  flexDirection: "row",
  alignItems: "center",
  marginTop: 12,
},

addMoneyInput: {
  flex: 1,
  backgroundColor: "#F2F2F2",
  borderRadius: 10,
  paddingVertical: 10,
  paddingHorizontal: 12,
  marginRight: 10,
},

addMoneyBtn: {
  backgroundColor: PRIMARY,
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: "center",
  justifyContent: "center",
},
header: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 10,
},
cardShadow: {
  // iOS shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,

  // Android shadow
  elevation: 6,
},


});
