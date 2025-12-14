// app/(auth)/signup.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword,setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if(password !== confirmPassword){
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      router.replace("/(auth)/userdetails");
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message);
    } finally {
      setLoading(false);
    }

  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Your Account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button 
        title={loading ? "Loading..." : "Sign Up"} 
        onPress={handleSignUp} 
        disabled={loading} 
      />

      <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
      <Text>Don&apos;t have an account? </Text>
      <Text
        style={{ color: "blue", fontWeight: "bold" }}
        onPress={() => router.push("/signup")}
      >
        Sign Up
      </Text>
    </View>

      {/* separator */}
      <Text style={styles.orText}>— or sign up with —</Text>
      
      {/* Google sign-in button (component) */}
      <GoogleSignIn />
      
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F0', // Light beige/cream background
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  illustrationContainer: {
    width: '100%',
    height: height * 0.3,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    paddingTop: 0,
    paddingBottom: 20,
    paddingHorizontal: 0,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    marginTop: -20,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#1E3A5F', // Dark blue
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#1E3A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  signInText: {
    fontSize: 14,
    color: '#666',
  },
  signInLink: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
});