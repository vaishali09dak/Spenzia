import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header Text */}
      <View style={styles.headerContainer}>
        <Text style={styles.welcomeText}>Welcome To</Text>
        <Text style={styles.appName}>Spenzia.</Text>
      </View>

      {/* Illustration */}
      <View style={styles.illustrationContainer}>
        <Image
          source={require('../../assets/images/onboarding-illustration.jpg')}
          style={styles.illustration}
          contentFit="contain"
          transition={200}
        />
      </View>

      {/* Description Text */}
      <Text style={styles.description}>
        Track expenses, set budgets, and achieve financial goals easily.
      </Text>

      {/* Navigation Dots
      <View style={styles.dotsContainer}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View> */}

      {/* Get Started Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/(auth)/login')}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Start Your Journey</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF9E6', // Warm cream/beige background
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  welcomeText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '400',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E3A5F', // Dark blue
    marginTop: 4,
  },
  illustrationContainer: {
    width: width * 0.85,
    height: height * 0.35,
    marginVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  illustrationPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8E8E8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 10,
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D0D0D0',
  },
  dotActive: {
    backgroundColor: '#1E3A5F',
    width: 24,
  },
  button: {
    backgroundColor: '#1E3A5F', // Dark blue
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

