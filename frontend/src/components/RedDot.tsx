import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useColors } from '../hooks/useThemedStyles';

interface RedDotProps {
  size?: number;
  color?: string;
}

/**
 * Small red dot indicator for inline placement on cards/icons.
 * Shows a 8px red circle by default.
 */
export const RedDot: React.FC<RedDotProps> = ({ size = 8, color }) => {
  const colors = useColors();
  return (
    <View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color || colors.error || '#EF4444',
        },
      ]}
    />
  );
};

/**
 * Tab bar red dot — positioned for use as a custom tabBarIcon badge.
 * Renders a small dot in the top-right corner of its container.
 */
export const TabBarRedDot: React.FC<{ show: boolean }> = ({ show }) => {
  const colors = useColors();
  if (!show) return null;
  return (
    <View style={styles.tabDotContainer}>
      <View
        style={[
          styles.tabDot,
          { backgroundColor: colors.error || '#EF4444' },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  dot: {
    marginLeft: 2,
  },
  tabDotContainer: {
    position: 'absolute',
    top: -2,
    right: -6,
    zIndex: 10,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});