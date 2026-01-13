import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from "expo-router";
const questions = [
  {
    question: 'When you receive your salary, what do you do first?',
    options: [
      { text: 'Save or invest most of it', score: 3 },
      { text: 'Plan expenses and then spend', score: 2 },
      { text: 'Spend freely and enjoy', score: 1 },
    ],
  },
  {
    question: 'Which category do you spend the most on?',
    options: [
      { text: 'Essentials (Food, Bills, EMI)', score: 3 },
      { text: 'Education / Health', score: 2 },
      { text: 'Shopping / Entertainment', score: 1 },
    ],
  },
  {
    question: 'Do you track your expenses regularly?',
    options: [
      { text: 'Yes, every day', score: 3 },
      { text: 'Sometimes', score: 2 },
      { text: 'Rarely or never', score: 1 },
    ],
  },
  {
    question: 'What happens if you exceed your monthly budget?',
    options: [
      { text: 'I adjust next month and save more', score: 3 },
      { text: 'I try to balance slowly', score: 2 },
      { text: 'I don’t worry much', score: 1 },
    ],
  },
];

export default function SpendingQuizScreen() {
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (value: number) => {
    const newScore = score + value;
    setScore(newScore);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setFinished(true);
    }
  };

  const getPersonality = () => {
    if (score >= 10) return 'Smart Saver 🧠💰';
    if (score >= 7) return 'Balanced Planner ⚖️';
    return 'Free Spender 🎉';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Spending Personality Quiz</Text>
      </View>

      {!finished ? (
        <View style={styles.card}>
          <Text style={styles.question}>{questions[current].question}</Text>
          {questions[current].options.map((opt, index) => (
            <TouchableOpacity
              key={index}
              style={styles.option}
              onPress={() => handleAnswer(opt.score)}
            >
              <Text style={styles.optionText}>{opt.text}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.progress}>Question {current + 1} of {questions.length}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.resultTitle}>Your Spending Personality</Text>
          <Text style={styles.result}>{getPersonality()}</Text>
          <Text style={styles.resultDesc}>
            This result is based on your spending habits. You can improve your
            financial health by tracking expenses and following a budget.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/(tabs)")}
          >
            <Text style={styles.primaryBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      )}
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
    padding: 24,
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
  resultTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  result: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#243B6B',
    marginBottom: 12,
  },
  resultDesc: {
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#243B6B',
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
});