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

const SERVICES = [
  { value: 'Birth Doula', icon: 'heart-outline' },
  { value: 'Postpartum Doula', icon: 'home-outline' },
  { value: 'Virtual Doula', icon: 'videocam-outline' },
];

export default function DoulaOnboardingScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [practiceName, setPracticeName] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [acceptingNewClients, setAcceptingNewClients] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const toggleService = (service: string) => {
    setServicesOffered((prev) =>
      prev.includes(service)
        ? prev.filter((s) => s !== service)
        : [...prev, service]
    );
  };
  
  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!practiceName.trim()) {
      newErrors.practiceName = 'Practice name is required';
    }
    
    if (servicesOffered.length === 0) {
      newErrors.services = 'Please select at least one service';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleContinue = async () => {
    if (!validate()) return;
    
    setIsLoading(true);
    try {
      await apiRequest(API_ENDPOINTS.DOULA_ONBOARDING, {
        method: 'POST',
        body: {
          practice_name: practiceName,
          location_city: locationCity,
          location_state: locationState,
          services_offered: servicesOffered,
          years_in_practice: yearsInPractice ? parseInt(yearsInPractice) : null,
          accepting_new_clients: acceptingNewClients,
        },
      });
      
      updateUser({ onboarding_completed: true });
      router.replace('/(doula)/dashboard');
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
              Let's set up your doula profile.
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
          
          {/* Services */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionLabel}>Services Offered</Text>
            {errors.services && <Text style={styles.errorText}>{errors.services}</Text>}
            
            {SERVICES.map((service) => (
              <TouchableOpacity
                key={service.value}
                onPress={() => toggleService(service.value)}
                activeOpacity={0.8}
              >
                <Card
                  style={[
                    styles.serviceCard,
                    servicesOffered.includes(service.value) && styles.serviceCardSelected,
                  ]}
                >
                  <Ionicons
                    name={service.icon as any}
                    size={24}
                    color={servicesOffered.includes(service.value) ? COLORS.primary : COLORS.textSecondary}
                  />
                  <Text
                    style={[
                      styles.serviceLabel,
                      servicesOffered.includes(service.value) && styles.serviceLabelSelected,
                    ]}
                  >
                    {service.value}
                  </Text>
                  <View style={styles.checkbox}>
                    {servicesOffered.includes(service.value) && (
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    )}
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Years in Practice */}
          <Input
            label="Years in Practice"
            placeholder="e.g., 5"
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
    backgroundColor: COLORS.roleDoula,
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
  servicesSection: {
    marginBottom: SIZES.md,
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  serviceCardSelected: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  serviceLabel: {
    flex: 1,
    marginLeft: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  serviceLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
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
