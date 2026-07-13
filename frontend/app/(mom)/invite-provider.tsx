import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

type ProviderType = 'Doula' | 'Midwife';

interface FormState {
  invitee_name: string;
  invitee_email: string;
  invitee_role: ProviderType;
  personal_message: string;
}

const INITIAL_FORM: FormState = {
  invitee_name: '',
  invitee_email: '',
  invitee_role: 'Doula',
  personal_message: '',
};

export default function InviteProviderScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentName, setSentName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError(null);
  };

  const validate = (): string | null => {
    if (!form.invitee_name.trim()) return 'Please enter the provider\'s name.';
    if (!form.invitee_email.trim()) return 'Please enter the provider\'s email.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.invitee_email.trim())) {
      return 'Please enter a valid email address.';
    }
    return null;
  };

  const handleSendInvite = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiRequest(API_ENDPOINTS.INVITES, {
        method: 'POST',
        body: {
          invitee_name: form.invitee_name.trim(),
          invitee_email: form.invitee_email.trim(),
          invitee_role: form.invitee_role.toUpperCase(),
          personal_message: form.personal_message.trim() || undefined,
        },
      });
      setSentName(form.invitee_name.trim());
      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.message ||
          'We couldn\'t send the invite. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendAnother = () => {
    setForm(INITIAL_FORM);
    setSuccess(false);
    setError(null);
    setSentName('');
  };

  const handleBackHome = () => {
    router.push('/(mom)/my-team');
  };

  // ── Success State ──────────────────────────────────────────────
  if (success) {
    return (
      <ErrorBoundary>
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.backHeader}>
              <TouchableOpacity
                onPress={handleBackHome}
                style={styles.backButton}
                accessibilityRole="button"
                accessibilityLabel="Back to My Team"
              >
                <Icon name="chevron-back" size={22} color={colors.primary} />
                <Text style={styles.backButtonText}>My Team</Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.successCard}>
              <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
                <Icon name="checkmark-circle" size={56} color={colors.success} />
              </View>
              <Text style={styles.successTitle}>Invite Sent!</Text>
              <Text style={styles.successMessage}>
                Invite sent to {sentName}! We'll let you know when they join.
              </Text>

              <View style={styles.successActions}>
                <Button
                  title="Send Another"
                  onPress={handleSendAnother}
                  variant="primary"
                  style={styles.successBtn}
                  icon={<Icon name="mail-outline" size={18} color={colors.white} />}
                  testID="send-another-btn"
                />
                <Button
                  title="Back to My Team"
                  onPress={handleBackHome}
                  variant="outline"
                  style={styles.successBtn}
                  testID="back-home-btn"
                />
              </View>
            </Card>
          </ScrollView>
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  // ── Form State ─────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back Button */}
            <TouchableOpacity
              onPress={() => router.push('/(mom)/my-team')}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to My Team"
            >
              <Icon name="chevron-back" size={22} color={colors.primary} />
              <Text style={styles.backButtonText}>My Team</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={[styles.headerIcon, { backgroundColor: colors.roleDoula + '20' }]}>
                <Icon name="mail" size={28} color={colors.roleDoula} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Invite Your Provider</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Invite your doula or midwife by email. They'll get a link to join True Joy Birthing and connect with you.
              </Text>
            </View>

            {/* Smart Suggestion Banner */}
            <Card style={styles.suggestionCard}>
              <View style={styles.suggestionHeader}>
                <Icon name="search" size={18} color={colors.primary} />
                <Text style={styles.suggestionText}>
                  Already searched for a doula? They might already be on TJB.{' '}
                  <Text
                    style={styles.suggestionLink}
                    onPress={() => router.push('/(mom)/marketplace')}
                  >
                    Browse marketplace →
                  </Text>
                </Text>
              </View>
            </Card>

            {/* Form Card */}
            <Card style={styles.formCard}>
              {/* Provider Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Provider Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.invitee_name}
                  onChangeText={(text) => updateField('invitee_name', text)}
                  placeholder="e.g., Jane Smith"
                  placeholderTextColor={colors.textLight}
                  autoCapitalize="words"
                  returnKeyType="next"
                  testID="input-invitee-name"
                />
              </View>

              {/* Provider Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Provider Email *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  value={form.invitee_email}
                  onChangeText={(text) => updateField('invitee_email', text)}
                  placeholder="e.g., jane@doula.com"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  testID="input-invitee-email"
                />
              </View>

              {/* Provider Type Toggle */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Provider Type</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      form.invitee_role === 'Doula'
                        ? { backgroundColor: colors.roleDoula, borderColor: colors.roleDoula }
                        : { backgroundColor: 'transparent', borderColor: colors.border },
                    ]}
                    onPress={() => updateField('invitee_role', 'Doula')}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Select Doula"
                    testID="toggle-doula"
                  >
                    <Icon
                      name="people"
                      size={16}
                      color={form.invitee_role === 'Doula' ? colors.white : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        form.invitee_role === 'Doula'
                          ? { color: colors.white }
                          : { color: colors.textSecondary },
                      ]}
                    >
                      Doula
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      form.invitee_role === 'Midwife'
                        ? { backgroundColor: colors.roleMidwife, borderColor: colors.roleMidwife }
                        : { backgroundColor: 'transparent', borderColor: colors.border },
                    ]}
                    onPress={() => updateField('invitee_role', 'Midwife')}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Select Midwife"
                    testID="toggle-midwife"
                  >
                    <Icon
                      name="medkit"
                      size={16}
                      color={form.invitee_role === 'Midwife' ? colors.white : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.toggleText,
                        form.invitee_role === 'Midwife'
                          ? { color: colors.white }
                          : { color: colors.textSecondary },
                      ]}
                    >
                      Midwife
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Personal Message */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Personal Message (optional)</Text>
                <Text style={styles.labelHint}>
                  This will be included in the invite email to your provider.
                </Text>
                <TextInput
                  style={[
                    styles.textarea,
                    { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                  ]}
                  value={form.personal_message}
                  onChangeText={(text) => updateField('personal_message', text)}
                  placeholder="Add a personal note to your provider..."
                  placeholderTextColor={colors.textLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                  testID="input-personal-message"
                />
              </View>

              {/* Error State */}
              {error && (
                <View style={[styles.errorBox, { backgroundColor: colors.error + '10', borderColor: colors.error + '40' }]}>
                  <Icon name="alert-circle" size={20} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              {/* Send Button */}
              <Button
                title="Send Invite"
                onPress={handleSendInvite}
                loading={loading}
                disabled={loading}
                fullWidth
                style={styles.sendBtn}
                icon={<Icon name="send" size={18} color={colors.white} />}
                testID="send-invite-btn"
              />
            </Card>

            {/* Info Card */}
            <Card style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon name="information-circle" size={20} color={colors.primary} />
                <Text style={styles.infoTitle}>How it works</Text>
              </View>
              <Text style={styles.infoText}>
                We'll send an email invitation with a link for your provider to sign up. Once they join and connect, they'll have access to your birth plan and can help coordinate your care.
              </Text>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },

  // Back button
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
    gap: 2,
  },
  backButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 2,
  },
  backHeader: {
    marginBottom: SIZES.sm,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SIZES.md,
  },

  // Smart suggestion banner
  suggestionCard: {
    padding: SIZES.md,
    marginBottom: SIZES.md,
    backgroundColor: colors.primary + '08',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.sm,
  },
  suggestionText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  suggestionLink: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.primary,
  },

  // Form Card
  formCard: {
    padding: SIZES.lg,
    marginBottom: SIZES.md,
  },
  fieldGroup: {
    marginBottom: SIZES.lg,
  },
  label: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  labelHint: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: -2,
  },
  input: {
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    minHeight: SIZES.touchMin,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm + 2,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    textAlignVertical: 'top',
    minHeight: 100,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm + 2,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1.5,
    gap: SIZES.xs,
    minHeight: SIZES.touchMin,
  },
  toggleText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },

  // Error
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.xs,
    borderWidth: 1,
    borderRadius: SIZES.radiusSm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    marginBottom: SIZES.md,
  },
  errorText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    flexShrink: 1,
  },

  // Send button
  sendBtn: {
    marginTop: SIZES.xs,
  },

  // Success state
  successCard: {
    alignItems: 'center',
    padding: SIZES.xl,
    marginTop: SIZES.md,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.lg,
  },
  successTitle: {
    fontSize: SIZES.fontTitle,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SIZES.sm,
  },
  successMessage: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SIZES.xl,
    paddingHorizontal: SIZES.sm,
  },
  successActions: {
    flexDirection: 'column',
    gap: SIZES.sm,
    width: '100%',
  },
  successBtn: {
    width: '100%',
  },

  // Info card
  infoCard: {
    backgroundColor: colors.primary + '08',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  infoTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.primary,
  },
  infoText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 20,
  },
}));