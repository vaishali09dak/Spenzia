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
  counterparty?: string;
  date?: Date;
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



const ExpenseFabModal: React.FC<Props> = ({ visible, onClose }) => {
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [note, setNote] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  
  // New fields
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [counterparty, setCounterparty] = useState('');


  const amountRef = useRef('');

  const openForm = () => setInputMode('form');
  const openSMS = () => setInputMode('sms');

  const closeForm = () => {
    setInputMode(null);
    setSelectedCategory('');
    setNote('');
    setSmsMessage('');
    setExtractedData(null);
    setTransactionType('expense');
    
    setTransactionDate(new Date());
    setCounterparty('');
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

        const mergedMap = new Map<string, Category>();

        DEFAULT_CATEGORIES.forEach((cat) => {
          mergedMap.set(cat.name.toLowerCase(), cat);
        });

        userCategories.forEach((cat) => {
          mergedMap.set(cat.name.toLowerCase(), cat);
        });

        const merged = Array.from(mergedMap.values());

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
      utilities: ['bill', 'electricity', 'water', 'gas', 'recharge', 'internet', 'phone'],
      travel: ['uber', 'ola', 'bus', 'train', 'metro', 'fuel', 'petrol', 'taxi'],
      shopping: ['amazon', 'flipkart', 'myntra', 'shopping', 'store'],
      health: ['doctor', 'hospital', 'medicine', 'pharmacy', 'gym'],
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

  const fetchAIInsights = async (sms: string) => {
  if (sms.toLowerCase().includes('swiggy')) {
    return { category: 'Food', counterparty: 'Swiggy' };
  }
  if (sms.toLowerCase().includes('amazon')) {
    return { category: 'Shopping', counterparty: 'Amazon' };
  }
  if (sms.toLowerCase().includes('salary')) {
    return { category: 'Other', counterparty: 'Company' };
  }
  return { category: null, counterparty: '' };
};



  const handleSMSExtract = async () => {
  if (!smsMessage.trim()) {
    Alert.alert('Error', 'Please paste a message first');
    return;
  }

  setLoadingAI(true);

  try {
    const amount = extractAmount(smsMessage);
    if (!amount) {
      Alert.alert('Error', 'Could not extract amount from the message');
      setLoadingAI(false);
      return;
    }

    const detectedType = detectType(smsMessage);
    let detectedCategory = detectCategoryBasic(smsMessage);
let detectedCounterparty = '';

const aiResult = await fetchAIInsights(smsMessage);

if (!detectedCategory && aiResult.category) {
  detectedCategory = aiResult.category;
}

detectedCounterparty = aiResult.counterparty || '';


    // Normalize category with user categories
    const matchedCategory = categories.find(
      cat => cat.name.toLowerCase() === detectedCategory?.toLowerCase()
    );

    const finalCategory =
      matchedCategory?.name ||
      categories.find(cat => cat.name === 'Other')?.name ||
      'Other';

    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      setLoadingAI(false);
      return;
    }

    await addDoc(collection(db1, 'users', user.uid, 'transactions'), {
      type: detectedType,
      amount,
      category: finalCategory,
      note: smsMessage.substring(0, 150),
      counterparty: detectedCounterparty || '',
      date: transactionDate,
      createdAt: serverTimestamp(),
    });

    setExtractedData({
      amount,
      type: detectedType,
      category: finalCategory,
      note: smsMessage.substring(0, 150),
      counterparty: detectedCounterparty || '',
      date: new Date(),
    });

    setInputMode('result');
  } catch (error) {
    console.error(error);
    Alert.alert('Error', 'Failed to process transaction');
  } finally {
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
      type: transactionType,
      amount: Number(amountRef.current),
      category: selectedCategory,
      note,
      
      date: transactionDate,
      counterparty,
      createdAt: serverTimestamp(),
    });

    // Close modal directly without showing result screen
    closeModal();
  };

  

  const getCategoryColor = (categoryName: string): string => {
    const cat = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return cat?.color || '#78909C';
  };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'none'}
      transparent
    >
      <View style={[styles.overlay, !inputMode && styles.overlayCentered]}>
        <View style={[styles.modal, !inputMode && styles.modalCentered]}>
          <View style={styles.modalHandle} />

          {/* Initial Choice: Form or SMS */}
          {!inputMode && (
            <View style={styles.choiceContainer}>
              <Text style={styles.choiceTitle}>Add Transaction</Text>
              
              <TouchableOpacity
                style={styles.choiceOption}
                onPress={openForm}
                activeOpacity={0.8}
              >
                <View style={styles.choiceIconContainer}>
                  <Text style={styles.choiceIcon}>📝</Text>
                </View>
                <View style={styles.choiceTextContainer}>
                  <Text style={styles.choiceOptionTitle}>Manual Entry</Text>
                  <Text style={styles.choiceOptionSubtitle}>
                    Fill in transaction details manually
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
                  <Text style={styles.choiceOptionTitle}>SMS Auto-Extract</Text>
                  <Text style={styles.choiceOptionSubtitle}>
                    AI-powered transaction parsing from SMS
                  </Text>
                </View>
                <Text style={styles.choiceArrow}>→</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SMS Reading Mode */}
          {inputMode === 'sms' && (
            <ScrollView
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.smsHeader}>
                <View style={styles.smsIconCircle}>
                  <Text style={styles.smsIconText}>📱</Text>
                </View>
                <Text style={styles.smsTitle}>Extract from SMS</Text>
                <Text style={styles.smsSubtitle}>
                  Paste your bank or UPI transaction message
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Transaction Message</Text>
                <TextInput
                  placeholder="Paste your bank/UPI SMS here...&#10;&#10;Example:&#10;₹500 debited from your account via UPI"
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
                style={[styles.submitBtn, { backgroundColor: '#5B8DEF' }, loadingAI && styles.submitBtnDisabled]}
                onPress={handleSMSExtract}
                disabled={loadingAI}
              >
                <Text style={styles.submitText}>
                  {loadingAI ? '⏳ Extracting...' : '🔍 Extract & Save'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>

              <View style={styles.exampleContainer}>
                <Text style={styles.exampleTitle}>💡 Supported Messages:</Text>
                <Text style={styles.exampleText}>• ₹500 debited for Swiggy order via UPI</Text>
                <Text style={styles.exampleText}>• Rs 2,500 paid to electricity bill</Text>
                <Text style={styles.exampleText}>• Salary credited ₹50,000</Text>
                <Text style={styles.exampleText}>• Spent INR 1,200 on Flipkart via Card</Text>
              </View>
            </ScrollView>
          )}

          {/* Manual Form Mode */}
          {inputMode === 'form' && (
            <ScrollView
              keyboardShouldPersistTaps="always"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Type Toggle */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Transaction Type</Text>
                <View style={styles.typeToggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.typeToggle,
                      transactionType === 'expense' && { backgroundColor: '#EF4444' }
                    ]}
                    onPress={() => setTransactionType('expense')}
                  >
                    <Text style={[
                      styles.typeToggleText,
                      transactionType === 'expense' && styles.typeToggleTextActive
                    ]}>💸 Expense</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeToggle,
                      transactionType === 'income' && { backgroundColor: '#10B981' }
                    ]}
                    onPress={() => setTransactionType('income')}
                  >
                    <Text style={[
                      styles.typeToggleText,
                      transactionType === 'income' && styles.typeToggleTextActive
                    ]}>💰 Income</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Amount */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Amount *</Text>
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

              {/* Category */}
              <View style={styles.section}>
                <Text style={styles.label}>Category *</Text>
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

              {/* Note */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Note (Optional)</Text>
                <TextInput
                  placeholder="Add details about this transaction..."
                  placeholderTextColor="#999"
                  value={note}
                  onChangeText={setNote}
                  style={[styles.input, styles.noteInput]}
                  multiline
                  numberOfLines={3}
                />
              </View>
               {/* Paid To / Received From */}
<View style={styles.inputContainer}>
  <Text style={styles.label}>
    {transactionType === 'expense' ? 'Paid To' : 'Received From'}
  </Text>
  <TextInput
    placeholder={
      transactionType === 'expense'
        ? 'e.g. Swiggy, Landlord, Amazon'
        : 'e.g. Company, Client, Friend'
    }
    placeholderTextColor="#999"
    value={counterparty}
    onChangeText={setCounterparty}
    style={styles.input}
  />
</View>


              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: transactionType === 'expense' ? '#EF4444' : '#10B981' }
                ]}
                onPress={submitTransaction}
              >
                <Text style={styles.submitText}>
                  {transactionType === 'expense' ? 'Add Expense' : 'Add Income'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.backButton} onPress={goBack}>
                <Text style={styles.backButtonText}>← Back</Text>
              </TouchableOpacity>
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
                  <Text style={styles.resultIconText}>
                    {extractedData.type === 'income' ? '💰' : '💸'}
                  </Text>
                </View>
                <Text style={styles.resultTitle}>Transaction Saved!</Text>
                <Text style={styles.resultSubtitle}>
                  Your transaction has been successfully recorded
                </Text>
              </View>

              <View style={styles.resultCard}>
                <View style={styles.resultRow}>
                  
                    <Text style={styles.resultLabel}>Amount  </Text>
                    <Text
                      style={[
                        styles.resultValue,
                        { color: extractedData.type === 'income' ? '#10B981' : '#EF4444' }
                      ]}
                    >
                      ₹{extractedData.amount.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.resultDivider} />

                  <View style={styles.resultDivider} />

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Type</Text>
                    <Text
                      style={[
                        styles.resultInfo,
                        { color: extractedData.type === 'income' ? '#10B981' : '#EF4444' }
                      ]}
                    >
                      {extractedData.type.toUpperCase()}
                    </Text>
                  </View>


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

                {!!extractedData.counterparty && (
  <>
    <View style={styles.resultDivider} />
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>
        {extractedData.type === 'expense' ? 'Paid To' : 'Received From'}
      </Text>
      <Text style={styles.resultInfo}>
        {extractedData.counterparty}
      </Text>
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
    justifyContent: 'flex-end',
  },
  overlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    padding: 16,
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

  choiceContainer: {
    paddingVertical: 12,
    marginBottom: 8,
  },
  choiceTitle: {
    fontSize: 24,
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
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
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

  extractedBanner: {
    backgroundColor: '#DBEAFE',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  extractedBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    textAlign: 'center',
  },

  typeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    gap: 8,
  },
  typeToggle: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  typeToggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeToggleTextActive: {
    color: '#FFFFFF',
  },

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
  resultInfo: {
    fontSize: 16,
    fontWeight: '600',
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
  resultTag: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  resultTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4338CA',
  },

  section: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
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

  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paymentChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  paymentChipSelected: {
    backgroundColor: '#5B8DEF',
    borderColor: '#5B8DEF',
  },
  paymentChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  paymentChipTextSelected: {
    color: '#FFFFFF',
  },

  noteInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  tagInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tagInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    fontSize: 15,
    color: '#1F2937',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  addTagBtn: {
    backgroundColor: '#5B8DEF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addTagBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  tagRemove: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366F1',
  },

  submitBtn: {
    backgroundColor: '#64B5F6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
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