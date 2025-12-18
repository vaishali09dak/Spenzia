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
      Food: '#4FACFE',
      Transport: '#FFC107',
      Shopping: '#EF5777',
      Other: '#26D0CE',
      Income: '#4FACFE',
    };
    return colors[category] || '#4FACFE';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#4FACFE" />
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4FACFE" />

      {/* HEADER */}
      <View style={styles.header}>
        {/* LEFT ARROW */}
  <TouchableOpacity
    style={styles.headerButton}
    onPress={() => navigation.goBack()}
  >
    <Feather name="arrow-left" size={22} color="#FFFFFF" />
  </TouchableOpacity>

  {/* CENTER TITLE */}
  <Text style={styles.headerTitle}>Transaction History</Text>

  {/* RIGHT REFRESH */}
  <TouchableOpacity
    style={styles.headerButton}
    onPress={handleRefresh}
    disabled={refreshing}
  >
    <Feather name="refresh-cw" size={22} color="#FFFFFF" />
  </TouchableOpacity>
        
      </View>

      {/* CONTENT */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4FACFE']}
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
                      <View
                        style={[
                          styles.iconContainer,
                          {
                            backgroundColor: `${getCategoryColor(
                              transaction.category
                            )}20`,
                          },
                        ]}
                      >
                        <Feather
                          name={
                            transaction.type === 'income'
                              ? 'trending-up'
                              : 'trending-down'
                          }
                          size={24}
                          color={getCategoryColor(transaction.category)}
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
  container: { flex: 1, backgroundColor: '#5B8DEF' },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5B8DEF',
  },

  loadingText: {
    marginTop: 16,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },

  header: {
    height: 130,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40
  },

  headerButton: {
    width: 40,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    paddingTop: 20
  },

  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },

  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 80,
  },

  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },

  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },

  filterTabActive: {
    backgroundColor: '#5B8DEF',
  },

  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  transactionList: {
    gap: 12,
  },

  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },

  emptyText: {
    color: '#CCC',
    fontSize: 16,
  },

  dateHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginVertical: 8,
  },

  transactionCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
  },

  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transactionInfo: {
    flex: 1,
  },

  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  timeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },

  amountText: {
    fontSize: 18,
    fontWeight: '700',
  },

  incomeAmount: {
    color: '#10B981',
  },

  expenseAmount: {
    color: '#EF4444',
  },
});
