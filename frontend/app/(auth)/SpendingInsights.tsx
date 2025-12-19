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
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, getDocs, where } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db1 } from '../../firebase';


const { width } = Dimensions.get('window');
type FeatherIconName = React.ComponentProps<typeof Feather>['name'];

const SpendingInsights = () => {
  const navigation = useNavigation();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const transactionsRef = collection(db1, 'users', user.uid, 'transactions');
      const q = query(transactionsRef, orderBy('createdAt', 'desc'));
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

  const getFilteredTransactions = () => {
    const now = new Date();
    const expenses = transactions.filter(t => t.type === 'expense');

    return expenses.filter(t => {
      const txDate = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
      
      if (period === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= weekAgo;
      } else if (period === 'month') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else {
        return txDate.getFullYear() === now.getFullYear();
      }
    });
  };

  const getCategoryStats = () => {
    const filtered = getFilteredTransactions();
    const categoryMap: Record<string, { total: number; count: number; transactions: any[] }> = {};

    filtered.forEach(t => {
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { total: 0, count: 0, transactions: [] };
      }
      categoryMap[t.category].total += t.amount;
      categoryMap[t.category].count += 1;
      categoryMap[t.category].transactions.push(t);
    });

    return Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        total: data.total,
        count: data.count,
        transactions: data.transactions,
      }))
      .sort((a, b) => b.total - a.total);
  };

  const getHighestTransaction = () => {
    const filtered = getFilteredTransactions();
    if (filtered.length === 0) return null;
    return filtered.reduce((max, t) => t.amount > max.amount ? t : max, filtered[0]);
  };

  const getTotalSpending = () => {
    return getFilteredTransactions().reduce((sum, t) => sum + t.amount, 0);
  };

  const getAverageSpending = () => {
    const filtered = getFilteredTransactions();
    return filtered.length > 0 ? getTotalSpending() / filtered.length : 0;
  };

  const formatCurrency = (amount: number) =>
    `₹${amount.toLocaleString('en-IN')}`;

  const formatDate = (date: any) => {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN', { 
      day: 'numeric',
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatTime = (date: any) => {
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryIcon = (category: string): FeatherIconName => {
  const icons: Record<string, FeatherIconName> = {
    Food: 'coffee',
    Transport: 'truck',
    Shopping: 'shopping-bag',
    Utilities: 'zap',
    Rent: 'home',
    Entertainment: 'film',
    Gift: 'gift',
    Medicine: 'heart',
    Other: 'more-horizontal',
  };

  return icons[category] ?? 'more-horizontal';
};


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F5F1E8" />
        <ActivityIndicator size="large" color="#2C3E7C" />
        <Text style={styles.loadingText}>Analyzing spending...</Text>
      </View>
    );
  }

  const categoryStats = getCategoryStats();
  const highestTransaction = getHighestTransaction();
  const totalSpending = getTotalSpending();
  const avgSpending = getAverageSpending();

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

        <Text style={styles.headerTitle}>Spending Insights</Text>
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
        {/* PERIOD FILTER */}
        <View style={styles.filterContainer}>
          {['week', 'month', 'year'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setPeriod(tab as any)}
              style={[
                styles.filterTab,
                period === tab && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  period === tab && styles.filterTextActive,
                ]}
              >
                {tab === 'week' ? 'This Week' : tab === 'month' ? 'This Month' : 'This Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* OVERVIEW CARDS */}
        <View style={styles.overviewContainer}>
          <View style={styles.overviewCard}>
            <View style={styles.overviewIconContainer}>
              <Feather name="trending-down" size={24} color="#FF3B30" />
            </View>
            <Text style={styles.overviewLabel}>Total Spent</Text>
            <Text style={styles.overviewValue}>{formatCurrency(totalSpending)}</Text>
          </View>

          <View style={styles.overviewCard}>
            <View style={styles.overviewIconContainer}>
              <Feather name="bar-chart-2" size={24} color="#5B8EF5" />
            </View>
            <Text style={styles.overviewLabel}>Avg. Transaction</Text>
            <Text style={styles.overviewValue}>{formatCurrency(avgSpending)}</Text>
          </View>
        </View>

        {/* HIGHEST TRANSACTION */}
        {highestTransaction && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Highest Spending</Text>
            <View style={styles.highlightCard}>
              <View style={styles.highlightHeader}>
                <View style={styles.highlightIconContainer}>
                  <Feather
                    name={getCategoryIcon(highestTransaction.category)}
                    size={28}
                    color="#2C3E7C"
                  />
                </View>
                <View style={styles.highlightInfo}>
                  <Text style={styles.highlightCategory}>
                    {highestTransaction.category}
                  </Text>
                  <Text style={styles.highlightAmount}>
                    {formatCurrency(highestTransaction.amount)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.highlightDetails}>
                <View style={styles.detailRow}>
                  <Feather name="calendar" size={16} color="#8E8E93" />
                  <Text style={styles.detailText}>
                    {formatDate(highestTransaction.createdAt)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Feather name="clock" size={16} color="#8E8E93" />
                  <Text style={styles.detailText}>
                    {formatTime(highestTransaction.createdAt)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* SPENDING BY CATEGORY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          
          {categoryStats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#A0A0A0" />
              <Text style={styles.emptyText}>No spending data for this period</Text>
            </View>
          ) : (
            categoryStats.map((stat, index) => {
              const percentage = totalSpending > 0 
                ? (stat.total / totalSpending) * 100 
                : 0;

              return (
                <View key={stat.category} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryLeft}>
                      <View style={styles.categoryIconContainer}>
                        <Feather
                          name={getCategoryIcon(stat.category)}
                          size={22}
                          color="#2C3E7C"
                        />
                      </View>
                      <View>
                        <Text style={styles.categoryName}>{stat.category}</Text>
                        <Text style={styles.categoryCount}>
                          {stat.count} transaction{stat.count !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.categoryAmount}>
                      {formatCurrency(stat.total)}
                    </Text>
                  </View>

                  <View style={styles.progressBarContainer}>
                    <View 
                      style={[
                        styles.progressBar, 
                        { width: `${percentage}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>
                    {percentage.toFixed(1)}% of total spending
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default SpendingInsights;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F5F1E8' 
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
  paddingTop: 40,   // ⬆️ arrow goes higher
  paddingBottom: 20,
},


  backButton: {
  width: 48,
  height: 48,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  marginBottom: 12,  // ⬇️ space between arrow & title
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
  letterSpacing: 0.2

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
    paddingHorizontal: 20,
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
    backgroundColor: '#5B8EF5',
  },

  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E7C',
  },

  filterTextActive: {
    color: '#FFFFFF',
  },

  overviewContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },

  overviewCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  overviewLabel: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 4,
  },

  overviewValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E7C',
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E7C',
    marginBottom: 16,
  },

  highlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  highlightIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#E8EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  highlightInfo: {
    flex: 1,
  },

  highlightCategory: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E7C',
    marginBottom: 4,
  },

  highlightAmount: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FF3B30',
  },

  highlightDetails: {
    flexDirection: 'row',
    gap: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  detailText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },

  categoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8EFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E7C',
    marginBottom: 2,
  },

  categoryCount: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },

  categoryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E7C',
  },

  progressBarContainer: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#5B8EF5',
    borderRadius: 4,
  },

  percentageText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },

  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },

  emptyText: {
    color: '#A0A0A0',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
});