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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import ErrorBoundary from '../../src/components/ErrorBoundary';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, kickerStyle } from '../../src/constants/corpus';

const DF = F;

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
  void colors;

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
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              onPress={handleBackHome}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to My Team"
            >
              <Icon name="chevron-back" size={18} color={C.ink} />
            </TouchableOpacity>

            <View style={styles.successCard}>
              <View style={styles.successAvatar}>
                <Text style={styles.successAvatarText}>
                  {sentName.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '✓'}
                </Text>
              </View>
              <Text style={styles.successTitle}>Invite Sent!</Text>
              <Text style={styles.successMessage}>
                Invite sent to {sentName}! We'll let you know when they join.
              </Text>

              <View style={styles.successActions}>
                <TouchableOpacity
                  style={styles.abtn}
                  onPress={handleSendAnother}
                  testID="send-another-btn"
                  accessibilityRole="button"
                >
                  <Icon name="mail" size={16} color={C.white} />
                  <Text style={styles.abtnText}>Send Another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.ghostBtn}
                  onPress={handleBackHome}
                  testID="back-home-btn"
                  accessibilityRole="button"
                >
                  <Text style={styles.ghostBtnText}>Back to My Team</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={styles.sico}>
                  <Icon name="information-circle" size={17} color={C.lavender} />
                </View>
                <Text style={styles.infoTitle}>How it works</Text>
              </View>
              <Text style={styles.infoText}>
                We'll send an email invitation with a link for your provider to sign up. Once
                they join and connect, they'll have access to your birth plan and can help
                coordinate your care.
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </ErrorBoundary>
    );
  }

  // ── Form State ─────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container} edges={['top']}>
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
            {/* Back — m17 ghost chevron on cream */}
            <TouchableOpacity
              onPress={() => router.push('/(mom)/my-team')}
              style={styles.backButton}
              accessibilityRole="button"
              accessibilityLabel="Back to My Team"
            >
              <Icon name="chevron-back" size={18} color={C.ink} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.overline}>Your Circle</Text>
              <Text style={styles.title}>
                Invite Your <Text style={styles.titleAccent}>Provider</Text>
              </Text>
              <Text style={styles.subtitle}>
                Invite your doula or midwife by email. They'll get a link to join True Joy
                Birthing and connect with you.
              </Text>
            </View>

            {/* Smart Suggestion Banner — warn chip vocabulary */}
            <View style={styles.suggestionBanner}>
              <View style={styles.sico}>
                <Icon name="search" size={17} color={C.rose} />
              </View>
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

            {/* Form Card */}
            <View style={styles.formCard}>
              {/* Provider Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PROVIDER NAME *</Text>
                <TextInput
                  style={styles.input}
                  value={form.invitee_name}
                  onChangeText={(text) => updateField('invitee_name', text)}
                  placeholder="e.g., Jane Smith"
                  placeholderTextColor={C.grayLight}
                  autoCapitalize="words"
                  returnKeyType="next"
                  testID="input-invitee-name"
                />
              </View>

              {/* Provider Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PROVIDER EMAIL *</Text>
                <TextInput
                  style={styles.input}
                  value={form.invitee_email}
                  onChangeText={(text) => updateField('invitee_email', text)}
                  placeholder="e.g., jane@doula.com"
                  placeholderTextColor={C.grayLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  testID="input-invitee-email"
                />
              </View>

              {/* Provider Type Toggle */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PROVIDER TYPE</Text>
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[
                      styles.rbtn,
                      form.invitee_role === 'Doula' ? styles.rbtnOn : styles.rbtnOff,
                    ]}
                    onPress={() => updateField('invitee_role', 'Doula')}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Select Doula"
                    testID="toggle-doula"
                  >
                    <Icon
                      name="people"
                      size={15}
                      color={form.invitee_role === 'Doula' ? C.white : C.gray}
                    />
                    <Text
                      style={[
                        styles.rbtnText,
                        form.invitee_role === 'Doula' ? styles.rbtnTextOn : styles.rbtnTextOff,
                      ]}
                    >
                      Doula
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.rbtn,
                      form.invitee_role === 'Midwife' ? styles.rbtnOn : styles.rbtnOff,
                    ]}
                    onPress={() => updateField('invitee_role', 'Midwife')}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Select Midwife"
                    testID="toggle-midwife"
                  >
                    <Icon
                      name="medkit"
                      size={15}
                      color={form.invitee_role === 'Midwife' ? C.white : C.gray}
                    />
                    <Text
                      style={[
                        styles.rbtnText,
                        form.invitee_role === 'Midwife' ? styles.rbtnTextOn : styles.rbtnTextOff,
                      ]}
                    >
                      Midwife
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Personal Message */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PERSONAL MESSAGE (OPTIONAL)</Text>
                <Text style={styles.labelHint}>
                  This will be included in the invite email to your provider.
                </Text>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={form.personal_message}
                  onChangeText={(text) => updateField('personal_message', text)}
                  placeholder="Add a personal note to your provider..."
                  placeholderTextColor={C.grayLight}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={500}
                  testID="input-personal-message"
                />
              </View>

              {/* Error State — warn chip vocabulary */}
              {error && (
                <View style={styles.errorBox}>
                  <Icon name="alert-circle" size={16} color={C.rose} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Send Button — abtn */}
              <TouchableOpacity
                style={[styles.abtn, loading && styles.abtnDisabled]}
                onPress={handleSendInvite}
                disabled={loading}
                testID="send-invite-btn"
                accessibilityRole="button"
                accessibilityLabel="Send invite"
              >
                {loading ? (
                  <Text style={styles.abtnText}>Sending…</Text>
                ) : (
                  <>
                    <Icon name="send" size={15} color={C.white} />
                    <Text style={styles.abtnText}>Send Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={styles.sico}>
                  <Icon name="information-circle" size={17} color={C.lavender} />
                </View>
                <Text style={styles.infoTitle}>How it works</Text>
              </View>
              <Text style={styles.infoText}>
                We'll send an email invitation with a link for your provider to sign up. Once
                they join and connect, they'll have access to your birth plan and can help
                coordinate your care.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const getStyles = createThemedStyles((colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.cream },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: SIZES.xxl },

    // Back button — m17 header vocabulary
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      marginBottom: 14,
    },

    // Header
    header: { marginBottom: 18 },
    overline: { ...kickerStyle(C.rose), marginBottom: 5 },
    title: {
      fontSize: 26,
      lineHeight: 30,
      fontFamily: DF.serif,
      fontWeight: '700',
      color: C.ink,
    },
    titleAccent: { color: C.roseSoft, fontStyle: 'italic' },
    subtitle: {
      fontSize: 12.5,
      fontFamily: DF.ui,
      color: C.gray,
      lineHeight: 18,
      marginTop: 5,
    },

    // Smart suggestion banner — warn (roseBg) chip family
    suggestionBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      backgroundColor: C.gbandMid,
      borderWidth: 1,
      borderColor: C.roseSoft,
      borderRadius: 18,
      padding: 13,
      marginBottom: 12,
    },
    suggestionText: {
      flex: 1,
      fontSize: 11.5,
      fontFamily: DF.ui,
      color: C.body,
      lineHeight: 16,
    },
    suggestionLink: {
      fontSize: 11.5,
      fontFamily: DF.uiBold,
      fontWeight: '700',
      color: C.rose,
    },

    // Form Card — fieldbox
    formCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
    },
    fieldGroup: { marginBottom: 18 },
    label: {
      fontSize: 10,
      letterSpacing: 1,
      fontWeight: '700',
      fontFamily: DF.uiBold,
      textTransform: 'uppercase',
      color: C.grayLight,
      marginBottom: 7,
    },
    labelHint: {
      fontSize: 11,
      fontFamily: DF.ui,
      color: C.gray,
      marginBottom: 7,
      marginTop: -4,
    },
    input: {
      backgroundColor: C.cardBg,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 13,
      fontFamily: DF.ui,
      color: C.ink,
      borderWidth: 1,
      borderColor: C.border,
      minHeight: 46,
    },
    textarea: { minHeight: 96, textAlignVertical: 'top' },

    // Provider type toggle — rbtn vocabulary
    toggleContainer: { flexDirection: 'row', gap: 8 },
    rbtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: 999,
      gap: 6,
      minHeight: 42,
    },
    rbtnOn: { backgroundColor: C.lavender },
    rbtnOff: { backgroundColor: C.cardBg, borderWidth: 1.3, borderColor: C.lavenderBorder },
    rbtnText: { fontSize: 11.5, fontWeight: '700', fontFamily: DF.uiBold },
    rbtnTextOn: { color: C.white },
    rbtnTextOff: { color: C.lavender },

    // Error — warn vocabulary
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
      backgroundColor: C.roseBg,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 10,
      marginBottom: 14,
    },
    errorText: { flex: 1, fontSize: 11.5, fontFamily: DF.uiSemi, fontWeight: '600', color: C.rose, lineHeight: 16 },

    // abtn — lavender primary pill
    abtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      backgroundColor: C.lavender,
      borderRadius: 999,
      paddingVertical: 13,
      paddingHorizontal: 18,
      minHeight: 46,
    },
    abtnDisabled: { opacity: 0.6 },
    abtnText: { color: C.white, fontSize: 13, fontWeight: '600', fontFamily: DF.uiSemi },
    ghostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.cardBg,
      borderWidth: 1.3,
      borderColor: C.lavenderBorder,
      borderRadius: 999,
      paddingVertical: 13,
      paddingHorizontal: 18,
      minHeight: 46,
    },
    ghostBtnText: { color: C.lavender, fontSize: 13, fontWeight: '600', fontFamily: DF.uiSemi },

    // Success — avatar initials + serif title (m17 header family)
    successCard: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      padding: 24,
      marginBottom: 12,
    },
    successAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: C.lavenderBg,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    successAvatarText: {
      fontSize: 22,
      fontFamily: DF.serif,
      fontWeight: '700',
      color: C.lavender,
    },
    successTitle: {
      fontSize: 21,
      fontFamily: DF.serif,
      fontWeight: '700',
      color: C.ink,
      marginBottom: 6,
    },
    successMessage: {
      fontSize: 12.5,
      fontFamily: DF.ui,
      color: C.body,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 18,
      paddingHorizontal: 8,
    },
    successActions: { flexDirection: 'column', gap: 9, width: '100%' },

    // Info card
    infoCard: {
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      padding: 14,
    },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 7 },
    infoTitle: { fontSize: 15, fontFamily: DF.serifSemi, fontWeight: '600', color: C.ink },
    infoText: { fontSize: 11.5, fontFamily: DF.ui, color: C.gray, lineHeight: 16 },
    sico: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.lavenderBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }));