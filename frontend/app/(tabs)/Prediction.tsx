import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db1 } from "../../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { LineChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const BG = "#FFF9F2";
const PRIMARY = "#213c74ff";
const { width } = Dimensions.get("window");

const toDateSafe = (v: any) => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

type MonthPoint = {
  key: string;
  date: Date;
  labelShort: string;
  labelFull: string;
  total: number;
};

const monthKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
};

const addMonths = (d: Date, delta: number) => {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
};

const monthLabelShort = (d: Date) => {
  return d.toLocaleDateString("en-IN", { month: "short" });
};

const monthLabelFull = (d: Date) => {
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const mean = (arr: number[]) => {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
};

const stdDev = (arr: number[]) => {
  if (arr.length <= 1) return 0;
  const m = mean(arr);
  const variance = mean(arr.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
};

export default function Prediction() {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<MonthPoint[]>([]);
  const [windowSize, setWindowSize] = useState<3 | 6>(3);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [monthCategoryTotals, setMonthCategoryTotals] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) {
          setPoints([]);
          setMonthCategoryTotals({});
          setSelectedKey(null);
          return;
        }

        const txRef = collection(db1, "users", user.uid, "transactions");
        const q = query(txRef, where("type", "==", "expense"));
        const snap = await getDocs(q);

        const totals = new Map<string, number>();
        const monthDates = new Map<string, Date>();
        const byMonthCategory = new Map<string, Map<string, number>>();

        snap.forEach((d) => {
          const data: any = d.data();
          const createdAt = toDateSafe(data.createdAt);
          if (!createdAt) return;

          const amount = Number(data.amount) || 0;
          if (!Number.isFinite(amount) || amount <= 0) return;

          const key = monthKey(createdAt);
          totals.set(key, (totals.get(key) || 0) + amount);

          const categoryRaw = String(data.category || "Other").trim();
          const category = categoryRaw ? categoryRaw : "Other";
          if (!byMonthCategory.has(key)) byMonthCategory.set(key, new Map());
          const catMap = byMonthCategory.get(key)!;
          catMap.set(category, (catMap.get(category) || 0) + amount);

          if (!monthDates.has(key)) {
            monthDates.set(key, new Date(createdAt.getFullYear(), createdAt.getMonth(), 1));
          }
        });

        const sortedKeys = Array.from(totals.keys()).sort();
        const lastKeys = sortedKeys.slice(-12);

        const monthPoints: MonthPoint[] = lastKeys
          .map((k) => {
            const dt = monthDates.get(k) || new Date(`${k}-01T00:00:00`);
            return {
              key: k,
              date: dt,
              labelShort: monthLabelShort(dt),
              labelFull: monthLabelFull(dt),
              total: Math.round(totals.get(k) || 0),
            };
          })
          .filter((p) => p.total >= 0);

        setPoints(monthPoints);

        const byMonthCategoryObj: Record<string, Record<string, number>> = {};
        for (const [k, cmap] of byMonthCategory.entries()) {
          byMonthCategoryObj[k] = {};
          for (const [cat, amt] of cmap.entries()) {
            byMonthCategoryObj[k][cat] = Math.round(amt);
          }
        }
        setMonthCategoryTotals(byMonthCategoryObj);

        const newest = monthPoints[monthPoints.length - 1]?.key ?? null;
        setSelectedKey((prev) => prev ?? newest);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const displayedPoints = useMemo(() => {
    return points.slice(-windowSize);
  }, [points, windowSize]);

  const lastActualDate = useMemo(() => {
    return displayedPoints.length ? displayedPoints[displayedPoints.length - 1].date : null;
  }, [displayedPoints]);

  const forecastMonthDate = useMemo(() => {
    return lastActualDate ? addMonths(lastActualDate, 1) : null;
  }, [lastActualDate]);

  const forecast = useMemo(() => {
    const vals = displayedPoints.map((p) => p.total);
    const window = vals.slice(-windowSize);
    const avg = mean(window);
    const sd = stdDev(window);

    const predicted = Math.max(0, Math.round(avg));
    const low = Math.max(0, Math.round(predicted - sd));
    const high = Math.max(0, Math.round(predicted + sd));

    return { predicted, avg: Math.round(avg), low, high, sd: Math.round(sd) };
  }, [displayedPoints, windowSize]);

  const chartData = useMemo(() => {
    const labels = displayedPoints.map((p) => p.labelShort);
    const data = displayedPoints.map((p) => p.total);

    if (displayedPoints.length) {
      labels.push("Next");
      data.push(forecast.predicted);
    }

    return { labels, data };
  }, [displayedPoints, forecast.predicted]);

  const selectedPoint = useMemo(() => {
    if (!selectedKey) return null;
    return points.find((p) => p.key === selectedKey) ?? null;
  }, [points, selectedKey]);

  const selectedMoM = useMemo(() => {
    if (!selectedPoint) return null;
    const idx = points.findIndex((p) => p.key === selectedPoint.key);
    if (idx <= 0) return null;
    const prev = points[idx - 1];
    if (!prev || prev.total <= 0) return null;
    const pct = ((selectedPoint.total - prev.total) / prev.total) * 100;
    return Math.round(pct * 10) / 10;
  }, [points, selectedPoint]);

  const selectedTopCategories = useMemo(() => {
    if (!selectedKey) return [] as Array<{ name: string; amount: number }>;
    const cats = monthCategoryTotals[selectedKey] || {};
    return Object.entries(cats)
      .map(([name, amount]) => ({ name, amount: Number(amount) || 0 }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthCategoryTotals, selectedKey]);

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

        <Text style={styles.headerTitle}>Prediction</Text>
        <Text style={styles.headerSubtitle}>Forecast next month spending from past expenses</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY} />
          <Text style={styles.loadingText}>Analyzing your spending...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {points.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="analytics-outline" size={34} color="#9CA3AF" />
              <Text style={styles.emptyText}>No expense history yet.</Text>
              <Text style={styles.emptyHint}>Add a few expenses to generate a forecast.</Text>
            </View>
          ) : (
            <>
              <View style={styles.controlsCard}>
                <Text style={styles.controlsTitle}>Forecast window</Text>
                <View style={styles.chipRow}>
                  {([3, 6] as const).map((n) => {
                    const active = n === windowSize;
                    return (
                      <TouchableOpacity
                        key={n}
                        style={[styles.chip, active && styles.chipActive]}
                        onPress={() => setWindowSize(n)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>Last {n} months</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>
                    {forecastMonthDate ? `Forecast • ${monthLabelFull(forecastMonthDate)}` : "Next Month Forecast"}
                  </Text>
                  <Text style={styles.metricValue}>₹{forecast.predicted.toLocaleString("en-IN")}</Text>
                  <Text style={styles.metricHint}>
                    Range: ₹{forecast.low.toLocaleString("en-IN")} - ₹{forecast.high.toLocaleString("en-IN")}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Text style={styles.metricLabel}>Avg (Window)</Text>
                  <Text style={styles.metricValue}>₹{forecast.avg.toLocaleString("en-IN")}</Text>
                  <Text style={styles.metricHint}>Volatility: ₹{forecast.sd.toLocaleString("en-IN")}</Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Monthly Spending Trend</Text>
                <LineChart
                  data={{
                    labels: chartData.labels,
                    datasets: [{ data: chartData.data }],
                  }}
                  width={Math.min(width - 40, 420)}
                  height={220}
                  fromZero
                  yAxisLabel="₹"
                  yAxisSuffix=""
                  withDots
                  withShadow
                  withInnerLines={false}
                  onDataPointClick={(p) => {
                    if (p.index >= displayedPoints.length) return;
                    const k = displayedPoints[p.index]?.key;
                    if (k) setSelectedKey(k);
                  }}
                  chartConfig={{
                    backgroundGradientFrom: "#FFFFFF",
                    backgroundGradientTo: "#FFFFFF",
                    decimalPlaces: 0,
                    color: () => PRIMARY,
                    labelColor: () => "rgba(0,0,0,0.6)",
                    propsForDots: {
                      r: "4",
                      strokeWidth: "2",
                      stroke: PRIMARY,
                    },
                  }}
                  style={styles.chart}
                />
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Selected Month</Text>
                <View style={styles.selectedRow}>
                  <Text style={styles.selectedMonth}>
                    {selectedPoint ? selectedPoint.labelFull : "—"}
                  </Text>
                  <Text style={styles.selectedAmount}>
                    {selectedPoint ? `₹${selectedPoint.total.toLocaleString("en-IN")}` : "—"}
                  </Text>
                </View>

                <View style={styles.selectedMetaRow}>
                  <Text style={styles.selectedMetaLabel}>Month-over-month</Text>
                  <Text
                    style={[
                      styles.selectedMetaValue,
                      typeof selectedMoM === "number" && selectedMoM < 0 ? styles.negative : styles.positive,
                    ]}
                  >
                    {typeof selectedMoM === "number" ? `${selectedMoM > 0 ? "+" : ""}${selectedMoM}%` : "—"}
                  </Text>
                </View>

                <Text style={styles.subSectionTitle}>Top categories</Text>
                {selectedTopCategories.length === 0 ? (
                  <Text style={styles.mutedText}>No category data for this month.</Text>
                ) : (
                  selectedTopCategories.map((c) => (
                    <View key={c.name} style={styles.catRow}>
                      <Text style={styles.catName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.catAmount}>₹{c.amount.toLocaleString("en-IN")}</Text>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderTitle}>Recent Months</Text>
                <Text style={styles.sectionHeaderSub}>Based on your recorded expenses</Text>
              </View>

              {points
                .slice()
                .reverse()
                .map((p) => (
                  <TouchableOpacity
                    key={p.key}
                    style={[styles.listRow, selectedKey === p.key && styles.listRowActive]}
                    onPress={() => setSelectedKey(p.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.listLabel}>{p.labelFull}</Text>
                    <Text style={styles.listValue}>₹{p.total.toLocaleString("en-IN")}</Text>
                  </TouchableOpacity>
                ))}
            </>
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1F305E",
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
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
  emptyText: {
    marginTop: 10,
    color: "rgba(0,0,0,0.6)",
    fontWeight: "700",
  },
  emptyHint: {
    marginTop: 6,
    color: "rgba(0,0,0,0.45)",
    fontWeight: "700",
    fontSize: 12,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  metricValue: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "900",
    color: "#1F305E",
  },
  metricHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2C3E7C",
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
  },
  controlsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(0,0,0,0.6)",
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#F7F8FC",
  },
  chipActive: {
    backgroundColor: "#E8EFFF",
    borderWidth: 1,
    borderColor: PRIMARY,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(0,0,0,0.6)",
  },
  chipTextActive: {
    color: PRIMARY,
  },
  sectionHeader: {
    marginTop: 10,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#2C3E7C",
  },
  sectionHeaderSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.55)",
  },
  listRow: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  listRowActive: {
    borderWidth: 1,
    borderColor: PRIMARY,
    shadowOpacity: 0.1,
  },
  listLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(0,0,0,0.6)",
    flex: 1,
    paddingRight: 10,
  },
  listValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1F305E",
  },

  selectedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedMonth: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1F305E",
    flex: 1,
    paddingRight: 10,
  },
  selectedAmount: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1F305E",
  },
  selectedMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  selectedMetaLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "rgba(0,0,0,0.55)",
  },
  selectedMetaValue: {
    fontSize: 12,
    fontWeight: "900",
  },
  positive: {
    color: "#2E7D32",
  },
  negative: {
    color: "#C62828",
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "rgba(0,0,0,0.6)",
    marginBottom: 10,
  },
  mutedText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(0,0,0,0.5)",
  },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  catName: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(0,0,0,0.65)",
    flex: 1,
    paddingRight: 10,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: "900",
    color: "#1F305E",
  },
});
