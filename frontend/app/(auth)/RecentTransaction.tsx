import React, { useState, useEffect } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { collection, query, orderBy, limit, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';
import { auth, db1 } from '../../firebase';
import { router } from 'expo-router';

const RecentTransactions = () => {
const navigation =
  useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db1, 'users', user.uid, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );

      const snap = await getDocs(q);
      const data: any[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      setTransactions(data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  type RootStackParamList = {
  RecentTransactions: undefined;
  EditTransaction: {
    transaction: any;
  };
};


  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredTransactions = transactions.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (!searchQuery.trim()) return true;

    const d = t.createdAt?.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
    const text = `
      ${t.amount}
      ${t.category}
      ${t.counterparty}
      ${t.note}
      ${d.toLocaleDateString()}
      ${d.toLocaleTimeString()}
    `.toLowerCase();

    return text.includes(searchQuery.toLowerCase());
  });

  const formatCurrency = (n: number) => `₹${n.toLocaleString('en-IN')}`;

  const formatDate = (date: any) => {
    const d = date.toDate ? date.toDate() : new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const confirmDelete = (tx: any) => {
    Alert.alert(
      'Delete Transaction',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const user = auth.currentUser;
            if (!user) return;

            await deleteDoc(
              doc(db1, 'users', user.uid, 'transactions', tx.id)
            );

            setDetailVisible(false);
            loadData();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF9F2" />
        <ActivityIndicator size="large" color="#2C3E7C" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF9F2" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color="#2C3E7C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction History</Text>
      </View>

      {/* CONTENT */}
      <ScrollView
        style={{ backgroundColor: '#FFF9F2' }}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* FILTER */}
        <View style={styles.filterContainer}>
          {['all', 'income', 'expense'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterTab, filter === tab && styles.filterTabActive]}
              onPress={() => setFilter(tab as any)}
            >
              <Text
                style={[styles.filterText, filter === tab && styles.filterTextActive]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={18} color="#8E8E93" />
          <TextInput
            placeholder="Search transactions"
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
          />
        </View>

        {/* LIST */}
        {filteredTransactions.map((tx, i) => {
          const showDate =
            i === 0 ||
            formatDate(tx.createdAt) !== formatDate(filteredTransactions[i - 1].createdAt);

          return (
            <View key={tx.id}>
              {showDate && <Text style={styles.dateHeader}>{formatDate(tx.createdAt)}</Text>}

              <TouchableOpacity
                style={styles.transactionCard}
                onPress={() => {
                  setSelectedTransaction(tx);
                  setDetailVisible(true);
                }}
              >
                <View style={styles.transactionContent}>
                  <View style={styles.iconContainer}>
                    <Feather
                      name={tx.type === 'income' ? 'trending-up' : 'trending-down'}
                      size={22}
                      color="#2C3E7C"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.transactionTitle}>{tx.category}</Text>
                    <Text style={styles.timeText}>
                      {new Date(
                        tx.createdAt.toDate ? tx.createdAt.toDate() : tx.createdAt
                      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.amountText,
                      tx.type === 'income' ? styles.incomeAmount : styles.expenseAmount,
                    ]}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatCurrency(tx.amount)}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* DETAIL MODAL */}
      <Modal visible={detailVisible} transparent animationType="slide">
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
                  {formatCurrency(selectedTransaction.amount)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category</Text>
                <Text style={styles.detailValue}>{selectedTransaction.category}</Text>
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

              {/* ACTION BUTTONS */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => {
                    setDetailVisible(false);
                    navigation.navigate('EditTransaction', {
  transaction: selectedTransaction,
});

                  }}
                >
                  <Feather name="edit-3" size={18} color="#1F305E" />
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => confirmDelete(selectedTransaction)}
                >
                  <Feather name="trash-2" size={18} color="#FF3B30" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>

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
    </SafeAreaView>
  );
};

export default RecentTransactions;

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF9F2' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF9F2' },
  loadingText: { marginTop: 16, color: '#2C3E7C' },

  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  backButton: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  headerTitle: { fontSize: 34, fontWeight: '900', color: '#1F305E' },

  contentContainer: { paddingHorizontal: 20, paddingBottom: 80 },

  filterContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  filterTab: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, backgroundColor: '#fff' },
  filterTabActive: { backgroundColor: '#1F305E' },
  filterText: { color: '#1F305E', fontWeight: '600' },
  filterTextActive: { color: '#fff' },

  searchContainer: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20,
  },
  searchInput: { flex: 1, marginLeft: 10 },

  dateHeader: { marginBottom: 8, color: '#666', fontWeight: '600' },

  transactionCard: {
    backgroundColor: '#fff', borderRadius: 20,
    padding: 18, marginBottom: 16,
  },

  transactionContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: '#E8EFFF', alignItems: 'center', justifyContent: 'center',
  },

  transactionTitle: { fontWeight: '700', color: '#2C3E7C' },
  timeText: { fontSize: 13, color: '#8E8E93' },

  amountText: { fontSize: 18, fontWeight: '700' },
  incomeAmount: { color: '#34C759' },
  expenseAmount: { color: '#FF3B30' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailModal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },

  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  detailLabel: { color: '#6B7280' },
  detailValue: { fontWeight: '700', color: '#1F305E' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editButton: {
    flex: 1, backgroundColor: '#E8EFFF',
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  editText: { fontWeight: '700', color: '#1F305E' },

  deleteButton: {
    flex: 1, backgroundColor: '#FFEDEE',
    paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8,
  },
  deleteText: { fontWeight: '700', color: '#FF3B30' },

  closeModalBtn: {
    marginTop: 24, backgroundColor: '#1F305E',
    paddingVertical: 14, borderRadius: 14, alignItems: 'center',
  },
  closeModalText: { color: '#fff', fontWeight: '700' },
});