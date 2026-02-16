import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Card from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

const BIRTH_SETTINGS = [
  { value: 'Home', label: 'Home Birth', icon: 'home' },
  { value: 'Hospital', label: 'Hospital', icon: 'business' },
  { value: 'Birth Center', label: 'Birth Center', icon: 'medkit' },
  { value: 'Not sure', label: 'Not sure yet', icon: 'help-circle' },
];

export default function MomOnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [plannedBirthSetting, setPlannedBirthSetting] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpZip, setIsLookingUpZip] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Format date as MM-DD-YYYY
  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };
  
  // Handle date change from picker
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
      if (errors.dueDate) {
        setErrors(prev => ({ ...prev, dueDate: '' }));
      }
    }
  };
  
  // Lookup city/state from zip code
  const lookupZipCode = useCallback(async (zip: string) => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      return;
    }
    
    setIsLookingUpZip(true);
    try {
      const result = await apiRequest(`/api/lookup/zipcode/${zip}`, {
        method: 'GET',
      });
      
      if (result.city && result.state) {
        setLocationCity(result.city);
        setLocationState(result.state_abbreviation || result.state);
      }
    } catch (error: any) {
      console.log('Zip code lookup error:', error.message);
      // Don't show error - just silently fail and let user enter manually if needed
    } finally {
      setIsLookingUpZip(false);
    }
  }, []);
  
  // Handle zip code change
  const handleZipCodeChange = (text: string) => {
    // Only allow digits and max 5 characters
    const cleaned = text.replace(/\D/g, '').slice(0, 5);
    setZipCode(cleaned);
    
    // Auto-lookup when 5 digits entered
    if (cleaned.length === 5) {
      lookupZipCode(cleaned);
    } else {
      // Clear city/state if zip is incomplete
      setLocationCity('');
      setLocationState('');
    }
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
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
          due_date: dueDate ? formatDate(dueDate) : '',
          planned_birth_setting: plannedBirthSetting,
          zip_code: zipCode,
          location_city: locationCity,
          location_state: locationState,
        },
      });
      
      updateUser({ onboarding_completed: true });
      router.replace('/tutorial?role=MOM');
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
          
          {/* Due Date with Calendar Picker */}
          <View style={styles.formSection}>
            <Text style={styles.sectionLabel}>When is your due date?</Text>
            {errors.dueDate && <Text style={styles.errorText}>{errors.dueDate}</Text>}
            
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Icon name="calendar" size={22} color={COLORS.primary} />
              <Text style={[styles.dateText, !dueDate && styles.datePlaceholder]}>
                {dueDate ? formatDate(dueDate) : 'Select your due date'}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={dueDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                  maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Max 1 year ahead
                />
                {Platform.OS === 'ios' && (
                  <Button
                    title="Done"
                    onPress={() => setShowDatePicker(false)}
                    style={styles.datePickerDone}
                    size="sm"
                  />
                )}
              </View>
            )}
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
                    <Icon
                      name={setting.icon as any}
                      size={32}
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
                        <Icon name="checkmark" size={14} color={COLORS.white} />
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Zip Code Location */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>Where are you located? (Optional)</Text>
            <Text style={styles.helperText}>Enter your zip code and we'll find your city</Text>
            
            <View style={styles.zipCodeRow}>
              <Input
                placeholder="Zip Code"
                value={zipCode}
                onChangeText={handleZipCodeChange}
                containerStyle={styles.zipInput}
                leftIcon="location"
                keyboardType="number-pad"
                maxLength={5}
              />
              {isLookingUpZip && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.zipLoader} />
              )}
            </View>
            
            {locationCity && locationState && (
              <View style={styles.locationResult}>
                <Icon name="checkmark-circle" size={20} color={COLORS.success} />
                <Text style={styles.locationResultText}>
                  {locationCity}, {locationState}
                </Text>
              </View>
            )}
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
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  helperText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginBottom: SIZES.sm,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.error,
    marginBottom: SIZES.sm,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
  },
  dateText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  datePlaceholder: {
    color: COLORS.textLight,
  },
  datePickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.sm,
    overflow: 'hidden',
  },
  datePickerDone: {
    margin: SIZES.sm,
  },
  settingSection: {
    marginBottom: SIZES.lg,
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
    paddingVertical: SIZES.lg,
  },
  settingCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  settingLabel: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  settingLabelSelected: {
    color: COLORS.primary,
    fontFamily: FONTS.bodyBold,
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
  zipCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zipInput: {
    flex: 1,
  },
  zipLoader: {
    marginLeft: SIZES.sm,
  },
  locationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.sm,
  },
  locationResultText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.success,
    marginLeft: SIZES.xs,
  },
  continueButton: {
    marginTop: SIZES.md,
  },
});
