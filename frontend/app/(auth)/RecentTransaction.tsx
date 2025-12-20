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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db1 } from '../../firebase';

const RecentTransactions = () => {
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

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

  const filteredTransactions = transactions.filter(t =>
    filter === 'all' ? true : t.type === filter
  );

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

                  <View style={styles.transactionCard}>
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
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
});