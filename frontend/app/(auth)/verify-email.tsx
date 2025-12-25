import React, { useEffect, useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, type Href } from "expo-router";
import { auth } from "../../firebase";
import { sendEmailVerification, signOut } from "firebase/auth";

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  const email = useMemo(() => auth.currentUser?.email ?? "", []);

  useEffect(() => {
    if (!auth.currentUser) {
      router.replace("/login" as Href);
      return;
    }

    const id = setInterval(() => {
      setResendCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const handleResend = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login" as Href);
      return;
    }

    if (resendCooldownSeconds > 0) return;

    try {
      setLoading(true);
      await sendEmailVerification(user);
      setResendCooldownSeconds(30);
      Alert.alert("Verification email sent", "Please check your inbox (and spam folder). ");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send verification email");
    } finally {
      setLoading(false);
    }
  };

  const handleIHaveVerified = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.replace("/login" as Href);
      return;
    }

    try {
      setLoading(true);
      await user.reload();

      if (auth.currentUser?.emailVerified) {
        router.replace("/userdetails" as Href);
      } else {
        Alert.alert("Not verified yet", "Please verify using the link in your email, then try again.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to refresh verification status");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeAccount = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      router.replace("/login" as Href);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to sign out");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification link to:
        </Text>
        <Text style={styles.email}>{email || "(no email)"}</Text>

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleIHaveVerified}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>I have verified</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, (loading || resendCooldownSeconds > 0) && styles.buttonDisabled]}
          onPress={handleResend}
          disabled={loading || resendCooldownSeconds > 0}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>
            {resendCooldownSeconds > 0
              ? `Resend in ${resendCooldownSeconds}s`
              : "Resend verification email"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, loading && styles.buttonDisabled]}
          onPress={handleChangeAccount}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.linkText}>Use a different account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF9F2",
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1E3A5F",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 6,
  },
  email: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    textAlign: "center",
    marginBottom: 28,
  },
  primaryButton: {
    backgroundColor: "#1E3A5F",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#EEF1F7",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  secondaryButtonText: {
    color: "#1E3A5F",
    fontSize: 16,
    fontWeight: "600",
  },
  linkButton: {
    marginTop: 18,
    alignItems: "center",
  },
  linkText: {
    color: "#1E3A5F",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
