import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Image } from 'react-native';
import { COLORS, SIZES, BRAND, FONTS } from '../constants/theme';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        source={{ uri: BRAND.logoJpg }}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
  },
});
