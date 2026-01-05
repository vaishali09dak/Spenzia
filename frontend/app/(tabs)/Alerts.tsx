import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { auth, db1 } from "../../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { format, isValid, parse } from "date-fns";

type ReminderKind = "bill" | "loan" | "emi" | "other";

type Reminder = {
  id: string;
  kind: ReminderKind;
  title: string;
  amount?: number | null;
  dueAt?: any;
  createdAt?: any;
  notificationId?: string | null;
};

const BG = "#FFF9F2";
const PRIMARY = "#213c74ff";

const toDateSafe = (v: any) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const kindLabel = (k: ReminderKind) => {
  if (k === "bill") return "Bill";
  if (k === "loan") return "Loan";
  if (k === "emi") return "EMI";
  return "Other";
};

async function scheduleLocalNotificationIfAvailable(params: {
  title: string;
  kind: ReminderKind;
  dueAt: Date;
}): Promise<string | null> {
  try {
    const perms = await Notifications.getPermissionsAsync();
    if (perms.status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return null;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        sound: "default",
      });
    }

    const now = new Date();
    const triggerDate =
      params.dueAt.getTime() <= now.getTime() + 30_000 ? new Date(now.getTime() + 60_000) : params.dueAt;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${kindLabel(params.kind)} Reminder`,
        body: `${params.title} is due on ${format(params.dueAt, "dd MMM yyyy")}`,
        sound: true,
      },
      trigger: {
        date: triggerDate,
        channelId: "default",
      },
    });

    return id;
  } catch (e) {
    return null;
  }
}

async function cancelLocalNotificationIfAvailable(notificationId: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    return;
  }
}

export default function Alerts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  const [kind, setKind] = useState<ReminderKind>("bill");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDateStr, setDueDateStr] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }

    const ref = collection(db1, "users", user.uid, "reminders");
    const q = query(ref, orderBy("dueAt", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Reminder[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
        setReminders(list);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return unsub;
  }, []);

  const parsedDueDate = useMemo(() => {
    const s = String(dueDateStr || "").trim();
    if (!s) return null;

    const dt = parse(s, "dd/MM/yyyy", new Date());
    if (!isValid(dt)) return null;

    dt.setHours(9, 0, 0, 0);
    return dt;
  }, [dueDateStr]);

  const createReminder = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please login to add reminders.");
      return;
    }

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert("Missing title", "Please enter a title (e.g. Electricity Bill)");
      return;
    }

    if (!parsedDueDate) {
      Alert.alert("Invalid date", "Please enter a valid date in DD/MM/YYYY format.");
      return;
    }

    const amt = amount.trim() ? Number(amount) : null;
    if (amount.trim() && !Number.isFinite(amt)) {
      Alert.alert("Invalid amount", "Please enter a valid number.");
      return;
    }

    setSaving(true);
    try {
      const ref = collection(db1, "users", user.uid, "reminders");
      const res = await addDoc(ref, {
        kind,
        title: cleanTitle,
        amount: amt,
        dueAt: Timestamp.fromDate(parsedDueDate),
        createdAt: serverTimestamp(),
        notificationId: null,
      });

      const notificationId = await scheduleLocalNotificationIfAvailable({
        title: cleanTitle,
        kind,
        dueAt: parsedDueDate,
      });

      if (notificationId) {
        await updateDoc(doc(db1, "users", user.uid, "reminders", res.id), {
          notificationId,
        });
      }

      setTitle("");
      setAmount("");
      setDueDateStr("");
      setComposerOpen(false);
    } catch (e: any) {
      Alert.alert("Failed", String(e?.message ?? e));
    } finally {
      setSaving(false);
    }
  };

  const deleteReminder = async (r: Reminder) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      if (r.notificationId) {
        await cancelLocalNotificationIfAvailable(r.notificationId);
      }
      await deleteDoc(doc(db1, "users", user.uid, "reminders", r.id));
    } catch (e: any) {
      Alert.alert("Delete failed", String(e?.message ?? e));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY} />
          </TouchableOpacity>
          <View style={{ width: 48 }} />
        </View>

        <Text style={styles.headerTitle}>Alerts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Loading reminders...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.cardHeaderRow} onPress={() => setComposerOpen((v) => !v)}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardTitle}>Add Reminder</Text>
                <Text style={styles.cardSubTitle}>Create bills, loan or EMI reminders</Text>
              </View>
              <Ionicons
                name={composerOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="rgba(0,0,0,0.55)"
              />
            </TouchableOpacity>

            {composerOpen ? (
              <View style={styles.composerBody}>
                <View style={styles.kindRow}>
                  {(["bill", "loan", "emi", "other"] as ReminderKind[]).map((k) => {
                    const active = k === kind;
                    return (
                      <TouchableOpacity
                        key={k}
                        style={[styles.kindChip, active && styles.kindChipActive]}
                        onPress={() => setKind(k)}
                      >
                        <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>{kindLabel(k)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="document-text-outline" size={18} color={PRIMARY} />
                  </View>
                  <TextInput
                    style={styles.inputField}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="Title (e.g. Electricity Bill)"
                    placeholderTextColor="rgba(0,0,0,0.35)"
                  />
                </View>

                <View style={styles.twoColRow}>
                  <View style={styles.col}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputIcon}>
                        <Ionicons name="cash-outline" size={18} color={PRIMARY} />
                      </View>
                      <TextInput
                        style={styles.inputField}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="Amount"
                        keyboardType="numeric"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                      />
                    </View>
                  </View>

                  <View style={styles.col}>
                    <View style={styles.inputRow}>
                      <View style={styles.inputIcon}>
                        <Ionicons name="calendar-outline" size={18} color={PRIMARY} />
                      </View>
                      <TextInput
                        style={styles.inputField}
                        value={dueDateStr}
                        onChangeText={setDueDateStr}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor="rgba(0,0,0,0.35)"
                      />
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, saving && styles.primaryBtnDisabled]}
                  onPress={createReminder}
                  disabled={saving}
                >
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Reminder</Text>}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Reminders</Text>
            <Text style={styles.sectionSubTitle}>Bills, loans and EMI due dates</Text>
          </View>

          {reminders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="alert-circle-outline" size={34} color="#9CA3AF" />
              <Text style={styles.emptyText}>No reminders yet.</Text>
              <Text style={styles.emptyHint}>Open “Add Reminder” above to create one.</Text>
            </View>
          ) : (
            reminders.map((r) => {
              const due = toDateSafe(r.dueAt);
              const dueLabel = due ? format(due, "dd MMM yyyy") : "-";
              const overdue = due ? due.getTime() < Date.now() : false;

              const iconName =
                r.kind === "bill"
                  ? "flash-outline"
                  : r.kind === "loan"
                    ? "cash-outline"
                    : r.kind === "emi"
                      ? "card-outline"
                      : "options-outline";
              const iconBg = overdue ? "#FFF1F2" : "#E8EFFF";
              const iconColor = overdue ? "#C62828" : PRIMARY;

              return (
                <View key={r.id} style={styles.reminderCard}>
                  <View style={[styles.reminderIcon, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName as any} size={18} color={iconColor} />
                  </View>

                  <View style={styles.reminderBody}>
                    <Text style={styles.reminderTitle}>{r.title}</Text>
                    <Text style={styles.reminderMeta}>
                      {kindLabel(r.kind)} • Due {dueLabel}
                      {typeof r.amount === "number" ? ` • ₹${Number(r.amount).toLocaleString("en-IN")}` : ""}
                    </Text>
                    <View style={[styles.statusChip, overdue ? styles.statusChipOverdue : styles.statusChipUpcoming]}>
                      <Text
                        style={[
                          styles.statusChipText,
                          overdue ? styles.statusChipTextOverdue : styles.statusChipTextUpcoming,
                        ]}
                      >
                        {overdue ? "Overdue" : "Upcoming"}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity style={styles.trashBtn} onPress={() => deleteReminder(r)}>
                    <Ionicons name="trash-outline" size={18} color="#C62828" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1F305E",
  },
  iconButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#444",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    gap: 12,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2C3E7C",
    marginBottom: 0,
  },
  cardSubTitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardHeaderLeft: {
    flex: 1,
    paddingRight: 10,
  },
  composerBody: {
    marginTop: 14,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F8FC",
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  inputIcon: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#1F305E",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  sectionHeader: {
    marginTop: 14,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2C3E7C",
  },
  sectionSubTitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
    marginBottom: 6,
  },
  input: {
    height: 46,
    borderRadius: 14,
    backgroundColor: "#F7F8FC",
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    color: "#1F305E",
    marginBottom: 12,
  },
  kindRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  kindChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F7F8FC",
  },
  kindChipActive: {
    backgroundColor: "#E8EFFF",
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  kindChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(0,0,0,0.6)",
  },
  kindChipTextActive: {
    color: PRIMARY,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.7,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 8,
    color: "rgba(0,0,0,0.6)",
    fontWeight: "600",
  },
  emptyHint: {
    marginTop: 6,
    color: "rgba(0,0,0,0.45)",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  reminderCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  reminderIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reminderBody: {
    flex: 1,
    paddingRight: 10,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1F305E",
  },
  reminderMeta: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  statusChip: {
    marginTop: 10,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "900",
  },
  statusChipUpcoming: {
    backgroundColor: "#E8EFFF",
  },
  statusChipOverdue: {
    backgroundColor: "#FEE2E2",
  },
  statusChipTextUpcoming: {
    color: PRIMARY,
  },
  statusChipTextOverdue: {
    color: "#C62828",
  },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF1F2",
    alignItems: "center",
    justifyContent: "center",
  },
});
