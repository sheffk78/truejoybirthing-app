import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useSubscriptionStore } from '../src/store/subscriptionStore';
import { apiRequest } from '../src/utils/api';
import { API_ENDPOINTS } from '../src/constants/api';
import { useColors, createThemedStyles } from '../src/hooks/useThemedStyles';

const MAX_CHARACTERS = 800;

const FEEDBACK_TOPICS = [
  { value: '', label: 'Select a topic (optional)' },
  { value: 'Bug / something broken', label: 'Bug / something broken' },
  { value: 'Feature request', label: 'Feature request' },
  { value: 'General comment', label: 'General comment' },
];

export default function ProFeedbackScreen() {
  const { user } = useAuthStore();
  const { status, fetchStatus } = useSubscriptionStore();
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTopic, setFeedbackTopic] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const colors = useColors();
  const styles = getStyles(colors);

  useEffect(() => {
    fetchStatus();
  }, []);

  // Check if user has Pro access
  const hasProAccess = status?.has_pro_access && !status?.is_mom;

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Required', 'Please enter your feedback before submitting.');
      return;
    }

    if (feedbackText.length > MAX_CHARACTERS) {
      Alert.alert('Too Long', `Please keep feedback under ${MAX_CHARACTERS} characters so we can respond quickly.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(API_ENDPOINTS.PRO_FEEDBACK, {
        method: 'POST',
        body: JSON.stringify({
          feedback_text: feedbackText.trim(),
          feedback_topic: feedbackTopic || null,
          platform: Platform.OS === 'web' ? 'Web' : Platform.OS === 'ios' ? 'iOS' : 'Android',
          app_version: '1.0.0',
        }),
      });
      
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show access denied if no Pro access
  if (!hasProAccess && status !== null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Send Feedback</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={48} color={colors.textSecondary} />
          <Text style={styles.accessDeniedTitle}>Pro Feature</Text>
          <Text style={styles.accessDeniedText}>
            The feedback form is available for Pro subscribers only.
          </Text>
          <TouchableOpacity 
            style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/plans-pricing')}
          >
            <Text style={styles.upgradeButtonText}>View Pro Plans</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show success screen
  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={64} color={colors.success} />
          </View>
          <Text style={styles.successTitle}>Thank You!</Text>
          <Text style={styles.successText}>
            Your feedback was sent to the True Joy Birthing team.
          </Text>
          <TouchableOpacity 
            style={[styles.doneButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const charactersRemaining = MAX_CHARACTERS - feedbackText.length;
  const isOverLimit = charactersRemaining < 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Feedback</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.introCard}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.primary} />
          <Text style={styles.introText}>
            Tell us what's working well, what's confusing, or what you'd love to see next. 
            This goes directly to the True Joy Birthing team.
          </Text>
        </View>

        {/* Topic Selector */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Topic (optional)</Text>
          <View style={styles.topicSelector}>
            {FEEDBACK_TOPICS.map((topic) => (
              <TouchableOpacity
                key={topic.value}
                style={[
                  styles.topicOption,
                  feedbackTopic === topic.value && topic.value !== '' && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
                ]}
                onPress={() => setFeedbackTopic(topic.value)}
              >
                <Text style={[
                  styles.topicOptionText,
                  feedbackTopic === topic.value && topic.value !== '' && { color: colors.primary, fontWeight: '500' },
                ]}>
                  {topic.label}
                </Text>
                {feedbackTopic === topic.value && topic.value !== '' && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Feedback Text */}
        <View style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>Your Feedback</Text>
          <TextInput
            style={[styles.textInput, isOverLimit && { borderColor: colors.error }]}
            multiline
            numberOfLines={6}
            placeholder="I'd love an easier way to see upcoming births..."
            placeholderTextColor={colors.textSecondary}
            value={feedbackText}
            onChangeText={setFeedbackText}
            textAlignVertical="top"
            maxLength={MAX_CHARACTERS + 50}
          />
          <Text style={[styles.characterCount, isOverLimit && { color: colors.error }]}>
            {charactersRemaining} characters remaining
          </Text>
        </View>

        {/* User Info Preview */}
        <View style={styles.userInfoCard}>
          <Text style={styles.userInfoLabel}>Sending as:</Text>
          <Text style={styles.userInfoName}>{user?.full_name}</Text>
          <Text style={styles.userInfoEmail}>{user?.email}</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: colors.primary },
            (!feedbackText.trim() || isOverLimit || isSubmitting) && { backgroundColor: colors.textSecondary }
          ]}
          onPress={handleSubmit}
          disabled={!feedbackText.trim() || isOverLimit || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Send Feedback</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: colors.text },
  content: { flex: 1, padding: 16 },

  introCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary + '15',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },

  fieldContainer: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },

  topicSelector: { gap: 8 },
  topicOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicOptionText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: colors.text,
    minHeight: 150,
    lineHeight: 22,
  },
  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
  },

  userInfoCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userInfoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  userInfoName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  userInfoEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  // Access Denied
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Success
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  doneButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
}));
