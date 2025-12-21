import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ActionType = 'expense' | 'income' | 'category';


type ActionOption = {
  id: ActionType;
  title: string;
  subtitle: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  colors: readonly [string, string, ...string[]];
};

const options: ActionOption[] = [
  {
    id: 'expense',
    title: 'Add Expense',
    subtitle: 'Track your spending',
    icon: 'arrow-down-circle-outline',
    colors: ['#F093FB', '#F5576C', '#DC2430'],
  },
  {
    id: 'income',
    title: 'Add Income',
    subtitle: 'Record your earnings',
    icon: 'arrow-up-circle-outline',
    colors: ['#11998E', '#38EF7D', '#16C172'],
  },
  {
    id: 'category',
    title: 'New Category',
    subtitle: 'Create custom category',
    icon: 'pricetag-outline',
    colors: ['#4FACFE', '#00F2FE', '#3B82F6'],
  },
];

type Props = {
  onSelect: (id: ActionType) => void;
};

export default function QuickActionOptions({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      {options.map((option) => (
        // NEW CODE (uses a simple View with a single background color)
<TouchableOpacity
  key={option.id}
  onPress={() => onSelect(option.id)}
  activeOpacity={0.85}
  style={styles.card}
>
  <View 
    style={[
      styles.gradient, 
      { backgroundColor: option.colors[0] } // Use the first color as a solid background
    ]} 
  >
    <Ionicons name={option.icon} size={32} color="#fff" style={styles.icon} />
    <View style={{ flex: 1 }}>
      <Text style={styles.title}>{option.title}</Text>
      <Text style={styles.subtitle}>{option.subtitle}</Text>
    </View>
    <Text style={styles.arrow}>›</Text>
  </View>
</TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  arrow: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
  },
});
