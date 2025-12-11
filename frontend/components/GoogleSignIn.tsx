// components/GoogleSignIn.tsx
import React, { useEffect } from "react";
import { Button, View, Text, Alert } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../firebase";

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignIn() {
  // Put your Web client ID here (OAuth client ID for Web app from Google Cloud)
  // For Expo Go: use the WEB client id
  const CLIENT_ID = "512927432128-uf79jes9kvd213sq8tood3paauil4j5e.apps.googleusercontent.com";

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: CLIENT_ID,
    scopes: ["openid", "profile", "email"],
    redirectUri: makeRedirectUri({ useProxy: true } as any ),
  });

  useEffect(() => {
    async function handle() {
      if (response?.type === "success") {
        try {
          // expo-auth-session returns id_token in response.params.id_token
          const idToken = response.params?.id_token ?? response.authentication?.idToken;
          if (!idToken) {
            throw new Error("No id_token returned from Google");
          }

          const credential = GoogleAuthProvider.credential(idToken);
          const userCred = await signInWithCredential(auth, credential);
          console.log("Signed in user:", userCred.user.uid);
          Alert.alert("Signed in", `Welcome ${userCred.user.email}`);
        } catch (err: any) {
          console.error("Firebase sign in failed:", err);
          Alert.alert("Sign-in error", err.message ?? String(err));
        }
      } else if (response?.type === "error") {
        console.warn("Google auth error response:", response);
      }
    }
    handle();
  }, [response]);

  return (
    <View style={{ padding: 12 }}>
      <Button
        title="Sign in with Google"
        disabled={!request}
        onPress={() => promptAsync({ useProxy: true } as any )}
      />
      <Text style={{ marginTop: 8, color: "#666" }}>
        Use this to sign in with Google (Expo Go). If you build a standalone app, add native client IDs.
      </Text>
    </View>
  );
}