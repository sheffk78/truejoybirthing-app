import React, { useState, useCallback, useRef } from 'react';
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
import { SprigOne, SAGE } from '../../src/components/OrganicIcons';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

const SERVICES = ['Birth Doula', 'Postpartum Doula', 'Virtual Doula'];

export default function DoulaOnboardingScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  
  const [practiceName, setPracticeName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationState, setLocationState] = useState('');
  const [servicesOffered, setServicesOffered] = useState<string[]>([]);
  const [yearsInPractice, setYearsInPractice] = useState('');
  const [acceptingNewClients, setAcceptingNewClients] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLookingUpZip, setIsLookingUpZip] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [zipLookupError, setZipLookupError] = useState('');
  
  // Lookup city/state from zip code (with request tracking to avoid stale responses)
  const lookupRequestId = useRef(0);
  const lookupZipCode = useCallback(async (zip: string) => {
    if (zip.length !== 5 || !/^\d{5}$/.test(zip)) {
      return;
    }
    
    const thisRequestId = ++lookupRequestId.current;
    setIsLookingUpZip(true);
    setZipLookupError('');
    try {
      const result = await apiRequest(`/lookup/zipcode/${zip}`, {
        method: 'GET',
        timeoutMs: 8000,
      });
      
      // Discard stale response if a newer request was made
      if (lookupRequestId.current !== thisRequestId) return;
      
      if (result.city && result.state) {
        setLocationCity(result.city);
        setLocationState(result.state_abbreviation || result.state);
      } else {
        setLocationCity('');
        setLocationState('');
        setZipLookupError("We couldn't find that zip code. Please check it and try again.");
      }
    } catch (error: any) {
      if (lookupRequestId.current !== thisRequestId) return;
      console.log('Zip code lookup error:', error.message);
      setLocationCity('');
      setLocationState('');
      setZipLookupError(error.message || 'Zip code lookup failed. Please try again.');
    } finally {
      if (lookupRequestId.current === thisRequestId) {
        setIsLookingUpZip(false);
      }
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
      setZipLookupError('');
    }
  };
  
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
          zip_code: zipCode,
          location_city: locationCity,
          location_state: locationState,
          services_offered: servicesOffered,
          years_in_practice: yearsInPractice ? Math.max(0, parseInt(yearsInPractice) || 0) : null,
          accepting_new_clients: acceptingNewClients,
        },
      });
      
      // Don't set onboarding_completed until tutorial is done — prevents
      // root guard from redirecting to dashboard before subscription/tutorial
      router.replace('/plans-pricing?onboarding=true&role=DOULA');
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
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} style={styles.backButton}>
              <Icon name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '100%' }]} />
            </View>
            <Text style={styles.overline}>Setup · 1 of 2</Text>
            <Text style={styles.title}>Introduce your practice</Text>
            <Text style={styles.subtitle}>
              This is how moms will see you. You can change any of it later.
            </Text>
          </View>
          
          {/* Practice Name */}
          <Input
            label="Practice name"
            placeholder="Enter your practice name"
            value={practiceName}
            onChangeText={setPracticeName}
            leftIcon="organic:sprigOne"
            error={errors.practiceName}
          />
          
          {/* Location with Zip Code Lookup */}
          <View style={styles.locationSection}>
            <Text style={styles.sectionLabel}>Location</Text>
            <Text style={styles.helperText}>We'll match you with nearby families</Text>
            
            <View style={styles.zipCodeRow}>
              <Input
                placeholder="Zip Code"
                value={zipCode}
                onChangeText={handleZipCodeChange}
                containerStyle={styles.zipInput}
                leftIcon="organic:sprigOne"
                keyboardType="number-pad"
                maxLength={5}
              />
              {isLookingUpZip && (
                <ActivityIndicator size="small" color={colors.primary} style={styles.zipLoader} />
              )}
            </View>
            
            {locationCity && locationState && (
              <View style={styles.locationResult}>
                <Text style={styles.locationResultText}>
                  {locationCity}, {locationState} — we'll match you with nearby families
                </Text>
              </View>
            )}
            {!!zipLookupError && (
              <Text style={styles.errorText}>{zipLookupError}</Text>
            )}
          </View>
          
          {/* Services */}
          <View style={styles.servicesSection}>
            <Text style={styles.sectionLabel}>Services offered</Text>
            {errors.services && <Text style={styles.errorText}>{errors.services}</Text>}
            
            <View style={styles.chipRow}>
              {SERVICES.map((service) => {
                const on = servicesOffered.includes(service);
                return (
                  <TouchableOpacity
                    key={service}
                    onPress={() => toggleService(service)}
                    activeOpacity={0.8}
                    data-testid={`service-${service.toLowerCase().replace(/\s/g, '-')}`}
                  >
                    <View
                      style={[
                        styles.chip,
                        on && styles.chipOn,
                      ]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{service}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          {/* Years in Practice */}
          <Input
            label="Years in Practice"
            placeholder="e.g., 5"
            value={yearsInPractice}
            onChangeText={setYearsInPractice}
            keyboardType="number-pad"
            leftIcon="organic:sprigOne"
          />
          
          {/* Client status — approved two-card row (accepting / waitlist) */}
          <View style={styles.statusRow}>
            <TouchableOpacity
              onPress={() => setAcceptingNewClients(true)}
              style={[styles.statusCard, acceptingNewClients && styles.statusCardOn]}
              activeOpacity={0.8}
              data-testid="toggle-accepting-clients"
            >
              <View style={[styles.statusMark, acceptingNewClients && styles.statusMarkOn]}>
                <Icon name="checkmark" size={14} color={acceptingNewClients ? colors.white : colors.textLight} />
              </View>
              <Text style={[styles.statusLabel, acceptingNewClients && styles.statusLabelOn]}>
                Accepting new clients
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAcceptingNewClients(false)}
              style={[styles.statusCard, !acceptingNewClients && styles.statusCardOn]}
              activeOpacity={0.8}
              data-testid="toggle-waitlist"
            >
              <View style={[styles.statusMark, !acceptingNewClients && styles.statusMarkOn]}>
                <Icon name="remove" size={14} color={!acceptingNewClients ? colors.white : colors.textLight} />
              </View>
              <Text style={[styles.statusLabel, !acceptingNewClients && styles.statusLabelOn]}>
                Waitlist only
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Continue Button */}
          <Button
            title="Create my profile"
            onPress={handleContinue}
            loading={isLoading}
            fullWidth
            style={styles.continueButton}
            data-testid="doula-onboarding-continue-btn"
          />
          <Text style={styles.footNote}>Free to join — Pro tools come later, after setup.</Text>
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
  backButton: {
    marginBottom: SIZES.md,
    marginLeft: -SIZES.xs,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginBottom: SIZES.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.roleDoula,
    borderRadius: 2,
  },
  overline: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 2,
    color: colors.roleDoula,
    textTransform: 'uppercase',
    marginBottom: SIZES.xs,
  },
  statusRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
  },
  statusCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.sm,
    gap: 8,
  },
  statusCardOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  statusMark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusMarkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusLabel: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  statusLabelOn: {
    color: colors.primary,
    fontFamily: FONTS.bodyBold,
  },
  footNote: {
    textAlign: 'center',
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: colors.success,
    backgroundColor: colors.success + '12',
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.md,
    padding: SIZES.sm,
    overflow: 'hidden',
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
    marginBottom: SIZES.xs,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
  },
  chipOn: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  chipText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  chipTextOn: {
    color: colors.primary,
    fontFamily: FONTS.bodyBold,
  },
  servicesSection: {
    marginBottom: SIZES.md,
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  continueButton: {
    marginTop: SIZES.md,
  },
}));
