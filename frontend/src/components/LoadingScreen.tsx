import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Image } from 'react-native';
import { SIZES, BRAND, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image
        source={{ uri: BRAND.logoJpg }}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 70,
    marginBottom: SIZES.lg,
  },
  spinner: {
    marginBottom: SIZES.sm,
  },
  message: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
  },
});
