import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db1 } from "../../firebase";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { LineChart, PieChart } from "react-native-chart-kit";
import { router } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const { width } = Dimensions.get("window");

const CONTENT_PADDING = 20;
const CARD_PADDING = 18;
const CHART_WIDTH = width - CONTENT_PADDING * 2 - CARD_PADDING * 2;

const BG = "#FFF9F2";
const PRIMARY = "#213c74ff";

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

type Txn = {
  id: string;
  type?: string;
  amount?: number;
  category?: string;
  createdAt?: any;
};

const toDateSafe = (v: any) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

const normalizeCategoryKey = (raw: any) => {
  const s = String(raw ?? "").trim();
  if (!s) return "other";
  const key = s.toLowerCase();
  if (key === "transport") return "travel";
  if (key === "bills") return "utilities";
  return key;
};

export default function MonthlyReport() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [transactions, setTransactions] = useState<Txn[]>([]);
  const [baseIncome, setBaseIncome] = useState(0);
  const [monthDate, setMonthDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const monthLabel = useMemo(() => {
    return monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [monthDate]);

  const monthStart = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), [monthDate]);
  const monthEnd = useMemo(() => new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1), [monthDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setTransactions([]);
        setBaseIncome(0);
        return;
      }

      const userSnap = await getDoc(doc(db1, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data() as any;
        setBaseIncome(Number(data?.monthlyIncome) || 0);
      } else {
        setBaseIncome(0);
      }

      const transactionsRef = collection(db1, "users", user.uid, "transactions");
      const q = query(transactionsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const txns: Txn[] = [];
      snap.forEach((d) => {
        txns.push({ id: d.id, ...(d.data() as any) });
      });

      setTransactions(txns);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const dt = toDateSafe(t.createdAt);
      if (!dt) return false;
      return dt >= monthStart && dt < monthEnd;
    });
  }, [transactions, monthStart, monthEnd]);

  const totals = useMemo(() => {
    let income = 0;
    let expenses = 0;

    filtered.forEach((t) => {
      const amount = Number(t.amount) || 0;
      if (t.type === "income") income += amount;
      if (t.type === "expense") expenses += amount;
    });

    const totalIncome = (Number(baseIncome) || 0) + income;
    return { income: totalIncome, expenses, net: totalIncome - expenses };
  }, [filtered, baseIncome]);

  const categoryPie = useMemo(() => {
    const totalsByCategory: Record<string, number> = {};

    filtered.forEach((t) => {
      if (t.type !== "expense") return;
      const amount = Number(t.amount) || 0;
      const key = normalizeCategoryKey(t.category);
      totalsByCategory[key] = (totalsByCategory[key] || 0) + amount;
    });

    return Object.entries(totalsByCategory)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, amount]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        amount,
        color: CATEGORY_COLORS[key] || "#CBD5E1",
        legendFontColor: "#555",
        legendFontSize: 12,
      }));
  }, [filtered]);

  const dailySeries = useMemo(() => {
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
    const data = Array.from({ length: daysInMonth }, () => 0);

    filtered.forEach((t) => {
      if (t.type !== "expense") return;
      const dt = toDateSafe(t.createdAt);
      if (!dt) return;
      const dayIndex = dt.getDate() - 1;
      if (dayIndex < 0 || dayIndex >= data.length) return;
      data[dayIndex] += Number(t.amount) || 0;
    });
    const labels = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const show = day === 1 || day === daysInMonth || day % 7 === 0;
      return show ? String(day) : "";
    });

    return { labels, data };
  }, [filtered, monthDate]);

  const dailyChartWidth = useMemo(() => {
    const points = dailySeries.data.length;
    return Math.max(CHART_WIDTH, points * 18);
  }, [dailySeries.data.length]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const goPrevMonth = () => {
    setMonthDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };

  const goNextMonth = () => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    if (next > currentMonthStart) return;
    setMonthDate(next);
  };

  const nextMonthDisabled = useMemo(() => {
    const next = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return next > currentMonthStart;
  }, [monthDate]);

  const exportPdf = async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "PDF export is not supported on web.");
      return;
    }

    try {
      setExporting(true);

      const topCategories = categoryPie
        .slice(0, 6)
        .map((c) => ({ name: String((c as any).name ?? ""), amount: Number((c as any).amount) || 0 }));

      const maxCategoryAmount = topCategories.reduce((m, c) => (c.amount > m ? c.amount : m), 0);

      const dailyNonZero = dailySeries.data
        .map((amt, idx) => ({ day: idx + 1, amount: Number(amt) || 0 }))
        .filter((d) => d.amount > 0);

      const formatCurrency = (n: number) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
      const esc = (s: any) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif; padding: 20px; color: #111; }
              .title { font-size: 20px; font-weight: 700; color: #213c74; margin-bottom: 6px; }
              .subtitle { color: #666; margin-bottom: 16px; }
              .row { display: flex; gap: 12px; flex-wrap: wrap; }
              .card { border: 1px solid #eee; border-radius: 12px; padding: 12px; min-width: 160px; }
              .label { color: #777; font-size: 12px; }
              .value { font-size: 16px; font-weight: 700; margin-top: 6px; }
              .section { margin-top: 18px; }
              .sectionTitle { font-size: 14px; font-weight: 700; margin-bottom: 10px; }
              .barRow { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
              .barLabel { width: 110px; font-size: 12px; color: #333; }
              .barTrack { flex: 1; height: 10px; background: #E6ECFF; border-radius: 999px; overflow: hidden; }
              .barFill { height: 100%; background: #213c74; }
              .barValue { width: 90px; text-align: right; font-size: 12px; color: #333; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border-bottom: 1px solid #eee; padding: 8px 6px; text-align: left; font-size: 12px; }
              th { color: #444; }
              .right { text-align: right; }
            </style>
          </head>
          <body>
            <div class="title">Monthly Report</div>
            <div class="subtitle">${esc(monthLabel)}</div>

            <div class="row">
              <div class="card"><div class="label">Income</div><div class="value" style="color:#2E7D32;">${formatCurrency(totals.income)}</div></div>
              <div class="card"><div class="label">Expenses</div><div class="value" style="color:#C62828;">${formatCurrency(totals.expenses)}</div></div>
              <div class="card"><div class="label">Net</div><div class="value" style="color:${totals.net >= 0 ? "#2E7D32" : "#C62828"};">${formatCurrency(totals.net)}</div></div>
            </div>

            <div class="section">
              <div class="sectionTitle">Top Categories</div>
              ${topCategories.length ? `
                ${topCategories
                  .map((c) => {
                    const pct = maxCategoryAmount > 0 ? Math.round((c.amount / maxCategoryAmount) * 100) : 0;
                    return `
                      <div class="barRow">
                        <div class="barLabel">${esc(c.name)}</div>
                        <div class="barTrack"><div class="barFill" style="width:${pct}%;"></div></div>
                        <div class="barValue">${formatCurrency(c.amount)}</div>
                      </div>
                    `;
                  })
                  .join("")}
              ` : `<div style="color:#666;">No expense data for this month.</div>`}
            </div>

            <div class="section">
              <div class="sectionTitle">Daily Spending (non-zero days)</div>
              ${dailyNonZero.length ? `
                <table>
                  <thead><tr><th>Day</th><th class="right">Amount</th></tr></thead>
                  <tbody>
                    ${dailyNonZero
                      .map((d) => `<tr><td>${d.day}</td><td class="right">${formatCurrency(d.amount)}</td></tr>`)
                      .join("")}
                  </tbody>
                </table>
              ` : `<div style="color:#666;">No daily spending data for this month.</div>`}
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Saved", `PDF generated at:\n${uri}`);
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: "Export Monthly Report",
      });
    } catch (e: any) {
      Alert.alert("Export failed", String(e?.message ?? e));
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={BG} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text style={styles.loadingText}>Generating report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, exporting && styles.iconButtonDisabled]}
            onPress={exportPdf}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={PRIMARY} />
            ) : (
              <Ionicons name="download-outline" size={22} color={PRIMARY} />
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.headerTitle}>Monthly Report</Text>
        <Text style={styles.headerSubtitle}>{monthLabel}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PRIMARY]} />}
      >
        <View style={styles.monthPickerCard}>
          <TouchableOpacity style={styles.monthNavBtn} onPress={goPrevMonth}>
            <Ionicons name="chevron-back" size={20} color={PRIMARY} />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text style={styles.monthPickerLabel}>{monthLabel}</Text>
            {/* <Text style={styles.monthPickerHint}>Use arrows to change month</Text> */}
          </View>
          <TouchableOpacity
            style={[styles.monthNavBtn, nextMonthDisabled && styles.monthNavBtnDisabled]}
            onPress={goNextMonth}
            disabled={nextMonthDisabled}
          >
            <Ionicons name="chevron-forward" size={20} color={PRIMARY} />
          </TouchableOpacity>
        </View>

        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <View style={styles.overviewIconContainer}>
              <Ionicons name="trending-up" size={22} color="#2E7D32" />
            </View>
            <Text style={styles.overviewLabel}>Income</Text>
            <Text style={[styles.overviewValue, { color: "#2E7D32" }]}>
              ₹{totals.income.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.overviewIconContainer}>
              <Ionicons name="trending-down" size={22} color="#C62828" />
            </View>
            <Text style={styles.overviewLabel}>Expenses</Text>
            <Text style={[styles.overviewValue, { color: "#C62828" }]}>
              ₹{totals.expenses.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        <View style={styles.netCard}>
          <View style={styles.netLeft}>
            <Text style={styles.netLabel}>Net</Text>
            <Text style={styles.netSubLabel}>Income - Expenses</Text>
          </View>
          <Text style={[styles.netValue, { color: totals.net >= 0 ? "#2E7D32" : "#C62828" }]}>
            ₹{totals.net.toLocaleString("en-IN")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          <View style={styles.sectionCard}>

            {categoryPie.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="pie-chart-outline" size={34} color="#9CA3AF" />
                <Text style={styles.emptyText}>No expense data for this month.</Text>
              </View>
            ) : (
              <PieChart
                data={categoryPie as any}
                width={CHART_WIDTH}
                height={200}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="0"
                center={[10, 0]}
                absolute
                chartConfig={{
                  color: () => "#000",
                }}
                style={{ alignSelf: "center" }}
              />
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Spending</Text>
          <View style={styles.sectionCard}>
            {dailySeries.data.every((v) => v === 0) ? (
              <View style={styles.emptyState}>
                <Ionicons name="analytics-outline" size={34} color="#9CA3AF" />
                <Text style={styles.emptyText}>No daily spending data for this month.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chartScrollContent}
              >
                <LineChart
                  data={{
                    labels: dailySeries.labels,
                    datasets: [{ data: dailySeries.data }],
                  }}
                  width={dailyChartWidth}
                  height={220}
                  withDots={false}
                  withInnerLines={false}
                  withOuterLines={false}
                  fromZero
                  segments={4}
                  yAxisLabel="₹"
                  xLabelsOffset={-2}
                  verticalLabelRotation={0}
                  chartConfig={{
                    backgroundColor: "#fff",
                    backgroundGradientFrom: "#fff",
                    backgroundGradientTo: "#fff",
                    decimalPlaces: 0,
                    color: () => PRIMARY,
                    labelColor: () => "#777",
                    formatYLabel: (y) => {
                      const n = Number(y);
                      return Number.isFinite(n) ? String(Math.round(n)) : String(y);
                    },
                    propsForBackgroundLines: {
                      stroke: "#E6ECFF",
                    },
                  }}
                  style={styles.lineChart}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#444",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
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
  iconButtonDisabled: {
    opacity: 0.6,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "#1F305E",
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(0,0,0,0.55)",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  monthPickerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 14,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  monthNavBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F8FC",
  },
  monthNavBtnDisabled: {
    opacity: 0.45,
  },
  monthCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  monthPickerLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F305E",
  },
  monthPickerHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0,0,0,0.5)",
  },
  overviewContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#E8EFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  overviewLabel: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "600",
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2C3E7C",
  },
  netCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 18,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  netLeft: {
    flex: 1,
    marginRight: 12,
  },
  netLabel: {
    fontSize: 13,
    color: "#8E8E93",
    fontWeight: "700",
  },
  netSubLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "rgba(0,0,0,0.55)",
    fontWeight: "600",
  },
  netValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#2C3E7C",
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 18,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  emptyText: {
    marginTop: 8,
    color: "rgba(0,0,0,0.6)",
    fontWeight: "600",
  },
  lineChart: {
    borderRadius: 16,
  },
  chartScrollContent: {
    paddingRight: 4,
  },
});
