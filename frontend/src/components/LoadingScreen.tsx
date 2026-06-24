import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BRAND } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message: _message = 'Loading...' }: LoadingScreenProps) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <BRAND.logoJpg width={200} height={49} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});