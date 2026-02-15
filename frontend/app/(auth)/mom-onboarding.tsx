import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Card from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const BIRTH_SETTINGS = [
  { value: 'Home', label: 'Home Birth', icon: 'home-outline' },
  { value: 'Hospital', label: 'Hospital', icon: 'business-outline' },
  { value: 'Birth Center', label: 'Birth Center', icon: 'medical-outline' },
  { value: 'Not sure', label: 'Not sure yet', icon: 'help-circle-outline' },
];

export default function MomOnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [dueDate, setDueDate] = useState('');
  const [plannedBirthSetting, setPlannedBirthSetting] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!dueDate.trim()) {
      newErrors.dueDate = 'Due date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      newErrors.dueDate = 'Please use format YYYY-MM-DD';
    }
    
    if (!plannedBirthSetting) {
      newErrors.birthSetting = 'Please select a birth setting';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleContinue = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await apiRequest(API_ENDPOINTS.MOM_ONBOARDING, {
        method: 'POST',
        body: {
          due_date: dueDate,
          planned_birth_setting: plannedBirthSetting,
          location_city: locationCity,
          location_state: locationState,
        },
      });
      
      updateUser({ onboarding_completed: true });
      router.replace('/(mom)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save your information');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.title}>Welcome, {user?.full_name?.split(' ')[0]}!</Text>
            <Text style={styles.subtitle}>
              Let's set up your profile so we can personalize your experience.
            </Text>
          </View>
          
          {/* Due Date */}
          <View style={styles.formSection}>
            <Input
              label="When is your due date?"
              placeholder="YYYY-MM-DD"
              value={dueDate}
              onChangeText={setDueDate}
              leftIcon="calendar-outline"
              error={errors.dueDate}
            />
            <Text style={styles.helperText}>
              Enter your estimated due date in YYYY-MM-DD format
            </Text>
          </View>
          
          {/* Birth Setting */}
          <View style={styles.settingSection}>
            <Text style={styles.sectionLabel}>Where do you plan to give birth?</Text>
            {errors.birthSetting && <Text style={styles.errorText}>{errors.birthSetting}</Text>}
            
            <View style={styles.settingsGrid}>
              {BIRTH_SETTINGS.map((setting) => (
                <TouchableOpacity
                  key={setting.value}
                  onPress={() => setPlannedBirthSetting(setting.value)}
                  style={styles.settingCardWrapper}
                  activeOpacity={0.8}
                >
                  <Card
                    style={[
                      styles.settingCard,
                      plannedBirthSetting === setting.value && styles.settingCardSelected,
                    ]}
                    padding="md"
                  >
                    <Ionicons
                      name={setting.icon as any}
                      size={28}
                      color={plannedBirthSetting === setting.value ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.settingLabel,
                        plannedBirthSetting === setting.value && styles.settingLabelSelected,
                      ]}
                    >
                      {setting.label}
                    </Text>
                    {plannedBirthSetting === setting.value && (
                      <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={14} color={COLORS.white} />
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Location */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>Where are you located? (Optional)</Text>
            <View style={styles.locationRow}>
              <Input
                placeholder="City"
                value={locationCity}
                onChangeText={setLocationCity}
                containerStyle={styles.cityInput}
                leftIcon="location-outline"
              />
              <Input
                placeholder="State"
                value={locationState}
                onChangeText={setLocationState}
                containerStyle={styles.stateInput}
              />
            </View>
          </View>
          
          {/* Continue Button */}
          <Button
            title="Continue to Home"
            onPress={handleContinue}
            loading={isLoading}
            fullWidth
            style={styles.continueButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.lg,
    paddingTop: SIZES.lg,
    paddingBottom: SIZES.xl,
  },
  headerSection: {
    marginBottom: SIZES.xl,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    marginBottom: SIZES.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: SIZES.fontTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  helperText: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
    marginTop: -SIZES.sm,
  },
  settingSection: {
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    color: COLORS.error,
    marginBottom: SIZES.sm,
  },
  settingsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.xs,
  },
  settingCardWrapper: {
    width: '50%',
    padding: SIZES.xs,
  },
  settingCard: {
    alignItems: 'center',
    paddingVertical: SIZES.md,
  },
  settingCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  settingLabel: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  settingLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationSection: {
    marginBottom: SIZES.xl,
  },
  locationRow: {
    flexDirection: 'row',
  },
  cityInput: {
    flex: 2,
    marginRight: SIZES.sm,
  },
  stateInput: {
    flex: 1,
  },
  continueButton: {
    marginTop: SIZES.md,
  },
});
