import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import LoadingScreen from '../../src/components/LoadingScreen';
import { COLORS } from '../../src/constants/theme';
import { Platform } from 'react-native';

export default function AuthCallback() {
  const router = useRouter();
  const { loginWithGoogle } = useAuthStore();
  const hasProcessed = useRef(false);
  
  useEffect(() => {
    // Prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    
    const processAuth = async () => {
      try {
        let sessionId: string | null = null;
        
        if (Platform.OS === 'web') {
          // Check URL hash for session_id
          const hash = window.location.hash;
          if (hash && hash.includes('session_id=')) {
            const params = new URLSearchParams(hash.substring(1));
            sessionId = params.get('session_id');
          }
        }
        
        if (sessionId) {
          await loginWithGoogle(sessionId);
          // Clear the hash from URL
          if (Platform.OS === 'web') {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
        
        // Let root layout handle the redirect
        router.replace('/');
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/(auth)/welcome');
      }
    };
    
    processAuth();
  }, []);
  
  return (
    <View style={styles.container}>
      <LoadingScreen message="Signing you in..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
