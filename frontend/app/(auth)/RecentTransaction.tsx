import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db1 } from '../../firebase';

const RecentTransactions = () => {
  const navigation = useNavigation();
const [searchQuery, setSearchQuery] = useState('');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
const [detailVisible, setDetailVisible] = useState(false);


  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const transactionsRef = collection(db1, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);

      const txns: any[] = [];
      querySnapshot.forEach(doc => {
        txns.push({ id: doc.id, ...doc.data() });
      });

      setTransactions(txns);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredTransactions = transactions.filter(t => {
  // type filter
  if (filter !== 'all' && t.type !== filter) return false;

  if (!searchQuery.trim()) return true;

  const query = searchQuery.toLowerCase();

  const dateObj = t.createdAt?.toDate
    ? t.createdAt.toDate()
    : new Date(t.createdAt);

  const searchableText = `
    ${t.amount}
    ${t.category}
    ${t.counterparty}
    ${t.note}
    ${dateObj.toLocaleDateString()}
    ${dateObj.toLocaleTimeString()}
  `.toLowerCase();

  return searchableText.includes(query);
});


  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (date: any) => {
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Food: '#2C3E7C',
      Transport: '#2C3E7C',
      Shopping: '#2C3E7C',
      Other: '#2C3E7C',
      Income: '#2C3E7C',
    };
    return colors[category] || '#2C3E7C';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />
        <ActivityIndicator size="large" color="#2C3E7C" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color="#2C3E7C" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#2C3E7C']}
          />
        }
      >
        {/* FILTER */}
        <View style={styles.filterContainer}>
          {['all', 'income', 'expense'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab as any)}
              style={[
                styles.filterTab,
                filter === tab && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === tab && styles.filterTextActive,
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.searchContainer}>
  <Feather name="search" size={18} color="#8E8E93" />
  <TextInput
    placeholder="Search amount, category, note, date..."
    value={searchQuery}
    onChangeText={setSearchQuery}
    style={styles.searchInput}
    placeholderTextColor="#9CA3AF"
  />
</View>


        {/* TRANSACTION LIST */}
        <View style={styles.transactionList}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          ) : (
            filteredTransactions.map((transaction, index) => {
              const showDateHeader =
                index === 0 ||
                formatDate(transaction.createdAt) !==
                  formatDate(filteredTransactions[index - 1].createdAt);

              return (
                <View key={transaction.id}>
                  {showDateHeader && (
                    <Text style={styles.dateHeader}>
                      {formatDate(transaction.createdAt)}
                    </Text>
                  )}

                  <TouchableOpacity
  activeOpacity={0.85}
  onPress={() => {
    setSelectedTransaction(transaction);
    setDetailVisible(true);
  }}
  style={styles.transactionCard}
>


                    <View style={styles.transactionContent}>
                      <View style={styles.iconContainer}>
                        <Feather
                          name={
                            transaction.type === 'income'
                              ? 'trending-up'
                              : 'trending-down'
                          }
                          size={24}
                          color="#2C3E7C"
                        />
                        
                      </View>


                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionTitle}>
                          {transaction.category}
                        </Text>

                        <Text style={styles.timeText}>
                          {new Date(
                            transaction.createdAt.toDate
                              ? transaction.createdAt.toDate()
                              : transaction.createdAt
                          ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>

                        
                      </View>


                      <Text
                        style={[
                          styles.amountText,
                          transaction.type === 'income'
                            ? styles.incomeAmount
                            : styles.expenseAmount,
                        ]}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </Text>
                    </View>
                    </TouchableOpacity>
                  </View>
                
              );
            })
          )}
        </View>
      </ScrollView>
      
        <Modal
          visible={detailVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setDetailVisible(false)}
        >
          {selectedTransaction && (
          <View style={styles.modalOverlay}>
            <View style={styles.detailModal}>

              <Text style={styles.modalTitle}>Transaction Details</Text>

              <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text
            style={[
              styles.detailValue,
              selectedTransaction.type === 'income'
                ? styles.incomeAmount
                : styles.expenseAmount,
            ]}
          >
            {selectedTransaction.type === 'income' ? '+' : '-'}
            {formatCurrency(selectedTransaction.amount)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Category</Text>
          <Text style={styles.detailValue}>
            {selectedTransaction.category}
          </Text>
        </View>
        <View style={styles.detailRow}>
  <Text style={styles.detailLabel}>
    {selectedTransaction.type === 'income'
      ? 'Received From'
      : 'Paid To'}
  </Text>
  <Text style={styles.detailValue}>
    {selectedTransaction.counterparty || '—'}
  </Text>
</View>


        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>
            {new Date(
              selectedTransaction.createdAt.toDate
                ? selectedTransaction.createdAt.toDate()
                : selectedTransaction.createdAt
            ).toLocaleString()}
          </Text>
        </View>

        {selectedTransaction.note && (
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Note</Text>
            <Text style={styles.noteText}>
              {selectedTransaction.note}
            </Text>
          </View>
        )}

        {selectedTransaction.tags?.length > 0 && (
          <View style={styles.detailBlock}>
            <Text style={styles.detailLabel}>Tags</Text>
            <View style={styles.tagsRow}>
              {selectedTransaction.tags.map((tag: string, i: number) => (
                <View key={i} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.closeModalBtn}
          onPress={() => setDetailVisible(false)}
        >
          <Text style={styles.closeModalText}>Close</Text>
        </TouchableOpacity>

      </View>
    </View>
  
)}
</Modal>

    </View>
  );
};

export default RecentTransactions;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFF9F2' 
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F1E8',
  },

  loadingText: {
    marginTop: 16,
    color: '#2C3E7C',
    fontSize: 16,
    fontWeight: '500',
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 30,
  },

  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  headerTitle: {
  fontSize: 34,
  fontWeight: '900',
  color: '#1F305E',
  letterSpacing: 0.2,
},

  content: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 80,
  },

  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  filterTab: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  filterTabActive: {
    backgroundColor: '#1F305E',
  },

  filterText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F305E',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  transactionList: {
    gap: 16,
  },

  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: '500',
  },

  dateHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },

  transactionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E8EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  transactionInfo: {
    flex: 1,
  },

  transactionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C3E7C',
    marginBottom: 4,
  },

  timeText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },

  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },

  incomeAmount: {
    color: '#34C759',
  },

  expenseAmount: {
    color: '#FF3B30',
  },
  noteText: {
  fontSize: 13,
  color: '#6B7280',
  marginTop: 4,
},

tagsRow: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
},

tagChip: {
  backgroundColor: '#EEF2FF',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},

tagText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#2C3E7C',
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.4)',
  justifyContent: 'flex-end',
},

detailModal: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 24,
  borderTopRightRadius: 24,
  padding: 24,
  maxHeight: '85%',
},

modalTitle: {
  fontSize: 20,
  fontWeight: '800',
  color: '#1F305E',
  marginBottom: 20,
},

detailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 14,
},

detailLabel: {
  fontSize: 14,
  color: '#6B7280',
  fontWeight: '600',
},

detailValue: {
  fontSize: 15,
  fontWeight: '700',
  color: '#1F305E',
},

detailBlock: {
  marginTop: 16,
},

closeModalBtn: {
  marginTop: 24,
  backgroundColor: '#1F305E',
  paddingVertical: 14,
  borderRadius: 14,
  alignItems: 'center',
},

closeModalText: {
  color: '#FFFFFF',
  fontSize: 16,
  fontWeight: '700',
},
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 14,
  paddingHorizontal: 14,
  paddingVertical: 10,
  marginBottom: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
},

searchInput: {
  flex: 1,
  marginLeft: 10,
  fontSize: 15,
  color: '#1F305E',
},


});