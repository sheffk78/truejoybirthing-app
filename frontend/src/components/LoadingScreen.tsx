import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { BRAND } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message: _message = 'Loading...' }: LoadingScreenProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Image source={BRAND.logoPng} style={styles.logo} resizeMode="contain" />
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
    height: 88,
  },
});