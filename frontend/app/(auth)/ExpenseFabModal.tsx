import React, { useState, useRef, useEffect } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';

import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

import { auth, db1 } from '../../firebase';

type ModalType = 'income' | 'expense' | null;
type InputMode = 'choice' | 'form' | 'sms' | 'result' | null;

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Category = {
  name: string;
  color: string;
};

interface ExtractedData {
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
}

const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Food', color: '#FF6B6B' },
  { name: 'Travel', color: '#4ECDC4' },
  { name: 'Shopping', color: '#F7DC6F' },
  { name: 'Utilities', color: '#FFA07A' },
  { name: 'Rent', color: '#98D8C8' },
  { name: 'Health', color: '#BB8FCE' },
  { name: 'Education', color: '#45B7D1' },
  { name: 'Entertainment', color: '#64B5F6' },
  { name: 'Other', color: '#78909C' },
];


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

const ExpenseFabModal: React.FC<Props> = ({ visible, onClose }) => {
  const [modalType, setModalType] = useState<ModalType>(null);
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [note, setNote] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);

  const amountRef = useRef('');

  const openTypeSelection = (type: ModalType) => {
    setModalType(type);
    setInputMode('choice');
  };

  const openForm = () => setInputMode('form');
  const openSMS = () => setInputMode('sms');

  const closeForm = () => {
    setModalType(null);
    setInputMode(null);
    setSelectedCategory('');
    setNote('');
    setSmsMessage('');
    setExtractedData(null);
    amountRef.current = '';
  };

  const closeModal = () => {
    closeForm();
    onClose();
  };

  const goBack = () => {
    if (inputMode === 'result') {
      closeModal();
    } else if (inputMode === 'form' || inputMode === 'sms') {
      setInputMode('choice');
      setSelectedCategory('');
      setNote('');
      setSmsMessage('');
      setExtractedData(null);
      amountRef.current = '';
    } else if (inputMode === 'choice') {
      setModalType(null);
      setInputMode(null);
    }
  };

  useEffect(() => {
  if (!visible) return;

  const loadCategories = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const snap = await getDocs(
        collection(db1, 'users', user.uid, 'categories')
      );

      const userCategories: Category[] = [];

      snap.forEach((doc) => {
        const data = doc.data();
        if (!data?.name) return;

        userCategories.push({
          name: data.name,
          color: data.color || '#78909C',
        });
      });

      // ✅ Merge DEFAULT + USER categories (no duplicates)
      const mergedMap = new Map<string, Category>();

      DEFAULT_CATEGORIES.forEach((cat) => {
        mergedMap.set(cat.name.toLowerCase(), cat);
      });

      userCategories.forEach((cat) => {
        mergedMap.set(cat.name.toLowerCase(), cat);
      });

      // ✅ Convert to array
      const merged = Array.from(mergedMap.values());

      // ✅ Keep "Other" at the end
      merged.sort((a, b) => {
        if (a.name === 'Other') return 1;
        if (b.name === 'Other') return -1;
        return a.name.localeCompare(b.name);
      });

      setCategories(merged);
      setSelectedCategory('');
    } catch (e) {
      console.error(e);
    }
  };

  loadCategories();
}, [visible]);



  const extractAmount = (text: string): number | null => {
    const patterns = [
      /(?:₹|rs\.?|inr)\s?([\d,]+(?:\.\d+)?)/i,
      /([\d,]+(?:\.\d+)?)\s*(?:₹|rs\.?|rupees?)/i,
      /(?:amount|paid|received|spent|debited|credited)[\s:]*(?:₹|rs\.?)?\s*([\d,]+(?:\.\d+)?)/i,
      /([\d,]+(?:\.\d+)?)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const numStr = match[1].replace(/,/g, '');
        const num = parseFloat(numStr);
        if (!isNaN(num) && num > 0) {
          return num;
        }
      }
    }
    return null;
  };

  const detectType = (text: string): 'income' | 'expense' => {
    const lowerText = text.toLowerCase();
    
    const incomeKeywords = ['credited', 'salary', 'refund', 'received', 'deposit', 'income', 'bonus', 'payment received'];
    const expenseKeywords = ['debited', 'paid', 'spent', 'purchased', 'bought', 'withdrawn', 'payment to', 'sent to'];
    
    for (const keyword of incomeKeywords) {
      if (lowerText.includes(keyword)) return 'income';
    }
    
    for (const keyword of expenseKeywords) {
      if (lowerText.includes(keyword)) return 'expense';
    }
    
    return 'expense';
  };

  const detectCategoryBasic = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    
    const categoryKeywords: { [key: string]: string[] } = {
      food: ['food', 'restaurant', 'cafe', 'meal', 'pizza', 'burger', 'swiggy', 'zomato', 'lunch', 'dinner', 'breakfast'],
      entertainment: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'concert', 'party'],
      education: ['course', 'college', 'school', 'udemy', 'book', 'tuition'],
      bill: ['bill', 'electricity', 'water', 'gas', 'recharge', 'internet', 'phone'],
      transport: ['uber', 'ola', 'bus', 'train', 'metro', 'fuel', 'petrol', 'taxi'],
      shopping: ['amazon', 'flipkart', 'myntra', 'shopping', 'store'],
      health: ['doctor', 'hospital', 'medicine', 'pharmacy', 'gym'],
      salary: ['salary', 'wage', 'income'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          return category;
        }
      }
    }
    
    return null;
  };

  const classifyWithAI = async (text: string, detectedType: 'income' | 'expense') => {
    const categoryNames = categories.map(c => c.name.toLowerCase()).join(' | ');
    
    const prompt = `
Classify this bank/UPI transaction message into one of the available categories.

Message:
"${text}"

Available categories: ${categoryNames}

The transaction type is: ${detectedType}

Return ONLY valid JSON in this format:
{
  "category": "one of the available categories listed above"
}

Choose the most appropriate category from the available options. If none fit well, use "other".`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await res.json();
      const content = data.content[0].text;

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiResult = JSON.parse(jsonMatch[0]);
        return aiResult.category;
      }

      return 'other';
    } catch (err) {
      console.error('AI classification failed', err);
      return 'other';
    }
  };

  const handleSMSExtract = async () => {
    if (!smsMessage.trim()) {
      Alert.alert('Error', 'Please paste a message first');
      return;
    }

    setLoadingAI(true);

    try {
      // Step 1: Extract Amount
      const amount = extractAmount(smsMessage);
      if (!amount) {
        Alert.alert('Error', 'Could not extract amount from the message');
        setLoadingAI(false);
        return;
      }

      // Step 2: Detect Type (Income/Expense)
      const detectedType = detectType(smsMessage);

      // Step 3: Detect Category
      let detectedCategory = detectCategoryBasic(smsMessage);
      
     
      // Match with user's categories
      const matchedCategory = categories.find(
        cat => cat.name.toLowerCase() === detectedCategory?.toLowerCase()
      );

      const finalCategory = matchedCategory ? matchedCategory.name : (categories.find(cat => cat.name === 'Other')?.name || 'Other');

      // Save to database
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'User not authenticated');
        setLoadingAI(false);
        return;
      }

      await addDoc(collection(db1, 'users', user.uid, 'transactions'), {
        type: detectedType,
        amount: amount,
        category: finalCategory,
        note: smsMessage.substring(0, 150),
        createdAt: serverTimestamp(),
      });

      // Store extracted data for display
      setExtractedData({
        amount,
        type: detectedType,
        category: finalCategory,
        note: smsMessage.substring(0, 150),
      });

      setLoadingAI(false);
      setInputMode('result');

    } catch (error) {
      console.error('SMS extraction error:', error);
      Alert.alert('Error', 'Failed to process and save the transaction');
      setLoadingAI(false);
    }
  };

  const submitTransaction = async () => {
    if (!amountRef.current || !selectedCategory) {
      Alert.alert('Error', 'Please fill amount and select category');
      return;
    }
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db1, 'users', user.uid, 'transactions'), {
      type: modalType,
      amount: Number(amountRef.current),
      category: selectedCategory,
      note,
      createdAt: serverTimestamp(),
    });

    closeForm();
  };

  const getCategoryColor = (categoryName: string): string => {
    const colorMap: { [key: string]: string } = {
      food: '#FF6B6B',
      entertainment: '#4ECDC4',
      education: '#45B7D1',
      bill: '#FFA07A',
      transport: '#98D8C8',
      shopping: '#F7DC6F',
      health: '#BB8FCE',
      salary: '#52C41A',
      other: '#78909C',
    };
    return colorMap[categoryName.toLowerCase()] || '#78909C';
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

          {/* Initial Type Selection */}
          {!modalType && (
            <View style={styles.fabContainer}>
              <Text style={styles.fabTitle}>What would you like to add?</Text>
              <View style={styles.fabButtons}>
                <TouchableOpacity
                  style={styles.fabWrapper}
                  onPress={() => openTypeSelection('expense')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#EF4444' }]}>
                    <Text style={styles.fabText}>💵</Text>
                  </View>
                  <Text style={styles.fabLabel}>Expense</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.fabWrapper}
                  onPress={() => openTypeSelection('income')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.fab, { backgroundColor: '#10B981' }]}>
                    <Text style={styles.fabText}>💳</Text>
                  </View>
                  <Text style={styles.fabLabel}>Income</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Input Mode Selection */}
          {modalType && inputMode === 'choice' && (
            <View style={styles.choiceContainer}>
              <Text style={styles.choiceTitle}>
                How would you like to add this {modalType}?
              </Text>
              
              <TouchableOpacity
                style={styles.choiceOption}
                onPress={openForm}
                activeOpacity={0.8}
              >
                <View style={styles.choiceIconContainer}>
                  <Text style={styles.choiceIcon}>📝</Text>
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceOptionTitle}>Fill Form Manually</Text>
                  <Text style={styles.choiceOptionSubtitle}>
                    Enter amount, category, and notes
                  </Text>
                </View>
                <Text style={styles.choiceArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.choiceOption}
                onPress={openSMS}
                activeOpacity={0.8}
              >
                <View style={styles.choiceIconContainer}>
                  <Text style={styles.choiceIcon}>📱</Text>
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceOptionTitle}>Read from SMS</Text>
                  <Text style={styles.choiceOptionSubtitle}>
                    AI-powered SMS transaction parsing
                  </Text>
                </View>
                <Text style={styles.choiceArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SMS Reading Mode */}
          {modalType && inputMode === 'sms' && (
            <ScrollView
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.smsHeader}>
                <View style={styles.smsIconCircle}>
                  <Text style={styles.smsIconText}>📱</Text>
                </View>
                <Text style={styles.smsTitle}>Read Transaction SMS</Text>
                <Text style={styles.smsSubtitle}>
                  Paste your bank or UPI message below
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Transaction Message</Text>
                <TextInput
                  placeholder="Paste your bank/UPI SMS here...&#10;&#10;Example:&#10;₹500 debited from your account"
                  placeholderTextColor="#999"
                  value={smsMessage}
                  onChangeText={setSmsMessage}
                  style={[styles.input, styles.smsTextArea]}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

      
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  modalType === 'expense'
                    ? { backgroundColor: '#EF4444' }
                    : { backgroundColor: '#10B981' },
                  loadingAI && styles.submitBtnDisabled,
                ]}
                onPress={handleSMSExtract}
                disabled={loadingAI}
              >
                
                <Text style={styles.submitText}>
                  Extract Data
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>💡 Example Messages:</Text>
                <Text style={styles.exampleText}>
                  • ₹500 debited for Swiggy order
                </Text>
                <Text style={styles.exampleText}>
                  • Rs 2,500 paid to electricity bill
                </Text>
                <Text style={styles.exampleText}>
                  • Salary credited ₹50,000
                </Text>
                <Text style={styles.exampleText}>
                  • Spent INR 1,200 on Flipkart
                </Text>
              </View>
            </ScrollView>
          )}

          {/* Result Display */}
          {inputMode === 'result' && extractedData && (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.resultHeader}>
                <View style={[styles.resultIconCircle, {
                  backgroundColor: extractedData.type === 'income' ? '#D1FAE5' : '#FEE2E2'
                }]}>
                  
                </View>
                <Text style={styles.resultTitle}>Transaction Saved!</Text>
                <Text style={styles.resultSubtitle}>
                  Your transaction has been successfully recorded
                </Text>
              </View>

              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Amount</Text>
                  <Text style={styles.resultValue}>₹{extractedData.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.resultDivider} />

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Type</Text>
                  <View style={[
                    styles.resultBadge,
                    { backgroundColor: extractedData.type === 'income' ? '#10B981' : '#EF4444' }
                  ]}>
                    <Text style={styles.resultBadgeText}>
                      {extractedData.type === 'income' ? '💰 INCOME' : '💸 EXPENSE'}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultDivider} />

                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Category</Text>
                  <View style={[
                    styles.resultBadge,
                    { backgroundColor: getCategoryColor(extractedData.category) }
                  ]}>
                    <Text style={styles.resultBadgeText}>
                      {extractedData.category.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {extractedData.note && (
                  <>
                    <View style={styles.resultDivider} />
                    <View style={styles.resultNoteContainer}>
                      <Text style={styles.resultLabel}>Note</Text>
                      <Text style={styles.resultNote}>{extractedData.note}</Text>
                    </View>
                  </>
                )}
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: '#10B981' }]}
                onPress={closeModal}
              >
                <Text style={styles.submitText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Form Mode */}
          {modalType && inputMode === 'form' && (
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
                  modalType === 'expense'
                    ? { backgroundColor: '#EF4444' }
                    : { backgroundColor: '#10B981' },
                ]}
                onPress={submitTransaction}
              >
                <Text style={styles.submitText}>
                  {modalType === 'expense' ? 'Add Expense' : 'Add Income'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {inputMode !== 'result' && (
            <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 28,
    maxHeight: '85%',
    width: '90%',
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

  choiceContainer: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  choiceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 0.3,
  },
  choiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  choiceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  choiceIcon: {
    fontSize: 28,
  },
  choiceTextContainer: {
    flex: 1,
  },
  choiceOptionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  choiceOptionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  choiceArrow: {
    fontSize: 24,
    color: '#9CA3AF',
    marginLeft: 8,
  },

  smsHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  smsIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  smsIconText: {
    fontSize: 40,
  },
  smsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 6,
  },
  smsSubtitle: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '400',
    textAlign: 'center',
  },
  smsTextArea: {
    minHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  
  exampleContainer: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  exampleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  exampleText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '500',
  },

  // Result Screen Styles
  resultHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resultIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  resultIconText: {
    fontSize: 48,
  },
  resultTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '400',
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  resultBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resultBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  resultDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  resultNoteContainer: {
    paddingTop: 8,
  },
  resultNote: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },

  section: {
    marginBottom: 16,
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
    height: 60,
    textAlignVertical: 'top',
    paddingTop: 8,
  },

  submitBtn: {
    backgroundColor: '#64B5F6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
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

  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 12,
  },
  backButtonText: {
    color: '#5B8DEF',
    fontSize: 15,
    fontWeight: '600',
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