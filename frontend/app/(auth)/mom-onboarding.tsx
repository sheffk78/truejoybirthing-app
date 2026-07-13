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
  Modal,
} from 'react-native';
import { formatDateLocal, todayLocal } from '../../src/utils/date';
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
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

const BIRTH_SETTINGS = [
  { value: 'Home', label: 'Home Birth', icon: 'home' },
  { value: 'Hospital', label: 'Hospital', icon: 'business' },
  { value: 'Birth Center', label: 'Birth Center', icon: 'medkit' },
  { value: 'Not sure', label: 'Not sure yet', icon: 'help-circle' },
];

export default function MomOnboardingScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
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
  const [showSuccess, setShowSuccess] = useState(false);

  // Progress tracks this form only: dueDate (34%), birthSetting (33%), zipCode (33%)
  const progressPct = (dueDate ? 34 : 0) + (plannedBirthSetting ? 33 : 0) + (zipCode ? 33 : 0);
  
  // Format date as YYYY-MM-DD for API storage (ISO format)
  const formatDate = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };
  
  // Format date as MM/DD/YYYY for user-facing display
  const formatDateDisplay = (date: Date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
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
      const result = await apiRequest(`/lookup/zipcode/${zip}`, {
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
      
      // Show brief celebration before navigating (peak-end principle)
      setShowSuccess(true);
      setTimeout(() => {
        // Don't set onboarding_completed until tutorial is done — prevents
        // root guard from redirecting to dashboard mid-flow
        router.replace('/tutorial?role=MOM');
      }, 1500);
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
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
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
              <Icon name="calendar" size={22} color={colors.primary} />
              <Text style={[styles.dateText, !dueDate && styles.datePlaceholder]}>
                {dueDate ? formatDateDisplay(dueDate) : 'Select your due date'}
              </Text>
              <Icon name="chevron-down" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            
            {showDatePicker && Platform.OS === 'web' && (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <View style={styles.dateModalOverlay}>
                  <View style={styles.dateModalContent}>
                    <View style={styles.dateModalHeader}>
                      <Text style={styles.dateModalTitle}>Select Due Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Icon name="close" size={24} color={colors.text} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.webCalendarWrapper}>
                      <input
                        type="date"
                        value={dueDate ? formatDateLocal(dueDate) : ''}
                        min={todayLocal()}
                        onChange={(e: any) => {
                          if (e.target.value) {
                            setDueDate(new Date(e.target.value + 'T12:00:00'));
                            if (errors.dueDate) {
                              setErrors(prev => ({ ...prev, dueDate: '' }));
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          padding: 16,
                          fontSize: 18,
                          border: `2px solid ${colors.primary}`,
                          borderRadius: 12,
                          outline: 'none',
                          cursor: 'pointer',
                          color: colors.text,
                          backgroundColor: colors.surface,
                        }}
                      />
                    </View>
                    <Button
                      title="Done"
                      onPress={() => setShowDatePicker(false)}
                      fullWidth
                      style={{ marginTop: 16 }}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showDatePicker && Platform.OS === 'ios' && (
              <Modal transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                <View style={styles.dateModalOverlay}>
                  <View style={styles.dateModalContent}>
                    <View style={styles.dateModalHeader}>
                      <Text style={styles.dateModalTitle}>Select Due Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={[styles.dateModalTitle, { color: colors.primary }]}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={dueDate || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={handleDateChange}
                      minimumDate={new Date()}
                      maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
                      textColor={colors.text}
                    />
                  </View>
                </View>
              </Modal>
            )}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={dueDate || new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
                maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)}
              />
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
                      color={plannedBirthSetting === setting.value ? colors.primary : colors.textSecondary}
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
                        <Icon name="checkmark" size={14} color={colors.white} />
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
                <ActivityIndicator size="small" color={colors.primary} style={styles.zipLoader} />
              )}
            </View>
            
            {locationCity && locationState && (
              <View style={styles.locationResult}>
                <Icon name="checkmark-circle" size={20} color={colors.success} />
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
      
      {/* Success celebration overlay (peak-end principle) */}
      {showSuccess && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Icon name="checkmark-circle" size={64} color={colors.success} />
            <Text style={styles.successTitle}>You're all set!</Text>
            <Text style={styles.successSubtitle}>
              Your journey to {dueDate ? formatDateDisplay(dueDate) : 'birth'} starts now!
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: SIZES.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: SIZES.fontTitle,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  formSection: {
    marginBottom: SIZES.lg,
  },
  sectionLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginBottom: SIZES.sm,
  },
  helperText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginBottom: SIZES.sm,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.error,
    marginBottom: SIZES.sm,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
  },
  dateText: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  datePlaceholder: {
    color: colors.textLight,
  },
  // Date modal styles for iOS spinner pickers
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  dateModalContent: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 400,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  dateModalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  webCalendarWrapper: {
    marginVertical: SIZES.md,
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
    borderColor: colors.primary,
  },
  settingLabel: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  settingLabelSelected: {
    color: colors.primary,
    fontFamily: FONTS.bodyBold,
  },
  checkmark: {
    position: 'absolute',
    top: SIZES.sm,
    right: SIZES.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
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
    color: colors.success,
    marginLeft: SIZES.xs,
  },
  continueButton: {
    marginTop: SIZES.md,
  },
  // Success celebration overlay (peak-end principle)
  successOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  successCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: SIZES.xl,
    alignItems: 'center',
    marginHorizontal: SIZES.xl,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    fontSize: SIZES.fontTitle,
    fontFamily: FONTS.heading,
    color: colors.text,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  successSubtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
}));
