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
import { Icon } from '../../src/components/Icon';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import Card from '../../src/components/Card';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const CREDENTIALS = [
  { value: 'CPM', label: 'Certified Professional Midwife' },
  { value: 'LM', label: 'Licensed Midwife' },
  { value: 'CNM', label: 'Certified Nurse-Midwife' },
];

const BIRTH_SETTINGS = [
  { value: 'Home', icon: 'home-outline' },
  { value: 'Birth Center', icon: 'medical-outline' },
];

export default function MidwifeOnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [practiceName, setPracticeName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [birthSettingsServed, setBirthSettingsServed] = useState<string[]>([]);
  const [acceptingNewClients, setAcceptingNewClients] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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
          location_city: locationCity,
          location_state: locationState,
          years_in_practice: yearsInPractice ? parseInt(yearsInPractice) : null,
          birth_settings_served: birthSettingsServed,
          accepting_new_clients: acceptingNewClients,
        },
      });
      
      updateUser({ onboarding_completed: true });
      router.replace('/(midwife)/dashboard');
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
              >
                <Card
                  style={[
                    styles.credentialCard,
                    credentials === cred.value && styles.credentialCardSelected,
                  ]}
                >
                  <View style={styles.radioOuter}>
                    {credentials === cred.value && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.credentialText}>
                    <Text style={styles.credentialValue}>{cred.value}</Text>
                    <Text style={styles.credentialLabel}>{cred.label}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Location */}
          <Text style={styles.sectionLabel}>Location</Text>
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
                      size={24}
                      color={birthSettingsServed.includes(setting.value) ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.settingLabel,
                        birthSettingsServed.includes(setting.value) && styles.settingLabelSelected,
                      ]}
                    >
                      {setting.value}
                    </Text>
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
    backgroundColor: COLORS.roleMidwife,
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
  sectionLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  errorText: {
    fontSize: SIZES.fontXs,
    color: COLORS.error,
    marginBottom: SIZES.sm,
  },
  credentialsSection: {
    marginBottom: SIZES.md,
  },
  credentialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  credentialCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  credentialText: {
    flex: 1,
  },
  credentialValue: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  credentialLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    marginBottom: SIZES.md,
  },
  cityInput: {
    flex: 2,
    marginRight: SIZES.sm,
  },
  stateInput: {
    flex: 1,
  },
  settingsSection: {
    marginBottom: SIZES.md,
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    marginBottom: SIZES.lg,
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: COLORS.primary,
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  continueButton: {
    marginTop: SIZES.md,
  },
});
