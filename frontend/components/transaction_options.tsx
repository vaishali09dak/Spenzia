import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { ActionType } from '../app/(tabs)/transaction';


type ActionOption = {
  id: ActionType;
  title: string;
  subtitle: string;
  icon: string;
  colors: readonly [string, string, ...string[]];
};

const options: ActionOption[] = [
  {
    id: 'expense',
    title: 'Add Expense',
    subtitle: 'Track your spending',
    icon: '📉',
    colors: ['#F093FB', '#F5576C', '#DC2430'],
  },
  {
    id: 'income',
    title: 'Add Income',
    subtitle: 'Record your earnings',
    icon: '📈',
    colors: ['#11998E', '#38EF7D', '#16C172'],
  },
  {
    id: 'category',
    title: 'New Category',
    subtitle: 'Create custom category',
    icon: '🏷️',
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
    {/* ... card content inside ... */}
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
    fontSize: 32,
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
