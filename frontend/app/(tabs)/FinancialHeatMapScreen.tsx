
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { eachDayOfInterval, startOfWeek, endOfWeek, addDays, format, getDaysInMonth, startOfMonth } from 'date-fns';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

const generateId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizeCategories = (value: unknown): HeatmapCategory[] | null => {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((v) => v && typeof v === 'object')
    .map((v) => v as Record<string, unknown>)
    .map((raw) => {
      const id = typeof raw.id === 'string' ? raw.id : generateId();
      const type = raw.type === 'EMPTY' || raw.type === 'RANGE' ? raw.type : null;
      const label = typeof raw.label === 'string' ? raw.label.trim() : '';
      const color = typeof raw.color === 'string' ? raw.color : '';
      if (!type || !label || !color) return null;

      if (type === 'EMPTY') {
        return { id, type: 'EMPTY', label, color } as HeatmapCategory;
      }

      const min = typeof raw.min === 'number' ? raw.min : NaN;
      const max = raw.max === null ? null : typeof raw.max === 'number' ? raw.max : NaN;
      if (!Number.isFinite(min) || min < 0) return null;
      if (max !== null && (!Number.isFinite(max) || max < min)) return null;
      return { id, type: 'RANGE', label, color, min, max } as HeatmapCategory;
    })
    .filter((v): v is HeatmapCategory => Boolean(v));

  return items;
};

type LegacyHeatmapColors = {
  empty: string;
  safe: string;
  warning: string;
  danger: string;
};

type LegacyHeatmapLabels = {
  empty: string;
  safe: string;
  warning: string;
  danger: string;
};

type LegacyHeatmapThresholds = {
  safeLimit: number;
  dangerLimit: number;
};

type LegacyExtraCategory = {
  label: string;
  limit: number;
  color: string;
};

const normalizeLegacyColors = (value: unknown): LegacyHeatmapColors | null => {
  if (!value || typeof value !== 'object') return null;
  const maybe = value as Partial<Record<keyof LegacyHeatmapColors, unknown>>;
  const empty = typeof maybe.empty === 'string' ? maybe.empty : '';
  const safe = typeof maybe.safe === 'string' ? maybe.safe : '';
  const warning = typeof maybe.warning === 'string' ? maybe.warning : '';
  const danger = typeof maybe.danger === 'string' ? maybe.danger : '';
  if (!empty || !safe || !warning || !danger) return null;
  return { empty, safe, warning, danger };
};

const normalizeLegacyLabels = (value: unknown): LegacyHeatmapLabels | null => {
  if (!value || typeof value !== 'object') return null;
  const maybe = value as Partial<Record<keyof LegacyHeatmapLabels, unknown>>;
  const empty = typeof maybe.empty === 'string' ? maybe.empty.trim() : '';
  const safe = typeof maybe.safe === 'string' ? maybe.safe.trim() : '';
  const warning = typeof maybe.warning === 'string' ? maybe.warning.trim() : '';
  const danger = typeof maybe.danger === 'string' ? maybe.danger.trim() : '';
  if (!empty || !safe || !warning || !danger) return null;
  return { empty, safe, warning, danger };
};

const normalizeLegacyThresholds = (value: unknown): LegacyHeatmapThresholds | null => {
  if (!value || typeof value !== 'object') return null;
  const maybe = value as Partial<Record<keyof LegacyHeatmapThresholds, unknown>>;
  const safeLimit = typeof maybe.safeLimit === 'number' ? maybe.safeLimit : NaN;
  const dangerLimit = typeof maybe.dangerLimit === 'number' ? maybe.dangerLimit : NaN;
  if (!Number.isFinite(safeLimit) || !Number.isFinite(dangerLimit)) return null;
  return { safeLimit: Math.max(0, safeLimit), dangerLimit: Math.max(0, dangerLimit) };
};

const normalizeLegacyExtraCategories = (value: unknown): LegacyExtraCategory[] | null => {
  if (!Array.isArray(value)) return null;
  const items = value
    .filter((v) => v && typeof v === 'object')
    .map((v) => v as Partial<Record<keyof LegacyExtraCategory, unknown>>)
    .map((maybe) => {
      const label = typeof maybe.label === 'string' ? maybe.label.trim() : '';
      const limit = typeof maybe.limit === 'number' ? maybe.limit : NaN;
      const color = typeof maybe.color === 'string' ? maybe.color : '';
      return { label, limit, color };
    })
    .filter((c) => c.label.length > 0 && Number.isFinite(c.limit) && c.limit >= 0 && c.color.length > 0);
  return items;
};

type ExtraCategoryRowProps = {
  category: HeatmapCategory;
  onChangeLabel: (id: string, label: string) => void;
  onChangeMin: (id: string, value: string) => void;
  onChangeMax: (id: string, value: string) => void;
  onChangeColor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
};

const ExtraCategoryRow = ({ category, onChangeLabel, onChangeMin, onChangeMax, onChangeColor, onRemove }: ExtraCategoryRowProps) => (
  <View style={styles.extraCategoryRow}>
    <View style={styles.extraCategoryHeader}>
      <TextInput
        style={styles.extraCategoryLabelInput}
        value={category.label}
        onChangeText={(v) => onChangeLabel(category.id, v)}
        placeholder="Label"
        placeholderTextColor="rgba(0,0,0,0.4)"
        autoCapitalize="sentences"
      />
      <TouchableOpacity onPress={() => onRemove(category.id)} style={styles.extraCategoryRemoveBtn}>
        <Feather name="trash-2" size={16} color={PRIMARY} />
      </TouchableOpacity>
    </View>

    {category.type === 'EMPTY' ? (
      <Text style={styles.tagsEmptyText}>Applies when there is no spending.</Text>
    ) : (
      <View style={styles.extraCategoryRangeRow}>
        <View style={styles.extraCategoryRangeField}>
          <Text style={styles.thresholdLabel}>Min</Text>
          <TextInput
            style={styles.thresholdInput}
            value={String(category.min)}
            onChangeText={(v) => onChangeMin(category.id, v)}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.extraCategoryRangeField}>
          <Text style={styles.thresholdLabel}>Max</Text>
          <TextInput
            style={styles.thresholdInput}
            value={category.max === null ? '' : String(category.max)}
            onChangeText={(v) => onChangeMax(category.id, v)}
            keyboardType="numeric"
            placeholder="∞"
            placeholderTextColor="rgba(0,0,0,0.4)"
          />
        </View>
      </View>
    )}

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.extraCategoryColorRow}>
      {EXTRA_CATEGORY_COLOR_PRESETS.map((preset) => (
        <TouchableOpacity
          key={`${category.id}-${preset}`}
          onPress={() => onChangeColor(category.id, preset)}
          style={[
            styles.colorSwatch,
            { backgroundColor: preset },
            preset.toLowerCase() === category.color.toLowerCase() ? styles.colorSwatchSelected : null,
          ]}
        />
      ))}
    </ScrollView>
  </View>
);

const EXTRA_CATEGORY_COLOR_PRESETS = [
  '#4caf50',
  '#22c55e',
  '#10b981',
  '#0ea5e9',
  '#6366f1',
  '#ffeb3b',
  '#fbbf24',
  '#f59e0b',
  '#f97316',
  '#fde047',
  '#f44336',
  '#ef4444',
  '#e11d48',
  '#db2777',
  '#dc2626',
  '#e0e0e0',
  '#f2f2f2',
  '#cfcfcf',
  '#bdbdbd',
  '#9e9e9e',
];

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
    <Text style={styles.headerTitle}>Spenzia Insights</Text>
    <TouchableOpacity onPress={onPressSettings}>
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
    showLabel?: boolean;
    disabled?: boolean;
}

const HeatmapCell = ({ date, amount, onCellPress, categories, cellSize, showLabel = true, disabled }: HeatmapCellProps) => {
    const resolved = resolveCategoryForAmount(amount, categories);
    const color = resolved?.color ?? (amount === null || amount === undefined ? NEUTRAL_EMPTY_COLOR : NEUTRAL_UNCATEGORIZED_COLOR);

    const handlePress = () => {
        onCellPress(date, amount);
    }

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={handlePress}
      style={[styles.cell, cellSize ? { width: cellSize, height: cellSize } : null, { backgroundColor: color }]}
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

const YEAR_CELL_SIZE = 16;

const YearView = ({ expenses, onCellPress, categories }: HeatmapViewProps) => {
    const year = 2025;
    const yearStart = useMemo(() => new Date(year, 0, 1), [year]);
    const yearEnd = useMemo(() => new Date(year, 11, 31), [year]);

    const { weeks, monthLabels } = useMemo(() => {
      
      const gridStart = startOfWeek(yearStart);
      const gridEnd = endOfWeek(yearEnd);
      const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

      const dayData: HeatmapCellData[] = days.map((day: Date) => {
        if (day < yearStart || day > yearEnd) return { date: null, amount: null };
        const expense = expenses.find((e: Expense) => e.date === format(day, 'yyyy-MM-dd'));
        return { date: day, amount: expense ? expense.amount : null };
      });

      const chunked: HeatmapCellData[][] = [];
      const labels: string[] = [];
      for (let i = 0; i < dayData.length; i += 7) {
        const week = dayData.slice(i, i + 7);
        chunked.push(week);

        const firstDate = week.find((d) => d.date)?.date ?? null;
        if (!firstDate) {
          labels.push('');
          continue;
        }

        const prevWeek = chunked.length > 1 ? chunked[chunked.length - 2] : null;
        const prevFirstDate = prevWeek?.find((d) => d.date)?.date ?? null;

        const isNewMonth = !prevFirstDate || prevFirstDate.getMonth() !== firstDate.getMonth();
        const shouldShow = isNewMonth && firstDate.getDate() <= 7;
        labels.push(shouldShow ? format(firstDate, 'MMM') : '');
      }

      return { weeks: chunked, monthLabels: labels };
    }, [expenses, yearEnd, yearStart]);
  
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.yearGrid}>
          {weeks.map((week, weekIndex: number) => (
            <View key={weekIndex} style={styles.yearWeekColumn}>
              <Text style={styles.yearMonthLabel}>{monthLabels[weekIndex] || ''}</Text>
              {week.map(({ date, amount }, dayIndex: number) => (
                <HeatmapCell
                  key={`${weekIndex}-${dayIndex}`}
                  date={date}
                  amount={amount}
                  onCellPress={onCellPress}
                  categories={categories}
                  cellSize={YEAR_CELL_SIZE}
                  showLabel={false}
                  disabled={!date}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };
  

const MonthView = ({ expenses, onCellPress, anchorDate, categories }: HeatmapViewProps) => {
    const monthData: HeatmapCellData[] = useMemo(() => {
      const today = anchorDate;
      const monthStart = startOfMonth(today);
      const monthEnd = addDays(monthStart, getDaysInMonth(today) - 1);
      
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      let grid: HeatmapCellData[] = [];
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
          />
        ))}
      </View>
    );
  };

const FinancialHeatMapScreen = () => {
  const [view, setView] = useState<'YEAR' | 'MONTH'>('YEAR');
  const [categories, setCategories] = useState<HeatmapCategory[]>([]);
  const [isColorSettingsVisible, setIsColorSettingsVisible] = useState(false);
  const [draftCategories, setDraftCategories] = useState<HeatmapCategory[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date('2025-01-15'));
  const [isDateFilterVisible, setIsDateFilterVisible] = useState(false);
  const [draftAnchorDate, setDraftAnchorDate] = useState(() => new Date('2025-01-15'));

  useEffect(() => {
    const loadSavedColors = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const snap = await getDoc(doc(db1, 'users', user.uid));
        if (!snap.exists()) return;

        const data = snap.data() as any;
        const normalizedCategories = normalizeCategories(data?.heatmapCategories);
        if (normalizedCategories) {
          setCategories(normalizedCategories);
          return;
        }

        const legacyColors = normalizeLegacyColors(data?.heatmapColors);
        const legacyLabels = normalizeLegacyLabels(data?.heatmapLabels);
        const legacyThresholds = normalizeLegacyThresholds(data?.heatmapThresholds);
        const legacyExtraCats = normalizeLegacyExtraCategories(data?.heatmapExtraCategories);

        if (legacyColors && legacyLabels && legacyThresholds) {
          const safe = Math.min(legacyThresholds.safeLimit, legacyThresholds.dangerLimit);
          const danger = Math.max(legacyThresholds.safeLimit, legacyThresholds.dangerLimit);

          const migrated: HeatmapCategory[] = [
            { id: generateId(), type: 'EMPTY', label: legacyLabels.empty, color: legacyColors.empty },
            { id: generateId(), type: 'RANGE', label: legacyLabels.safe, color: legacyColors.safe, min: 0, max: safe },
            { id: generateId(), type: 'RANGE', label: legacyLabels.warning, color: legacyColors.warning, min: safe, max: danger },
          ];

          if (legacyExtraCats && legacyExtraCats.length > 0) {
            const sorted = [...legacyExtraCats].sort((a, b) => a.limit - b.limit);
            migrated.push(
              ...sorted.map<HeatmapCategory>((c) => ({
                id: generateId(),
                type: 'RANGE',
                label: c.label,
                color: c.color,
                min: danger,
                max: c.limit,
              }))
            );
          }

          migrated.push({ id: generateId(), type: 'RANGE', label: legacyLabels.danger, color: legacyColors.danger, min: danger, max: null });
          setCategories(migrated);
        }
      } catch (err) {
        console.error(err);
      }
    };

    loadSavedColors();
  }, []);

  const handleCellPress = (date: Date | null, amount: number | null) => {
    if (!date) return;
    const dateString = format(date, 'MMMM do, yyyy');
    const amountString = amount !== null ? `$${amount.toFixed(2)}` : 'No spending';
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
      return '2025';
    }
    return format(anchorDate, 'MMMM yyyy');
  }, [anchorDate, view]);

  const shiftAnchorDate = (direction: -1 | 1) => {
    if (view !== 'MONTH') return;
    setAnchorDate((prev) => {
      const nextMonth = (prev.getMonth() + direction + 12) % 12;
      return new Date(2025, nextMonth, 15);
    });
  };

  const openDateFilter = () => {
    if (view !== 'MONTH') return;
    setDraftAnchorDate(anchorDate);
    setIsDateFilterVisible(true);
  };

  const closeDateFilter = () => {
    setIsDateFilterVisible(false);
  };

  const saveDateFilter = () => {
    setAnchorDate(new Date(2025, draftAnchorDate.getMonth(), 15));
    setIsDateFilterVisible(false);
  };

  const openColorSettings = () => {
    setDraftCategories(categories);
    setIsColorSettingsVisible(true);
  };

  const closeColorSettings = () => {
    setIsColorSettingsVisible(false);
  };

  const addDraftRangeCategory = () => {
    setDraftCategories((prev) => [
      ...prev,
      { id: generateId(), type: 'RANGE', label: 'New Category', color: EXTRA_CATEGORY_COLOR_PRESETS[0], min: 0, max: null },
    ]);
  };

  const addDraftEmptyCategory = () => {
    setDraftCategories((prev) => {
      const hasEmpty = prev.some((c) => c.type === 'EMPTY');
      if (hasEmpty) return prev;
      return [...prev, { id: generateId(), type: 'EMPTY', label: 'No Spending', color: NEUTRAL_EMPTY_COLOR }];
    });
  };

  const removeDraftCategory = (id: string) => {
    setDraftCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const updateDraftCategoryLabel = (id: string, label: string) => {
    setDraftCategories((prev) => prev.map((c) => (c.id === id ? { ...c, label } : c)));
  };

  const updateDraftCategoryMin = (id: string, value: string) => {
    const parsed = Number(value);
    setDraftCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.type !== 'RANGE') return c;
        return { ...c, min: Number.isFinite(parsed) ? Math.max(0, parsed) : 0 };
      })
    );
  };

  const updateDraftCategoryMax = (id: string, value: string) => {
    const parsed = Number(value);
    setDraftCategories((prev) =>
      prev.map((c) => {
        if (c.id !== id || c.type !== 'RANGE') return c;
        if (value.trim() === '') return { ...c, max: null };
        return { ...c, max: Number.isFinite(parsed) ? Math.max(c.min, parsed) : c.max };
      })
    );
  };

  const updateDraftCategoryColor = (id: string, color: string) => {
    setDraftCategories((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
  };

  const saveColorSettings = async () => {
    setCategories(draftCategories);
    setIsColorSettingsVisible(false);

    try {
      const user = auth.currentUser;
      if (!user) return;
      await setDoc(
        doc(db1, 'users', user.uid),
        {
          heatmapCategories: draftCategories,
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
            <View style={styles.filterSinglePill}>
              <Text style={styles.filterCenterText}>{viewDetailsText}</Text>
            </View>
          )}
        </View>
        <ScrollView style={styles.contentScrollView}>
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

              {view === 'MONTH' && (
                <View>
                  <View style={styles.monthHeaderRow}>
                    <View style={styles.monthHeaderSpacer} />
                    <Text style={styles.monthHeaderText}>2025</Text>
                    <View style={styles.monthHeaderSpacer} />
                  </View>
                  <View style={styles.monthGridPicker}>
                    {Array.from({ length: 12 }, (_, i) => i).map((m) => {
                      const isActive = m === draftAnchorDate.getMonth();
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.monthChip, isActive ? styles.monthChipActive : null]}
                          onPress={() => setDraftAnchorDate(new Date(2025, m, 15))}
                        >
                          <Text style={[styles.monthChipText, isActive ? styles.monthChipTextActive : null]}>{format(new Date(2025, m, 1), 'MMM')}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

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
                  <TouchableOpacity style={styles.modalIconBtn} onPress={addDraftRangeCategory}>
                    <Feather name="plus" size={20} color={PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalIconBtn} onPress={closeColorSettings}>
                    <Feather name="x" size={22} color={PRIMARY} />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.tagsCard}>
                  <Text style={styles.tagsTitle}>Your Categories</Text>

                  {draftCategories.length === 0 ? (
                    <Text style={styles.tagsEmptyText}>No categories yet. Add at least one range category to see colors on the heatmap.</Text>
                  ) : (
                    draftCategories.map((cat) => (
                      <ExtraCategoryRow
                        key={cat.id}
                        category={cat}
                        onChangeLabel={updateDraftCategoryLabel}
                        onChangeMin={updateDraftCategoryMin}
                        onChangeMax={updateDraftCategoryMax}
                        onChangeColor={updateDraftCategoryColor}
                        onRemove={removeDraftCategory}
                      />
                    ))
                  )}

                  <View style={styles.addCategoryRow}>
                    <TouchableOpacity style={styles.addCategorySecondaryBtn} onPress={addDraftEmptyCategory}>
                      <Text style={styles.addCategorySecondaryText}>Add No-Spending</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addTagButton} onPress={addDraftRangeCategory}>
                      <Text style={styles.addTagButtonText}>Add Range</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => {
                    setDraftCategories([]);
                  }}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: PRIMARY,
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
  extraCategoryLabelInput: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    fontWeight: '800',
    color: PRIMARY,
    marginRight: 10,
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
  extraCategoryColorRow: {
    paddingTop: 2,
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
