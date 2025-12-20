import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';

import { doc, setDoc } from 'firebase/firestore';
import { auth, db1 } from '../../firebase';

type ModalType = 'income' | 'expense' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Category = {
  name: string;
  color: string;
};

const AmountInput: React.FC<{ amountRef: React.MutableRefObject<string> }> = ({ amountRef }) => (
  <View style={styles.inputContainer}>
    <Text style={styles.label}>Amount</Text>
    <View style={styles.amountInputWrapper}>
      <Text style={styles.currencySymbol}>₹</Text>
      <TextInput
        placeholder="0.00"
        placeholderTextColor="#999"
        keyboardType="number-pad"
        defaultValue={amountRef.current}
        onChangeText={(text) => (amountRef.current = text)}
        style={styles.amountInput}
      />
    </View>
  </View>
);

const CategorySection: React.FC<{
  categories: Category[];
  selectedCategory: string;
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>;
}> = ({ categories, selectedCategory, setSelectedCategory }) => (
  <View style={styles.section}>
    <Text style={styles.label}>Select Category</Text>
    <View style={styles.categoryGrid}>
      {categories.map((cat) => (
        <TouchableOpacity
          key={cat.name}
          style={[
            styles.categoryChip,
            selectedCategory === cat.name && {
              backgroundColor: cat.color,
              borderColor: cat.color,
            },
          ]}
          onPress={() => setSelectedCategory(cat.name)}
        >
          <Text
            style={[
              styles.categoryChipText,
              selectedCategory === cat.name && styles.categoryChipTextSelected,
            ]}
          >
            {cat.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const NoteInput: React.FC<{
  note: string;
  setNote: React.Dispatch<React.SetStateAction<string>>;
}> = ({ note, setNote }) => (
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
      blurOnSubmit={false}
      scrollEnabled={false}
    />
  </View>
);

const INITIAL_CATEGORIES = [
  { name: 'Food', color: '#64B5F6' },
  { name: 'Transport', color: '#FFB74D' },
  { name: 'Shopping', color: '#EF5350' },
  { name: 'Bills', color: '#66BB6A' },
  { name: 'Health', color: '#BA68C8' },
  { name: 'Entertainment', color: '#FF7043' },
  { name: 'Education', color: '#42A5F5' },
  { name: 'Other', color: '#78909C' },
];

const ExpenseFabModal: React.FC<Props> = ({ visible, onClose }) => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [categories] = useState(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [note, setNote] = useState('');

  // 🔥 FIX: amount via ref (uncontrolled input)
  const amountRef = useRef('');

  const openForm = (type: ModalType) => setModalType(type);

  const closeForm = () => {
    setModalType(null);
    setSelectedCategory('');
    setNote('');
    amountRef.current = '';
  };

  const closeModal = () => {
    closeForm();
    onClose();
  };

  const submitIncome = async () => {
    if (!amountRef.current || !selectedCategory) return;
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(
      doc(db1, 'users', user.uid, 'transactions', Date.now().toString()),
      {
        type: 'income',
        amount: Number(amountRef.current),
        category: selectedCategory,
        note,
        createdAt: new Date(),
      }
    );

    closeForm();
  };

  const submitExpense = async () => {
    if (!amountRef.current || !selectedCategory) return;
    const user = auth.currentUser;
    if (!user) return;

    await setDoc(
      doc(db1, 'users', user.uid, 'transactions', Date.now().toString()),
      {
        type: 'expense',
        amount: Number(amountRef.current),
        category: selectedCategory,
        note,
        createdAt: new Date(),
      }
    );

    closeForm();
  };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'none'}
      transparent
    >
      <View style={[styles.overlay, !modalType && styles.overlayCentered]}>
        <View style={[styles.modal, !modalType && styles.modalCentered]}>
          <View style={styles.modalHandle} />

          {!modalType && (
            <View style={styles.fabContainer}>
              <Text style={styles.fabTitle}>What would you like to add?</Text>
              <View style={styles.fabButtons}>
                <TouchableOpacity
                  style={styles.fabWrapper}
                  onPress={() => openForm('income')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.fabText}>💵</Text>
                  </View>
                  <Text style={styles.fabLabel}>Income</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fabWrapper}
                  onPress={() => openForm('expense')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#EF4444' }]}>
                    <Text style={styles.fabText}>💳</Text>
                  </View>
                  <Text style={styles.fabLabel}>Expense</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {modalType && (
            <ScrollView
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="none"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <AmountInput amountRef={amountRef} />
              <CategorySection
                categories={categories}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
              />
              <NoteInput note={note} setNote={setNote} />

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  modalType === 'income'
                    ? { backgroundColor: '#10B981' }
                    : { backgroundColor: '#EF4444' },
                ]}
                onPress={modalType === 'income' ? submitIncome : submitExpense}
              >
                <Text style={styles.submitText}>
                  {modalType === 'income' ? 'Add Income' : 'Add Expense'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
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
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
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
  modalCentered: {
    width: '90%',
    borderRadius: 28,
    maxHeight: 'auto',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 10,
  },

  fabContainer: { 
    paddingVertical: 12,
    marginBottom: 8,
  },
  fabTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.3,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 0.2,
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
    backgroundColor: '#F9FAFB', 
    padding: 16, 
    borderRadius: 14,
    fontSize: 16,
    color: '#1F2937',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },

  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700',
    color: '#5B8DEF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 16,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
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