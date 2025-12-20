
import React, { useEffect, useState, useMemo, Dispatch, SetStateAction } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { eachDayOfInterval, startOfWeek, endOfWeek, addDays, addMonths, format, getDaysInMonth, startOfMonth } from 'date-fns';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { router } from 'expo-router';

import { auth, db1 } from '../../firebase';

const { width } = Dimensions.get('window');

const APP_BG = '#FFF9F2';
const PRIMARY = '#1F305E';

// --- Type Definitions ---
type Expense = { 
    date: string;
    amount: number; 
};

type HeatmapCategory =
  | {
      id: string;
      type: 'EMPTY';
      label: string;
      color: string;
    }
  | {
      id: string;
      type: 'RANGE';
      label: string;
      color: string;
      min: number;
      max: number | null;
    };

const NEUTRAL_EMPTY_COLOR = '#e0e0e0';
const NEUTRAL_UNCATEGORIZED_COLOR = '#f2f2f2';

const FIXED_EMPTY_LABEL = 'No spending';
const FIXED_SAFE_LABEL = 'Safe';
const FIXED_WARNING_LABEL = 'Warning';
const FIXED_DANGER_LABEL = 'Danger';

const FIXED_EMPTY_COLOR = '#E5E7EB';
const FIXED_SAFE_COLOR = '#22C55E';
const FIXED_WARNING_COLOR = '#F59E0B';
const FIXED_DANGER_COLOR = '#EF4444';

const DEFAULT_SAFE_LIMIT = 50;
const DEFAULT_DANGER_LIMIT = 150;
const THRESHOLD_STEP = 10;

const FIXED_EMPTY_ID = 'no-spending';
const FIXED_SAFE_ID = 'safe';
const FIXED_WARNING_ID = 'warning';
const FIXED_DANGER_ID = 'danger';

const buildFixedCategories = (safeLimit: number, dangerLimit: number): HeatmapCategory[] => {
  const safe = Math.min(safeLimit, dangerLimit);
  const danger = Math.max(safeLimit, dangerLimit);
  return [
    { id: FIXED_EMPTY_ID, type: 'EMPTY', label: FIXED_EMPTY_LABEL, color: FIXED_EMPTY_COLOR },
    { id: FIXED_SAFE_ID, type: 'RANGE', label: FIXED_SAFE_LABEL, color: FIXED_SAFE_COLOR, min: 0, max: safe },
    { id: FIXED_WARNING_ID, type: 'RANGE', label: FIXED_WARNING_LABEL, color: FIXED_WARNING_COLOR, min: safe, max: danger },
    { id: FIXED_DANGER_ID, type: 'RANGE', label: FIXED_DANGER_LABEL, color: FIXED_DANGER_COLOR, min: danger, max: null },
  ];
};

type LegacyHeatmapThresholds = {
  safeLimit: number;
  dangerLimit: number;
};

const normalizeLegacyThresholds = (value: unknown): LegacyHeatmapThresholds | null => {
  if (!value || typeof value !== 'object') return null;
  const maybe = value as Partial<Record<keyof LegacyHeatmapThresholds, unknown>>;
  const safeLimit = typeof maybe.safeLimit === 'number' ? maybe.safeLimit : NaN;
  const dangerLimit = typeof maybe.dangerLimit === 'number' ? maybe.dangerLimit : NaN;
  if (!Number.isFinite(safeLimit) || !Number.isFinite(dangerLimit)) return null;
  return { safeLimit: Math.max(0, safeLimit), dangerLimit: Math.max(0, dangerLimit) };
};

type HeatmapCellData = {
    date: Date | null;
    amount: number | null;
}

// --- Mock Data ---
const MOCK_EXPENSES: Expense[] = [
  { date: '2025-01-15', amount: 75 },
  { date: '2025-01-22', amount: 150 },
  { date: '2025-02-10', amount: 30 },
  { date: '2025-03-05', amount: 200 },
  { date: '2025-06-18', amount: 120 },
  { date: '2025-07-01', amount: 50 },
  { date: '2025-12-25', amount: 300 },
];

const resolveCategoryForAmount = (amount: number | null | undefined, categories: HeatmapCategory[]) => {
  if (amount === null || amount === undefined) {
    return categories.find((c) => c.type === 'EMPTY') ?? null;
  }

  const ranges = categories
    .filter((c): c is Extract<HeatmapCategory, { type: 'RANGE' }> => c.type === 'RANGE')
    .sort((a, b) => {
      if (a.min !== b.min) return a.min - b.min;
      const aMax = a.max ?? Number.POSITIVE_INFINITY;
      const bMax = b.max ?? Number.POSITIVE_INFINITY;
      return aMax - bMax;
    });

  return (
    ranges.find((c) => amount >= c.min && (c.max === null || amount <= c.max)) ??
    null
  );
};

type HeaderProps = {
  onPressSettings: () => void;
};

const Header = ({ onPressSettings }: HeaderProps) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
      <Ionicons name="arrow-back" size={22} color={PRIMARY} />
    </TouchableOpacity>

    <Text style={styles.headerTitle}>Expense Heatmap</Text>

    <TouchableOpacity style={styles.headerIconBtn} onPress={onPressSettings}>
      <Feather name="settings" size={24} color={PRIMARY} />
    </TouchableOpacity>
  </View>
);

type ViewSelectionProps = {
    view: string;
    setView: Dispatch<SetStateAction<'YEAR' | 'MONTH'>>;
}

const ViewSelection = ({ view, setView }: ViewSelectionProps) => (
  <View style={styles.tabContainer}>
    {['YEAR', 'MONTH'].map((tab) => (
      <TouchableOpacity
        key={tab}
        style={[styles.tab, view === tab && styles.activeTab]}
        onPress={() => setView(tab as 'YEAR' | 'MONTH')}
      >
        <Text style={[styles.tabText, view === tab && styles.activeTabText]}>{tab}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

type HeatmapCellProps = {
    date: Date | null;
    amount: number | null;
    onCellPress: (date: Date | null, amount: number | null) => void;
    categories: HeatmapCategory[];
    cellSize?: number;
    cellMargin?: number;
    showLabel?: boolean;
    disabled?: boolean;
}

const HeatmapCell = ({ date, amount, onCellPress, categories, cellSize, cellMargin, showLabel = true, disabled }: HeatmapCellProps) => {
    const resolved = resolveCategoryForAmount(amount, categories);
    const isPlaceholder = Boolean(disabled && !date);
    const color =
      (isPlaceholder ? 'transparent' : resolved?.color) ??
      (amount === null || amount === undefined ? NEUTRAL_EMPTY_COLOR : NEUTRAL_UNCATEGORIZED_COLOR);

    const handlePress = () => {
        onCellPress(date, amount);
    }

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={handlePress}
      style={[
        styles.cell,
        cellSize ? { width: cellSize, height: cellSize } : null,
        cellMargin !== undefined ? { margin: cellMargin } : null,
        { backgroundColor: color },
      ]}
    >
        <Text style={styles.cellText}>{showLabel && date ? format(date, 'd') : ''}</Text>
    </TouchableOpacity>
  );
};

// --- Heatmap Views ---
type HeatmapViewProps = {
    expenses: Expense[];
    onCellPress: (date: Date | null, amount: number | null) => void;
    anchorDate: Date;
    categories: HeatmapCategory[];
}

const YEAR_MINI_CELL_SIZE = 8;

const YearView = ({ expenses, onCellPress, anchorDate, categories }: HeatmapViewProps) => {
  const year = anchorDate.getFullYear();

  const monthGrids = useMemo(() => {
    return Array.from({ length: 12 }, (_, monthIndex) => {
      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = addDays(monthStart, getDaysInMonth(monthStart) - 1);

      const gridStart = startOfWeek(monthStart);
      const gridEnd = endOfWeek(monthEnd);
      let days = eachDayOfInterval({ start: gridStart, end: gridEnd });
      while (days.length < 42) {
        days = [...days, addDays(days[days.length - 1], 1)];
      }

      const data: HeatmapCellData[] = days.map((day) => {
        if (day.getFullYear() !== year || day.getMonth() !== monthIndex) {
          return { date: null, amount: null };
        }
        const expense = expenses.find((e: Expense) => e.date === format(day, 'yyyy-MM-dd'));
        return { date: day, amount: expense ? expense.amount : null };
      });

      return {
        monthIndex,
        label: format(monthStart, 'MMM'),
        data,
      };
    });
  }, [expenses, year]);

  return (
    <View style={styles.yearMonthsGrid}>
      {monthGrids.map((m) => (
        <View key={m.monthIndex} style={styles.yearMonthCard}>
          <Text style={styles.yearMonthTitle}>{m.label}</Text>
          <View style={styles.yearMiniGrid}>
            {m.data.map(({ date, amount }, idx) => (
              <HeatmapCell
                key={`${m.monthIndex}-${idx}`}
                date={date}
                amount={amount}
                onCellPress={onCellPress}
                categories={categories}
                cellSize={YEAR_MINI_CELL_SIZE}
                cellMargin={1}
                showLabel={false}
                disabled={!date}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};
  

const MonthView = ({ expenses, onCellPress, anchorDate, categories }: HeatmapViewProps) => {
    const monthData: HeatmapCellData[] = useMemo(() => {
      const today = anchorDate;
      const monthStart = startOfMonth(today);
      const monthEnd = addDays(monthStart, getDaysInMonth(today) - 1);
      
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const leadingPlaceholders = (monthStart.getDay() + 6) % 7;
      let grid: HeatmapCellData[] = Array.from({ length: leadingPlaceholders }, () => ({ date: null, amount: null }));
      days.forEach((day: Date) => {
        const expense = expenses.find((e: Expense) => e.date === format(day, 'yyyy-MM-dd'));
        grid.push({ date: day, amount: expense ? expense.amount : null });
      })
      
      return grid;
    }, [anchorDate, expenses]);
  
    return (
      <View style={styles.monthGrid}>
        {monthData.map(({ date, amount }, index: number) => (
          <HeatmapCell
            key={index}
            date={date}
            amount={amount}
            onCellPress={onCellPress}
            categories={categories}
            disabled={!date}
          />
        ))}
      </View>
    );
  };

const FinancialHeatMapScreen = () => {
  const MIN_FILTER_YEAR = 2020;
  const MAX_FILTER_YEAR = 2026;
  const [view, setView] = useState<'YEAR' | 'MONTH'>('YEAR');
  const [categories, setCategories] = useState<HeatmapCategory[]>([]);
  const [isColorSettingsVisible, setIsColorSettingsVisible] = useState(false);
  const [anchorDate, setAnchorDate] = useState(() => new Date('2025-01-15'));
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);
  const [draftAnchorDate, setDraftAnchorDate] = useState(() => new Date('2025-01-15'));

  const [safeLimit, setSafeLimit] = useState(DEFAULT_SAFE_LIMIT);
  const [dangerLimit, setDangerLimit] = useState(DEFAULT_DANGER_LIMIT);
  const [draftSafeLimit, setDraftSafeLimit] = useState(DEFAULT_SAFE_LIMIT);
  const [draftDangerLimit, setDraftDangerLimit] = useState(DEFAULT_DANGER_LIMIT);

  useEffect(() => {
    const loadSavedColors = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setSafeLimit(DEFAULT_SAFE_LIMIT);
          setDangerLimit(DEFAULT_DANGER_LIMIT);
          setCategories(buildFixedCategories(DEFAULT_SAFE_LIMIT, DEFAULT_DANGER_LIMIT));
          return;
        }

        const snap = await getDoc(doc(db1, 'users', user.uid));
        if (!snap.exists()) {
          setSafeLimit(DEFAULT_SAFE_LIMIT);
          setDangerLimit(DEFAULT_DANGER_LIMIT);
          setCategories(buildFixedCategories(DEFAULT_SAFE_LIMIT, DEFAULT_DANGER_LIMIT));
          return;
        }

        const data = snap.data() as any;
        const thresholds = normalizeLegacyThresholds(data?.heatmapThresholds);
        const safe = thresholds?.safeLimit ?? DEFAULT_SAFE_LIMIT;
        const danger = thresholds?.dangerLimit ?? DEFAULT_DANGER_LIMIT;
        setSafeLimit(safe);
        setDangerLimit(danger);
        setCategories(buildFixedCategories(safe, danger));
      } catch (err) {
        console.error(err);
      }
    };

    loadSavedColors();
  }, []);

  const handleCellPress = (date: Date | null, amount: number | null) => {
    if (!date) return;
    const dateString = format(date, 'MMMM do, yyyy');
    const amountString = amount !== null ? `₹${amount.toFixed(2)}` : 'No spending';
    const resolved = resolveCategoryForAmount(amount, categories);
    const categoryLabel = resolved?.label ?? 'Uncategorized';
    Alert.alert('Spending Details', `${dateString}\n${amountString}\n${categoryLabel}`);
  };

  const renderContent = () => {
    switch (view) {
      case 'YEAR':
        return <YearView expenses={MOCK_EXPENSES} onCellPress={handleCellPress} anchorDate={anchorDate} categories={categories} />;
      case 'MONTH':
        return <MonthView expenses={MOCK_EXPENSES} onCellPress={handleCellPress} anchorDate={anchorDate} categories={categories} />;
      default:
        return null;
    }
  };

  const viewDetailsText = useMemo(() => {
    if (view === 'YEAR') {
      return format(anchorDate, 'yyyy');
    }
    return format(anchorDate, 'MMMM yyyy');
  }, [anchorDate, view]);

  const shiftAnchorDate = (direction: -1 | 1) => {
    if (view !== 'MONTH') return;
    setAnchorDate((prev) => {
      const next = addMonths(prev, direction);
      const minDate = new Date(MIN_FILTER_YEAR, 0, 1);
      const maxDate = new Date(MAX_FILTER_YEAR, 11, 31, 23, 59, 59, 999);
      if (next < minDate || next > maxDate) return prev;
      return next;
    });
  };

  const openDateFilter = () => {
    const minDate = new Date(MIN_FILTER_YEAR, 0, 15);
    const maxDate = new Date(MAX_FILTER_YEAR, 11, 15);
    const clamped = anchorDate < minDate ? minDate : anchorDate > maxDate ? maxDate : anchorDate;
    setDraftAnchorDate(clamped);
    setIsDateFilterVisible(true);
  };

  const closeDateFilter = () => {
    setIsDateFilterVisible(false);
  };

  const saveDateFilter = () => {
    const candidate = new Date(draftAnchorDate.getFullYear(), draftAnchorDate.getMonth(), 15);
    const minDate = new Date(MIN_FILTER_YEAR, 0, 15);
    const maxDate = new Date(MAX_FILTER_YEAR, 11, 15);
    const clamped = candidate < minDate ? minDate : candidate > maxDate ? maxDate : candidate;
    setAnchorDate(clamped);
    setIsDateFilterVisible(false);
  };

  const openColorSettings = () => {
    setDraftSafeLimit(safeLimit);
    setDraftDangerLimit(dangerLimit);
    setIsColorSettingsVisible(true);
  };

  const closeColorSettings = () => {
    setIsColorSettingsVisible(false);
  };

  const resetDraftRanges = () => {
    setDraftSafeLimit(DEFAULT_SAFE_LIMIT);
    setDraftDangerLimit(DEFAULT_DANGER_LIMIT);
  };

  const adjustDraftSafe = (delta: number) => {
    setDraftSafeLimit((prev) => {
      const next = Math.max(0, prev + delta);
      setDraftDangerLimit((dPrev) => Math.max(next, dPrev));
      return next;
    });
  };

  const adjustDraftDanger = (delta: number) => {
    setDraftDangerLimit((prev) => Math.max(draftSafeLimit, prev + delta));
  };

  const saveColorSettings = async () => {
    setSafeLimit(draftSafeLimit);
    setDangerLimit(draftDangerLimit);
    const nextCategories = buildFixedCategories(draftSafeLimit, draftDangerLimit);
    setCategories(nextCategories);
    setIsColorSettingsVisible(false);

    try {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(
        doc(db1, 'users', user.uid),
        {
          heatmapThresholds: {
            safeLimit: draftSafeLimit,
            dangerLimit: draftDangerLimit,
          },
          heatmapCategories: nextCategories,
        },
        { merge: true }
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Header onPressSettings={openColorSettings} />
        <ViewSelection view={view} setView={setView} />
        <View style={styles.filterBar}>
          {view === 'MONTH' ? (
            <>
              <TouchableOpacity style={styles.filterIconBtn} onPress={() => shiftAnchorDate(-1)}>
                <Feather name="chevron-left" size={20} color={PRIMARY} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterCenterBtn} onPress={openDateFilter}>
                <Text style={styles.filterCenterText}>{viewDetailsText}</Text>
                <Feather name="chevron-down" size={18} color={PRIMARY} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.filterIconBtn} onPress={() => shiftAnchorDate(1)}>
                <Feather name="chevron-right" size={20} color={PRIMARY} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.filterCenterBtn} onPress={openDateFilter}>
              <Text style={styles.filterCenterText}>{viewDetailsText}</Text>
              <Feather name="chevron-down" size={18} color={PRIMARY} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView style={styles.contentScrollView} keyboardShouldPersistTaps="handled">
            <View style={styles.contentCard}>
              {renderContent()}
            </View>
        </ScrollView>

        <Modal
          transparent
          animationType="fade"
          visible={isDateFilterVisible}
          onRequestClose={closeDateFilter}
        >
          <View style={styles.centeredModalBackdrop}>
            <View style={styles.centeredModalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Filter</Text>
                <TouchableOpacity onPress={closeDateFilter}>
                  <Feather name="x" size={22} color={PRIMARY} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
              >
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Year</Text>
                  <View style={styles.yearChipRow}>
                    {Array.from(
                      { length: MAX_FILTER_YEAR - MIN_FILTER_YEAR + 1 },
                      (_, i) => MIN_FILTER_YEAR + i
                    ).map((y) => {
                      const isActive = y === draftAnchorDate.getFullYear();
                      return (
                        <TouchableOpacity
                          key={y}
                          style={[styles.yearChip, isActive ? styles.yearChipActive : null]}
                          onPress={() => setDraftAnchorDate(new Date(y, draftAnchorDate.getMonth(), 15))}
                        >
                          <Text style={[styles.yearChipText, isActive ? styles.yearChipTextActive : null]}>{y}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {view === 'MONTH' && (
                  <View style={styles.filterSection}>
                    <Text style={styles.filterSectionTitle}>Month</Text>
                    <View style={styles.monthGridPicker}>
                      {Array.from({ length: 12 }, (_, i) => i).map((m) => {
                        const isActive = m === draftAnchorDate.getMonth();
                        return (
                          <TouchableOpacity
                            key={m}
                            style={[styles.monthChip, isActive ? styles.monthChipActive : null]}
                            onPress={() => setDraftAnchorDate(new Date(draftAnchorDate.getFullYear(), m, 15))}
                          >
                            <Text style={[styles.monthChipText, isActive ? styles.monthChipTextActive : null]}>
                              {format(new Date(draftAnchorDate.getFullYear(), m, 1), 'MMM')}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={closeDateFilter}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonPrimary]}
                  onPress={saveDateFilter}
                >
                  <Text style={styles.modalButtonPrimaryText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          transparent
          animationType="slide"
          visible={isColorSettingsVisible}
          onRequestClose={closeColorSettings}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Heatmap Categories</Text>
                <View style={styles.modalHeaderActions}>
                  <TouchableOpacity style={styles.modalIconBtn} onPress={closeColorSettings}>
                    <Feather name="x" size={22} color={PRIMARY} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.modalBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
              >

                <Text style={styles.defaultsHintText}>
                  Default limits: Safe ₹{DEFAULT_SAFE_LIMIT} • Danger ₹{DEFAULT_DANGER_LIMIT}
                </Text>

                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>Safe limit</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustDraftSafe(-THRESHOLD_STEP)}>
                      <Feather name="minus" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>₹{draftSafeLimit}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustDraftSafe(THRESHOLD_STEP)}>
                      <Feather name="plus" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.stepperRow}>
                  <Text style={styles.stepperLabel}>Danger limit</Text>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustDraftDanger(-THRESHOLD_STEP)}>
                      <Feather name="minus" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>₹{draftDangerLimit}</Text>
                    <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustDraftDanger(THRESHOLD_STEP)}>
                      <Feather name="plus" size={16} color={PRIMARY} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fixedLegendCard}>
                  <View style={styles.fixedLegendRow}>
                    <View style={[styles.fixedLegendDot, { backgroundColor: FIXED_EMPTY_COLOR }]} />
                    <Text style={styles.fixedLegendText}>{FIXED_EMPTY_LABEL}</Text>
                  </View>
                  <View style={styles.fixedLegendRow}>
                    <View style={[styles.fixedLegendDot, { backgroundColor: FIXED_SAFE_COLOR }]} />
                    <Text style={styles.fixedLegendText}>{FIXED_SAFE_LABEL}</Text>
                  </View>
                  <View style={styles.fixedLegendRow}>
                    <View style={[styles.fixedLegendDot, { backgroundColor: FIXED_WARNING_COLOR }]} />
                    <Text style={styles.fixedLegendText}>{FIXED_WARNING_LABEL}</Text>
                  </View>
                  <View style={styles.fixedLegendRow}>
                    <View style={[styles.fixedLegendDot, { backgroundColor: FIXED_DANGER_COLOR }]} />
                    <Text style={styles.fixedLegendText}>{FIXED_DANGER_LABEL}</Text>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={resetDraftRanges}
                >
                  <Text style={styles.modalButtonSecondaryText}>Reset</Text>
                </TouchableOpacity>
                <View style={styles.modalActionsRight}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={closeColorSettings}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={saveColorSettings}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: APP_BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    marginTop: 10,
    fontSize: 34,
    fontWeight: '900',
    color: '#1F305E',
    letterSpacing: 0.2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    marginBottom: 14,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#EAF0FF',
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '600',
    color: PRIMARY
  },
  activeTabText: {
    color: PRIMARY,
  },
  contentScrollView: {
    flex: 1,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterIconBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  filterCenterBtn: {
    flex: 1,
    marginHorizontal: 10,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
  },
  filterCenterText: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },
  filterSinglePill: {
    flex: 1,
    height: 42,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  contentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    elevation: 3,
  },
  yearMonthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearMonthCard: {
    width: '31.5%',
    backgroundColor: '#F7F8FC',
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  yearMonthTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: PRIMARY,
    marginBottom: 8,
    textAlign: 'center',
  },
  yearMiniGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    alignSelf: 'center',
    width: (YEAR_MINI_CELL_SIZE + 2) * 7,
  },
  yearGrid: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  yearWeekColumn: {
    flexDirection: 'column',
    marginRight: 2,
  },
  yearMonthLabel: {
    height: 18,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 2,
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: width / 10,
    height: width / 10,
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  centeredModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalBody: {
    maxHeight: 520,
  },
  centeredModalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginLeft: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: PRIMARY,
  },
  colorRow: {
    marginBottom: 14,
  },
  colorRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  colorRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: PRIMARY,
  },
  colorRowValue: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
  colorSwatchRow: {
    flexDirection: 'row',
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: PRIMARY,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 10,
  },
  yearChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  yearChip: {
    width: '48%',
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
  },
  yearChipActive: {
    backgroundColor: '#EAF0FF',
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.7)',
  },
  yearChipTextActive: {
    color: PRIMARY,
  },
  modalActionsRight: {
    flexDirection: 'row',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalButtonPrimary: {
    backgroundColor: PRIMARY,
    marginLeft: 10,
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalButtonSecondary: {
    backgroundColor: '#f2f2f2',
  },
  modalButtonSecondaryText: {
    color: PRIMARY,
    fontWeight: '700',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthHeaderSpacer: {
    width: 42,
    height: 42,
  },
  monthHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY,
  },
  monthGridPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthChip: {
    width: '30%',
    paddingVertical: 10,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
  },
  monthChipActive: {
    backgroundColor: '#EAF0FF',
  },
  monthChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.7)',
  },
  monthChipTextActive: {
    color: PRIMARY,
  },
  tagsCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 14,
    padding: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  tagsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PRIMARY,
    marginBottom: 10,
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  tagsEmptyText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
  },
  categoryIntroCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginTop: 6,
    marginBottom: 12,
  },
  categoryIntroTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: PRIMARY,
    marginBottom: 6,
  },
  categoryIntroText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
    lineHeight: 16,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  primaryActionBtnText: {
    color: '#fff',
    fontWeight: '900',
    marginLeft: 8,
  },
  emptyToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 14,
  },
  emptyToggleTextCol: {
    flex: 1,
    marginRight: 12,
  },
  emptyToggleTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: PRIMARY,
    marginBottom: 2,
  },
  emptyToggleSubtitle: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
  },
  togglePill: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  togglePillOn: {
    backgroundColor: '#EAF0FF',
    borderColor: 'rgba(31,48,94,0.25)',
  },
  togglePillOff: {
    backgroundColor: '#F7F8FC',
    borderColor: 'rgba(0,0,0,0.08)',
  },
  togglePillText: {
    fontWeight: '900',
    color: 'rgba(0,0,0,0.65)',
  },
  togglePillTextOn: {
    color: PRIMARY,
  },
  categorySectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: PRIMARY,
    marginBottom: 10,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginBottom: 10,
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: PRIMARY,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  stepperValue: {
    minWidth: 74,
    textAlign: 'center',
    fontWeight: '900',
    color: PRIMARY,
  },
  fixedLegendCard: {
    backgroundColor: '#F7F8FC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    marginTop: 6,
  },
  fixedLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fixedLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  fixedLegendText: {
    fontSize: 13,
    fontWeight: '800',
    color: PRIMARY,
  },
  defaultsHintText: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.55)',
    marginBottom: 10,
  },
  addTagButton: {
    marginLeft: 10,
    backgroundColor: PRIMARY,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addTagButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  addCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  addCategorySecondaryBtn: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  addCategorySecondaryText: {
    color: PRIMARY,
    fontWeight: '800',
    textAlign: 'center',
  },
  extraCategoryRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    marginBottom: 10,
  },
  extraCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  extraCategoryTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  extraCategoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  extraCategoryTitleText: {
    flex: 1,
    fontWeight: '900',
    color: PRIMARY,
  },
  extraCategoryRemoveBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  extraCategoryRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  extraCategoryRangeField: {
    flex: 1,
  },
  thresholdLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(0,0,0,0.7)',
  },
  thresholdInput: {
    width: 110,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    fontWeight: '800',
    color: PRIMARY,
    textAlign: 'right',
  },
});

export default FinancialHeatMapScreen;
