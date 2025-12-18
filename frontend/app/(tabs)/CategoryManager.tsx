import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Modal,
  SafeAreaView,
  StyleSheet,
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

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'Food', name: 'Food' },
  { id: 'Travel', name: 'Travel' },
  { id: 'Shopping', name: 'Shopping' },
  { id: 'Utilities', name: 'Utilities' },
  { id: 'Rent', name: 'Rent' },
  { id: 'Entertainment', name: 'Entertainment' },
  { id: 'Other', name: 'Other', isOther: true },
];

const { width } = Dimensions.get('window');
const GRID_PADDING = 22;
const TILE_GAP = 22;
const TILE_SIZE = (width - GRID_PADDING * 2 - TILE_GAP * 2) / 3;

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(false);

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

      const merged: Category[] = [...DEFAULT_CATEGORIES];
      remote.forEach((r) => {
        const exists = merged.some((c) => c.name.toLowerCase() === r.name.toLowerCase());
        if (!exists) merged.push(r);
      });

      setCategories(merged);
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

  const handleCategoryPress = (cat: Category) => {
    if (cat.isOther) {
      setIsManageVisible(true);
      return;
    }
    Alert.alert('Selected', cat.name);
  };

  const editableCategories = useMemo(() => {
    const defaults = new Set(DEFAULT_CATEGORIES.map((c) => c.name.toLowerCase()));
    return categories.filter((c) => !defaults.has(c.name.toLowerCase()) && !c.isOther);
  }, [categories]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select a category</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={openEditorForNew}>
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.headerCurveCover} />

      <View style={styles.body}>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          numColumns={3}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={loadCategories}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.tile} activeOpacity={0.85} onPress={() => handleCategoryPress(item)}>
              <View style={styles.circleShadow}>
                <View style={styles.circle}>
                  <Text
                    style={styles.circleText}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                  >
                    {item.name}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

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
    backgroundColor: '#F7EFE7',
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
    paddingTop: 18,
  },
  grid: {
    paddingBottom: 24,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 24,
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
