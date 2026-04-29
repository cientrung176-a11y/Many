import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { storage } from '../lib/storage';

export default function Index() {
  const [destination, setDestination] = useState<'/(tabs)' | '/login' | null>(null);

  useEffect(() => {
    storage.getToken()
      .then((token) => setDestination(token ? '/(tabs)' : '/login'))
      .catch(() => setDestination('/login'));
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#16a34a' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}
