import { Redirect, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onIdTokenChanged } from 'firebase/auth';
import { auth } from '../../firebase';

export default function AuthIndex() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onIdTokenChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setChecking(false);
    });

    return unsub;
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={"/welcome" as Href} />;
  }

  if (!user.emailVerified) {
    return <Redirect href={"/verify-email" as Href} />;
  }

  return <Redirect href={"/userdetails" as Href} />;
}
