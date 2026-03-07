// Appearance Settings Component - Theme Selection UI
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Icon } from './Icon';
import { useTheme } from '../contexts/ThemeContext';
import { ThemePreference } from '../store/themeStore';

interface AppearanceSettingsProps {
  showLabel?: boolean;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({ 
  showLabel = true 
}) => {
  const { theme, themePreference, setThemePreference, isDark } = useTheme();
  const { colors, sizes } = theme;
  
  const options: { value: ThemePreference; label: string; icon: string; description: string }[] = [
    { 
      value: 'SYSTEM', 
      label: 'Use device setting', 
      icon: 'phone-portrait-outline',
      description: 'Follows your device theme'
    },
    { 
      value: 'LIGHT', 
      label: 'Light', 
      icon: 'sunny-outline',
      description: 'Always light mode'
    },
    { 
      value: 'DARK', 
      label: 'Dark', 
      icon: 'moon-outline',
      description: 'Always dark mode'
    },
  ];
  
  const handleSelect = async (value: ThemePreference) => {
    await setThemePreference(value);
  };
  
  const styles = StyleSheet.create({
    container: {
      marginVertical: sizes.md,
    },
    label: {
      fontSize: sizes.fontMd,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: sizes.md,
    },
    optionsContainer: {
      backgroundColor: colors.background.surface,
      borderRadius: sizes.radiusMd,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: sizes.md,
      paddingHorizontal: sizes.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    optionLast: {
      borderBottomWidth: 0,
    },
    optionSelected: {
      backgroundColor: colors.accent.primary + '15',
    },
    optionContent: {
      flex: 1,
      marginLeft: sizes.md,
    },
    optionLabel: {
      fontSize: sizes.fontMd,
      fontWeight: '500',
      color: colors.text.primary,
    },
    optionDescription: {
      fontSize: sizes.fontSm,
      color: colors.text.secondary,
      marginTop: 2,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accent.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    checkmarkEmpty: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border.default,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.background.subtle,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
  
  return (
    <View style={styles.container}>
      {showLabel && (
        <Text style={styles.label}>Appearance</Text>
      )}
      <View style={styles.optionsContainer}>
        {options.map((option, index) => {
          const isSelected = themePreference === option.value;
          const isLast = index === options.length - 1;
          
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                isLast && styles.optionLast,
              ]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
              data-testid={`theme-option-${option.value.toLowerCase()}`}
            >
              <View style={styles.iconContainer}>
                <Icon 
                  name={option.icon} 
                  size={20} 
                  color={isSelected ? colors.accent.primary : colors.text.secondary} 
                />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {isSelected ? (
                <View style={styles.checkmark}>
                  <Icon name="checkmark" size={16} color={colors.text.onAccent} />
                </View>
              ) : (
                <View style={styles.checkmarkEmpty} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Compact version for inline use
export const AppearanceToggle: React.FC = () => {
  const { theme, themePreference, setThemePreference, isDark } = useTheme();
  const { colors, sizes } = theme;
  
  const getNextTheme = (): ThemePreference => {
    switch (themePreference) {
      case 'SYSTEM': return 'LIGHT';
      case 'LIGHT': return 'DARK';
      case 'DARK': return 'SYSTEM';
      default: return 'SYSTEM';
    }
  };
  
  const getIcon = () => {
    switch (themePreference) {
      case 'LIGHT': return 'sunny-outline';
      case 'DARK': return 'moon-outline';
      default: return 'phone-portrait-outline';
    }
  };
  
  const styles = StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: sizes.sm,
      paddingHorizontal: sizes.md,
      backgroundColor: colors.background.surface,
      borderRadius: sizes.radiusMd,
      borderWidth: 1,
      borderColor: colors.border.subtle,
    },
    label: {
      marginLeft: sizes.sm,
      fontSize: sizes.fontSm,
      color: colors.text.secondary,
    },
  });
  
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => setThemePreference(getNextTheme())}
      activeOpacity={0.7}
      data-testid="theme-toggle-btn"
    >
      <Icon name={getIcon()} size={18} color={colors.text.secondary} />
      <Text style={styles.label}>
        {themePreference === 'SYSTEM' ? 'Auto' : themePreference === 'LIGHT' ? 'Light' : 'Dark'}
      </Text>
    </TouchableOpacity>
  );
};

export default AppearanceSettings;
