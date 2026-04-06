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
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Card from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

const CREDENTIALS = [
  { value: 'CPM', label: 'Certified Professional Midwife' },
  { value: 'LM', label: 'Licensed Midwife' },
  { value: 'CNM', label: 'Certified Nurse-Midwife' },
  { value: 'DEM', label: 'Direct Entry Midwife' },
];

const BIRTH_SETTINGS = [
  { value: 'Home', icon: 'home-outline' },
  { value: 'Birth Center', icon: 'medical-outline' },
];

export default function MidwifeOnboardingScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [practiceName, setPracticeName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [birthSettingsServed, setBirthSettingsServed] = useState<string[]>([]);
  const [acceptingNewClients, setAcceptingNewClients] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpZip, setIsLookingUpZip] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
    } finally {
      setIsLookingUpZip(false);
    }
  }, []);
  
  // Handle zip code change
  const handleZipCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 5);
    setZipCode(cleaned);
    
    if (cleaned.length === 5) {
      lookupZipCode(cleaned);
    } else {
      setLocationCity('');
      setLocationState('');
    }
  };
  
  const toggleBirthSetting = (setting: string) => {
    setBirthSettingsServed((prev) =>
      prev.includes(setting)
        ? prev.filter((s) => s !== setting)
        : [...prev, setting]
    );
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!practiceName.trim()) {
      newErrors.practiceName = 'Practice name is required';
    }
    
    if (!credentials) {
      newErrors.credentials = 'Please select your credentials';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleContinue = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await apiRequest(API_ENDPOINTS.MIDWIFE_ONBOARDING, {
        method: 'POST',
        body: {
          practice_name: practiceName,
          credentials: credentials,
          zip_code: zipCode,
          location_city: locationCity,
          location_state: locationState,
          years_in_practice: yearsInPractice ? parseInt(yearsInPractice) : null,
          birth_settings_served: birthSettingsServed,
          accepting_new_clients: acceptingNewClients,
        },
      });
      
      updateUser({ onboarding_completed: true });
      router.replace('/tutorial?role=MIDWIFE');
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
              Let's set up your midwife profile.
            </Text>
          </View>
          
          {/* Practice Name */}
          <Input
            label="Practice Name"
            placeholder="Enter your practice name"
            value={practiceName}
            onChangeText={setPracticeName}
            leftIcon="briefcase-outline"
            error={errors.practiceName}
          />
          
          {/* Credentials */}
          <View style={styles.credentialsSection}>
            <Text style={styles.sectionLabel}>Credentials</Text>
            {errors.credentials && <Text style={styles.errorText}>{errors.credentials}</Text>}
            
            {CREDENTIALS.map((cred) => (
              <TouchableOpacity
                key={cred.value}
                onPress={() => setCredentials(cred.value)}
                activeOpacity={0.8}
                data-testid={`credential-${cred.value.toLowerCase()}`}
              >
                <Card
                  style={[
                    styles.credentialCard,
                    credentials === cred.value && styles.credentialCardSelected,
                  ]}
                >
                  <View style={[styles.radioOuter, credentials === cred.value && styles.radioOuterSelected]}>
                    {credentials === cred.value && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.credentialText}>
                    <Text style={[styles.credentialValue, credentials === cred.value && styles.credentialValueSelected]}>
                      {cred.value}
                    </Text>
                    <Text style={styles.credentialLabel}>{cred.label}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Location with Zip Code Lookup */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>Location</Text>
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
          
          {/* Birth Settings Served */}
          <View style={styles.settingsSection}>
            <Text style={styles.sectionLabel}>Birth Settings Served</Text>
            <View style={styles.settingsRow}>
              {BIRTH_SETTINGS.map((setting) => (
                <TouchableOpacity
                  key={setting.value}
                  onPress={() => toggleBirthSetting(setting.value)}
                  style={styles.settingCardWrapper}
                  activeOpacity={0.8}
                  data-testid={`birth-setting-${setting.value.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Card
                    style={[
                      styles.settingCard,
                      birthSettingsServed.includes(setting.value) && styles.settingCardSelected,
                    ]}
                    padding="md"
                  >
                    <Icon
                      name={setting.icon as any}
                      size={28}
                      color={birthSettingsServed.includes(setting.value) ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.settingLabel,
                        birthSettingsServed.includes(setting.value) && styles.settingLabelSelected,
                      ]}
                    >
                      {setting.value}
                    </Text>
                    {birthSettingsServed.includes(setting.value) && (
                      <View style={styles.checkmark}>
                        <Icon name="checkmark" size={14} color={colors.white} />
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Years in Practice */}
          <Input
            label="Years in Practice"
            placeholder="e.g., 10"
            value={yearsInPractice}
            onChangeText={setYearsInPractice}
            keyboardType="number-pad"
            leftIcon="time-outline"
          />
          
          {/* Accepting New Clients */}
          <TouchableOpacity
            onPress={() => setAcceptingNewClients(!acceptingNewClients)}
            style={styles.toggleRow}
            activeOpacity={0.8}
            data-testid="toggle-accepting-clients"
          >
            <Text style={styles.toggleLabel}>Accepting new clients</Text>
            <View style={[styles.toggle, acceptingNewClients && styles.toggleActive]}>
              <View style={[styles.toggleKnob, acceptingNewClients && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
          
          {/* Continue Button */}
          <Button
            title="Continue to Dashboard"
            onPress={handleContinue}
            loading={isLoading}
            fullWidth
            style={styles.continueButton}
            data-testid="midwife-onboarding-continue-btn"
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.roleMidwife,
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
  credentialsSection: {
    marginBottom: SIZES.lg,
  },
  credentialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  credentialCardSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  radioOuterSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  credentialText: {
    flex: 1,
  },
  credentialValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
  },
  credentialValueSelected: {
    color: colors.primary,
  },
  credentialLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  locationSection: {
    marginBottom: SIZES.lg,
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
  settingsSection: {
    marginBottom: SIZES.lg,
  },
  settingsRow: {
    flexDirection: 'row',
    marginHorizontal: -SIZES.xs,
  },
  settingCardWrapper: {
    flex: 1,
    padding: SIZES.xs,
  },
  settingCard: {
    alignItems: 'center',
    paddingVertical: SIZES.lg,
    position: 'relative',
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    marginBottom: SIZES.lg,
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  continueButton: {
    marginTop: SIZES.md,
  },
}));
