// app/(auth)/signup.tsx
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential, sendEmailVerification } from 'firebase/auth';

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db1 } from '../../firebase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

WebBrowser.maybeCompleteAuthSession();

const {  height } = Dimensions.get('window');

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword,setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: '512927432128-daf8mgq87mr69sr6c9rj7hl0bvlmmbj2.apps.googleusercontent.com',
});


  useEffect(() => {
    // Google sign-in
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);

      signInWithCredential(auth, credential)
        .then(async (userCredential) => {
          const user = userCredential.user;

          await setDoc(
            doc(db1, 'users', user.uid),
            {
              email: user.email,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );

          // Google users go directly to userdetails
          router.replace('/(auth)/userdetails');
        })
        .catch((error) => {
          Alert.alert('Google Sign-In Failed', error.message);
        });
    }
  }, [response]);

  useEffect(() => {
    // Polling for email verification if verificationSent
    let interval: any;
    if (verificationSent) {
      interval = setInterval(async () => {
        const user = auth.currentUser;
        if (user) {
          await user.reload();
          if (user.emailVerified) {
            clearInterval(interval);
            router.replace('/(auth)/userdetails'); // Go to User Details page
          }
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [verificationSent]);

  const handleSignUp = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
      const user = userCredential.user;

      await setDoc(
        doc(db1, 'users', user.uid),
        {
          email: normalizedEmail,
          balance: 0,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Send verification email
      await sendEmailVerification(user);
      setVerificationSent(true); // Show check-email message

    } catch (error: any) {
      let message = error?.message ?? 'Something went wrong';
      if (error.code === 'auth/invalid-email') message = 'Invalid email address';
      if (error.code === 'auth/email-already-in-use') message = 'Email already in use';
      if (error.code === 'auth/weak-password') message = 'Password too weak';
      Alert.alert('Sign Up Failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleUndo = async () => {
    try {
      const user = auth.currentUser;
      if (user) await user.delete();
      router.replace('/(auth)/signup');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Cannot undo signup');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <StatusBar style="dark" />

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image
            source={require('../../assets/images/signup-illustration.jpg')}
            style={styles.illustration}
            contentFit="contain"
            transition={200}
          />
        </View>

        <View style={styles.card}>
          {!verificationSent ? (
            <>
              <Text style={styles.title}>Sign Up</Text>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#999"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{loading ? "Loading..." : "Sign Up"}</Text>
              </TouchableOpacity>
               
               {/* Google Sign-In */}
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#DDD', marginBottom: 20 }]}
                onPress={() => promptAsync()}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              {/* Sign In Link */}
              <View style={styles.signInContainer}>
                <Text style={styles.signInText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                  <Text style={styles.signInLink}>Log In</Text>
                </TouchableOpacity>
              </View>

              {/* Google Sign-In */}
              {/* <TouchableOpacity
                style={[styles.button, { backgroundColor: '#1E3A5F', borderWidth: 1, borderColor: '#DDD', marginBottom: 20 }]}
                onPress={() => promptAsync()}
              >
                <Text style={{ color: 'white', fontSize: 16, fontWeight: '600' }}>
                  Continue with Google
                </Text>
              </TouchableOpacity> */}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={[styles.title, { fontSize: 22 }]}>Check Your Email</Text>
              <Text style={{ textAlign: 'center', marginVertical: 16 }}>
                A verification link has been sent to your email. Please verify your email to continue.
              </Text>
              <Text style={{ color: '#888', marginBottom: 20 }}>Waiting for verification...</Text>

              <TouchableOpacity onPress={handleUndo}>
                <Text style={{ color: '#1E3A5F', textDecorationLine: 'underline' }}>
                  Back / Undo Signup
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF9F2' },
  scrollContainer: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  illustrationContainer: { width: '100%', height: height * 0.3, alignItems: 'stretch', justifyContent: 'flex-end', paddingBottom: 20 },
  illustration: { width: '100%', height: '100%' },
  card: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, marginTop: -20, flex: 1, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E3A5F', marginBottom: 32, textAlign: 'center' },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 16, height: 56 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  button: { backgroundColor: '#1E3A5F', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: '#1E3A5F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  signInContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  signInText: { fontSize: 14, color: '#666' , marginTop:-32},
  signInLink: { fontSize: 14, color: '#1E3A5F', fontWeight: '600' , marginTop:-27  },
});
