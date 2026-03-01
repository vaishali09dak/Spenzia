import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';

const questions = [
  {
    question: 'Why are you using this app?',
    options: [
      { text: 'To save more money', score: 3 },
      { text: 'To track my expenses', score: 2 },
      { text: 'Just to explore and try it out', score: 1 },
    ],
  },
  {
    question: 'Which category do you spend the most on?',
    options: [
      { text: 'Essentials (Food, Rent, Bills)', score: 3 },
      { text: 'Shopping & Lifestyle', score: 2 },
      { text: 'Entertainment & Travel', score: 1 },
    ],
  },
];

export default function SpendingQuizScreen() {
  const [current, setCurrent] = useState(0);

  const handleAnswer = () => {
    // If first question → go to second
    if (current === 0) {
      setCurrent(1);
    }
    // If second question → navigate to another page
    else {
      router.replace('/quiz-category'); 
      // 👆 CHANGE THIS to your actual file route
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Quick Setup</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.question}>
          {questions[current].question}
        </Text>

        {questions[current].options.map((opt, index) => (
          <TouchableOpacity
            key={index}
            style={styles.option}
            onPress={handleAnswer}
          >
            <Text style={styles.optionText}>{opt.text}</Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.progress}>
          Question {current + 1} of {questions.length}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7EFE5',
  },
  header: {
    backgroundColor: '#243B6B',
    paddingHorizontal: 24,
  paddingVertical: 50,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 20,
    elevation: 3,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#222',
  },
  option: {
    backgroundColor: '#F2F4F8',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  progress: {
    marginTop: 12,
    fontSize: 12,
    color: '#888',
    textAlign: 'right',
  },
});
