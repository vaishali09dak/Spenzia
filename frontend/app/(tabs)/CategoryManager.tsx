import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';

import { auth, db1 } from '../../firebase';

type Category = {
  id: string;
  name: string;
  isOther?: boolean;
};

type CategoryItem = Category & { __placeholder?: boolean };

const orderCategories = (cats: Category[]) => {
  const defaultOrder = DEFAULT_CATEGORIES.map((c) => c.name.toLowerCase());
  const defaultRank = new Map(defaultOrder.map((n, i) => [n, i] as const));

  const defaults: Category[] = [];
  const customs: Category[] = [];
  let other: Category | null = null;

  cats.forEach((c) => {
    const n = c.name.toLowerCase();
    if (c.isOther || n === 'other') {
      other = { ...c, isOther: true };
      return;
    }

    if (defaultRank.has(n)) defaults.push(c);
    else customs.push(c);
  });

  defaults.sort(
    (a, b) => (defaultRank.get(a.name.toLowerCase()) ?? 0) - (defaultRank.get(b.name.toLowerCase()) ?? 0)
  );
  customs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  return other ? [...defaults, ...customs, other] : [...defaults, ...customs];
};

const iconForCategory = (name: string) => {
  const n = name.trim().toLowerCase();
  if (n.includes('food') || n.includes('groc')) return 'restaurant-outline';
  if (n.includes('travel') || n.includes('trip')) return 'airplane-outline';
  if (n.includes('shop')) return 'bag-outline';
  if (n.includes('util') || n.includes('bill') || n.includes('electric')) return 'flash-outline';
  if (n.includes('rent') || n.includes('house') || n.includes('home')) return 'home-outline';
  if (n.includes('entertain') || n.includes('movie') || n.includes('game')) return 'game-controller-outline';
  if (n.includes('health') || n.includes('med')) return 'medkit-outline';
  if (n.includes('edu') || n.includes('school')) return 'school-outline';
  if (n === 'other') return 'options-outline';
  return 'pricetag-outline';
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'Food', name: 'Food' },
  { id: 'Travel', name: 'Travel' },
  { id: 'Shopping', name: 'Shopping' },
  { id: 'Utilities', name: 'Utilities' },
  { id: 'Rent', name: 'Rent' },
  { id: 'Entertainment', name: 'Entertainment' },
  { id: 'Other', name: 'Other', isOther: true },
  // { id: 'Other', name: 'Other', isOther: true },
];

const { width } = Dimensions.get('window');
const GRID_PADDING = 22;
const TILE_GAP = 22;
const TILE_SIZE = (width - GRID_PADDING * 2 - TILE_GAP * 2) / 3;

const TOP_INSET = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');

  const [isManageVisible, setIsManageVisible] = useState(false);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  const [editing, setEditing] = useState<Category | null>(null);
  const [draftName, setDraftName] = useState('');

  const loadCategories = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      const snap = await getDocs(collection(db1, 'users', user.uid, 'categories'));
      const remote: Category[] = [];
      snap.forEach((d) => {
        const data = d.data() as any;
        if (!data?.name) return;
        const name = String(data.name);
        if (name.toLowerCase() === 'other') return;
        remote.push({
          id: d.id,
          name,
        });
      });

      remote.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

      const merged: Category[] = [...DEFAULT_CATEGORIES];
      remote.forEach((r) => {
        const exists = merged.some((c) => c.name.toLowerCase() === r.name.toLowerCase());
        if (!exists) merged.push(r);
      });

      setCategories(orderCategories(merged));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openEditorForNew = () => {
    setEditing(null);
    setDraftName('');
    setIsEditorVisible(true);
  };

  const openEditorForEdit = (cat: Category) => {
    setEditing(cat);
    setDraftName(cat.name);
    setIsEditorVisible(true);
  };

  const closeEditor = () => {
    setIsEditorVisible(false);
    setEditing(null);
  };

  const saveCategory = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = draftName.trim();
    if (!name) return;

    if (name.toLowerCase() === 'other') {
      Alert.alert('Not allowed', '"Other" is reserved. Please choose a different name.');
      return;
    }

    const id = name;

    try {
      if (editing && editing.id !== id) {
        await setDoc(doc(db1, 'users', user.uid, 'categories', id), {
          name,
          updatedAt: new Date(),
          createdAt: new Date(),
        });
        await deleteDoc(doc(db1, 'users', user.uid, 'categories', editing.id));
      } else {
        await setDoc(
          doc(db1, 'users', user.uid, 'categories', editing ? editing.id : id),
          {
            name,
            updatedAt: new Date(),
            createdAt: new Date(),
          },
          { merge: true }
        );
      }

      await loadCategories();
      closeEditor();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save category.');
    }
  };

  const confirmDelete = (cat: Category) => {
    Alert.alert('Delete category', `Delete "${cat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const user = auth.currentUser;
          if (!user) return;
          try {
            await deleteDoc(doc(db1, 'users', user.uid, 'categories', cat.id));
            await loadCategories();
          } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to delete category.');
          }
        },
      },
    ]);
  };

  const openManage = () => {
    setIsManageVisible(true);
  };

  const editableCategories = useMemo(() => {
    const defaults = new Set(DEFAULT_CATEGORIES.map((c) => c.name.toLowerCase()));
    return categories.filter((c) => !defaults.has(c.name.toLowerCase()) && !c.isOther);
  }, [categories]);

  const visibleCategories = useMemo((): CategoryItem[] => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  const gridData = useMemo((): CategoryItem[] => {
    const data: CategoryItem[] = [...visibleCategories];
    const remainder = data.length % 3;
    if (remainder === 0) return data;

    const padsNeeded = 3 - remainder;
    for (let i = 0; i < padsNeeded; i += 1) {
      data.push({ id: `__placeholder__${i}`, name: '', __placeholder: true });
    }
    return data;
  }, [visibleCategories]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topIconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View style={styles.topRightSpacer} />
      </View>

      <View style={styles.hero}>
        <Text style={styles.pageTitle}>Categories</Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        {/* <Text style={styles.sectionTitle}>Categories</Text> */}
      </View>

      <View style={styles.body}>
        <FlatList
          data={gridData}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadCategories}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item, index }) => {
            if (item.__placeholder) {
              return (
                <View
                  style={[
                    styles.card,
                    styles.cardPlaceholder,
                    index % 3 !== 2 ? { marginRight: TILE_GAP } : null,
                  ]}
                />
              );
            }

            return (
              <TouchableOpacity
                style={[
                  styles.card,
                  index % 3 !== 2 ? { marginRight: TILE_GAP } : null,
                ]}
                activeOpacity={0.85}
                onPress={item.isOther ? openManage : undefined}
                disabled={!item.isOther}
              >
                <View style={styles.cardInner}>
                  <View style={[styles.iconBubble, item.isOther ? styles.iconBubbleOther : null]}>
                    <Ionicons
                      name={iconForCategory(item.name) as any}
                      size={24}
                      color={item.isOther ? '#111827' : '#111827'}
                    />
                  </View>

                  <Text style={styles.cardLabel} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <TouchableOpacity style={styles.fab} onPress={openEditorForNew} activeOpacity={0.9}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      <Modal transparent animationType="fade" visible={isManageVisible} onRequestClose={() => setIsManageVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.manageCard}>
            <View style={styles.manageHeader}>
              <Text style={styles.manageTitle}>Manage categories</Text>
              <View style={styles.manageHeaderActions}>
                <TouchableOpacity style={styles.manageHeaderBtn} onPress={openEditorForNew}>
                  <Ionicons name="add" size={20} color="#111827" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageHeaderBtn} onPress={() => setIsManageVisible(false)}>
                  <Ionicons name="close" size={20} color="#111827" />
                </TouchableOpacity>
              </View>
            </View>

            {editableCategories.length === 0 ? (
              <Text style={styles.emptyText}>No custom categories yet.</Text>
            ) : (
              <FlatList
                data={editableCategories}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.manageRow}>
                    <View style={styles.manageLeft}>
                      <Text style={styles.manageName}>{item.name}</Text>
                    </View>
                    <View style={styles.manageRight}>
                      <TouchableOpacity style={styles.manageActionBtn} onPress={() => openEditorForEdit(item)}>
                        <Ionicons name="create-outline" size={18} color="#111827" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.manageActionBtn} onPress={() => confirmDelete(item)}>
                        <Ionicons name="trash-outline" size={18} color="#D32F2F" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal transparent animationType="slide" visible={isEditorVisible} onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <View style={styles.editorCard}>
            <View style={styles.manageHeader}>
              <Text style={styles.manageTitle}>{editing ? 'Edit category' : 'Add category'}</Text>
              <TouchableOpacity style={styles.manageHeaderBtn} onPress={closeEditor}>
                <Ionicons name="close" size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="e.g. Groceries"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, !draftName.trim() ? styles.saveBtnDisabled : null]}
              onPress={saveCategory}
              disabled={!draftName.trim()}
            >
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF9F2',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: TOP_INSET + 6,
    paddingBottom: 2,
  },
  topIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  topRightSpacer: {
    width: 44,
    height: 44,
  },
  hero: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 10,
  },
  pageTitle: {
    marginTop: 10,
    fontSize: 34,
    fontWeight: '900',
    color: '#1F305E',
    letterSpacing: 0.2,
  },
  searchWrap: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 46,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E6ECFF',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionTitle: {
    marginTop: 18,
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  header: {
    height: 110,
    backgroundColor: '#69B6D4',
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerCurveCover: {
    height: 18,
    marginTop: -18,
    backgroundColor: '#F7EFE7',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: GRID_PADDING,
    paddingTop: 0,
  },
  grid: {
    paddingBottom: 120,
    paddingTop: 12,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  card: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.10)',
    marginBottom: TILE_GAP,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  cardSelected: {
    borderWidth: 2,
    borderColor: '#111827',
    backgroundColor: '#F8FAFC',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  selectedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardPlaceholder: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  iconBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconBubbleOther: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
  },
  tile: {
    width: TILE_SIZE,
    alignItems: 'center',
  },
  circleShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  circle: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: TILE_SIZE / 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  manageCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
  },
  editorCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    maxHeight: '90%',
  },
  manageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  manageTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  manageHeaderActions: {
    flexDirection: 'row',
  },
  manageHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 18,
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '700',
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  manageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  manageName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  manageRight: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  manageActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#F7F8FC',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F7F8FC',
    paddingHorizontal: 12,
    fontWeight: '700',
    color: '#111827',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  saveBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#5B8DEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '900',
  },
});
