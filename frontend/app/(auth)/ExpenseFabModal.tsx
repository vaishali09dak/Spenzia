import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';

import { doc, getDoc, addDoc, setDoc } from 'firebase/firestore';
import { auth, db1 } from '../../firebase';

type ModalType = 'category' | 'income' | 'expense' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
}

const ALL_COLORS = [
  '#64B5F6','#FFB74D','#EF5350','#66BB6A','#BA68C8','#FF7043','#42A5F5','#78909C',
  '#26C6DA','#FFA726','#EC407A','#AB47BC','#5C6BC0','#26A69A','#FF5252','#9CCC65'
];

const EMOJIS = [
  '🚗','🛍️','💡','💊','🎬','📚','📦','✈️','🏠','🎮','🎵','💼','🏋️','🎨','📱','🚌','🎁','💻','🔧'
];

const INITIAL_CATEGORIES = [
  { name: 'Food', emoji: '🍔', color: '#64B5F6' },
  { name: 'Transport', emoji: '🚗', color: '#FFB74D' },
  { name: 'Shopping', emoji: '🛍️', color: '#EF5350' },
  { name: 'Bills', emoji: '💡', color: '#66BB6A' },
  { name: 'Health', emoji: '💊', color: '#BA68C8' },
  { name: 'Entertainment', emoji: '🎬', color: '#FF7043' },
  { name: 'Education', emoji: '📚', color: '#42A5F5' },
  { name: 'Other', emoji: '📦', color: '#78909C' },
];

const ExpenseFabModal: React.FC<Props> = ({ visible, onClose }) => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [usedColors, setUsedColors] = useState(INITIAL_CATEGORIES.map(c => c.color));
  const [categoryName, setCategoryName] = useState('');
  const [categoryEmoji, setCategoryEmoji] = useState('');
  const [categoryColor, setCategoryColor] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [note, setNote] = useState('');

  const openForm = (type: ModalType) => setModalType(type);

  const closeForm = () => {
    setModalType(null);
    setCategoryName('');
    setCategoryEmoji('');
    setCategoryColor('');
    setAmount('');
    setSelectedCategory('');
    setNote('');
  };

  const closeModal = () => {
    closeForm();
    onClose();
  };

  const submitCategory = async () => {
  if (!categoryName || !categoryEmoji || !categoryColor) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(
      doc(db1, 'users', user.uid, 'categories', categoryName),
      {
        name: categoryName,
        emoji: categoryEmoji,
        color: categoryColor,
        createdAt: new Date(),
      }
    );

    setCategories([
      ...categories,
      { name: categoryName, emoji: categoryEmoji, color: categoryColor },
    ]);

    closeForm();
  } catch (err) {
    console.log(err);
  }
};


  const submitIncome = async () => {
  if (!amount || !selectedCategory) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(
      doc(db1, 'users', user.uid, 'transactions', Date.now().toString()),
      {
        type: 'income',
        amount: Number(amount),
        category: selectedCategory,
        note,
        createdAt: new Date(),
      }
    );

    closeForm();
  } catch (err) {
    console.log(err);
  }
};

const submitExpense = async () => {
  if (!amount || !selectedCategory) return;

  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(
      doc(db1, 'users', user.uid, 'transactions', Date.now().toString()),
      {
        type: 'expense',
        amount: Number(amount),
        category: selectedCategory,
        note,
        createdAt: new Date(),
      }
    );

    closeForm();
  } catch (err) {
    console.log(err);
  }
};


  const CategoryForm = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.formHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#F3E5F5' }]}>
          <Text style={styles.iconText}>📁</Text>
        </View>
        <Text style={styles.title}>Add Category</Text>
        <Text style={styles.subtitle}>Create a new spending category</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Category Name</Text>
        <TextInput 
          placeholder="e.g., Groceries" 
          placeholderTextColor="#999"
          value={categoryName} 
          onChangeText={setCategoryName} 
          style={styles.input} 
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Choose Emoji</Text>
        <View style={styles.emojiGrid}>
          {EMOJIS.map(e => (
            <TouchableOpacity 
              key={e} 
              style={[styles.emojiBox, categoryEmoji === e && styles.emojiSelected]} 
              onPress={() => setCategoryEmoji(e)}
              activeOpacity={0.7}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Choose Color</Text>
        <View style={styles.colorGrid}>
          {ALL_COLORS.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[styles.colorBox, { backgroundColor: c }, categoryColor === c && styles.colorSelected]} 
              onPress={() => setCategoryColor(c)}
              activeOpacity={0.8}
            />
          ))}
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, (!categoryName || !categoryEmoji || !categoryColor) && styles.submitBtnDisabled]} 
        onPress={submitCategory}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>Save Category</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const IncomeForm = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.formHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#E8F5F3' }]}>
          <Text style={styles.iconText}>💰</Text>
        </View>
        <Text style={styles.title}>Add Income</Text>
        <Text style={styles.subtitle}>Track your earnings</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput 
            placeholder="0.00" 
            placeholderTextColor="#999"
            value={amount} 
            keyboardType="numeric" 
            onChangeText={setAmount} 
            style={styles.amountInput} 
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.name} 
              style={[
                styles.categoryChip, 
                selectedCategory === cat.name && { 
                  backgroundColor: cat.color,
                  borderColor: cat.color,
                }
              ]} 
              onPress={() => setSelectedCategory(cat.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
              <Text style={[
                styles.categoryChipText, 
                selectedCategory === cat.name && styles.categoryChipTextSelected
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={styles.addCategoryChip}
            onPress={() => openForm('category')}
            activeOpacity={0.7}
          >
            <Text style={styles.addCategoryText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput 
          placeholder="Add a note..." 
          placeholderTextColor="#999"
          value={note} 
          onChangeText={setNote} 
          style={[styles.input, styles.noteInput]}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, { backgroundColor: '#1DD3B0' }, (!amount || !selectedCategory) && styles.submitBtnDisabled]} 
        onPress={submitIncome}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>Add Income</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const ExpenseForm = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.formHeader}>
        <View style={[styles.iconCircle, { backgroundColor: '#FFE8E8' }]}>
          <Text style={styles.iconText}>💸</Text>
        </View>
        <Text style={styles.title}>Add Expense</Text>
        <Text style={styles.subtitle}>Record your spending</Text>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputWrapper}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput 
            placeholder="0.00" 
            placeholderTextColor="#999"
            value={amount} 
            keyboardType="numeric" 
            onChangeText={setAmount} 
            style={styles.amountInput} 
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Select Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.name} 
              style={[
                styles.categoryChip, 
                selectedCategory === cat.name && { 
                  backgroundColor: cat.color,
                  borderColor: cat.color,
                }
              ]} 
              onPress={() => setSelectedCategory(cat.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryChipEmoji}>{cat.emoji}</Text>
              <Text style={[
                styles.categoryChipText, 
                selectedCategory === cat.name && styles.categoryChipTextSelected
              ]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity 
            style={styles.addCategoryChip}
            onPress={() => openForm('category')}
            activeOpacity={0.7}
          >
            <Text style={styles.addCategoryText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput 
          placeholder="Add a note..." 
          placeholderTextColor="#999"
          value={note} 
          onChangeText={setNote} 
          style={[styles.input, styles.noteInput]}
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity 
        style={[styles.submitBtn, { backgroundColor: '#FF6B6B' }, (!amount || !selectedCategory) && styles.submitBtnDisabled]} 
        onPress={submitExpense}
        activeOpacity={0.8}
      >
        <Text style={styles.submitText}>Add Expense</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.modalHandle} />
          
          {!modalType && (
            <View style={styles.fabContainer}>
              <Text style={styles.fabTitle}>What would you like to do?</Text>
              <View style={styles.fabButtons}>
                <TouchableOpacity 
                  style={styles.fabWrapper}
                  onPress={() => openForm('category')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#9B59B6' }]}>
                    <Text style={styles.fabText}>📁</Text>
                  </View>
                  <Text style={styles.fabLabel}>Category</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.fabWrapper}
                  onPress={() => openForm('income')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#1DD3B0' }]}>
                    <Text style={styles.fabText}>💰</Text>
                  </View>
                  <Text style={styles.fabLabel}>Income</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.fabWrapper}
                  onPress={() => openForm('expense')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#FF6B6B' }]}>
                    <Text style={styles.fabText}>💸</Text>
                  </View>
                  <Text style={styles.fabLabel}>Expense</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {modalType === 'category' && <CategoryForm />}
          {modalType === 'income' && <IncomeForm />}
          {modalType === 'expense' && <ExpenseForm />}

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={closeModal}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default ExpenseFabModal;

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'flex-end' 
  },
  modal: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  fabContainer: { 
    paddingVertical: 12,
    marginBottom: 8,
  },
  fabTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 24,
  },
  fabButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
  },
  fabWrapper: {
    alignItems: 'center',
    gap: 12,
  },
  fab: { 
    width: 72, 
    height: 72, 
    borderRadius: 36, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { 
    fontSize: 32,
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },

  formHeader: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 36,
  },
  title: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#212121',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '400',
  },

  section: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#424242',
    marginBottom: 10,
  },
  input: { 
    backgroundColor: '#F8F9FA', 
    padding: 16, 
    borderRadius: 14,
    fontSize: 16,
    color: '#212121',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },

  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#424242',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
  },

  emojiGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiBox: { 
    width: 52, 
    height: 52, 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderWidth: 2, 
    borderColor: '#E8EAED', 
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
  },
  emojiSelected: { 
    borderColor: '#64B5F6', 
    borderWidth: 3,
    backgroundColor: '#E3F2FD',
    transform: [{ scale: 1.05 }],
  },
  emojiText: {
    fontSize: 26,
  },

  colorGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap',
    gap: 10,
  },
  colorBox: { 
    width: 48, 
    height: 48, 
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorSelected: { 
    borderWidth: 4, 
    borderColor: '#212121',
    transform: [{ scale: 1.1 }],
  },

  categoryList: {
    gap: 10,
  },
  categoryBtn: { 
    padding: 16, 
    borderRadius: 14, 
    backgroundColor: '#F8F9FA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  categoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  categoryEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmojiText: {
    fontSize: 22,
  },
  categoryText: { 
    fontSize: 16, 
    fontWeight: '600',
    color: '#424242',
  },
  categoryTextSelected: {
    color: '#FFFFFF',
  },
  checkmark: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E8EAED',
  },
  categoryChipEmoji: {
    fontSize: 18,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#9B59B6',
    borderStyle: 'dashed',
  },
  addCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9B59B6',
  },

  noteInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  submitBtn: { 
    backgroundColor: '#64B5F6', 
    padding: 18, 
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  submitBtnDisabled: {
    backgroundColor: '#BDBDBD',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: { 
    color: '#FFFFFF', 
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },

  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: '600',
  },
});