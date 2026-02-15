import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const MOOD_OPTIONS = [
  { value: 'Very low', emoji: 'sad-outline', color: COLORS.moodVeryLow },
  { value: 'Low', emoji: 'sad-outline', color: COLORS.moodLow },
  { value: 'Neutral', emoji: 'ellipse-outline', color: COLORS.moodNeutral },
  { value: 'Good', emoji: 'happy-outline', color: COLORS.moodGood },
  { value: 'Great', emoji: 'happy', color: COLORS.moodGreat },
];

export default function WellnessScreen() {
  const [checkins, setCheckins] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [saving, setSaving] = useState(false);
  
  const fetchCheckins = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.WELLNESS_CHECKINS);
      setCheckins(data);
    } catch (error) {
      console.error('Error fetching checkins:', error);
    }
  };
  
  useEffect(() => {
    fetchCheckins();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCheckins();
    setRefreshing(false);
  };
  
  const saveCheckin = async () => {
    if (!selectedMood) {
      Alert.alert('Select Mood', 'Please select how you\'re feeling today.');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.WELLNESS_CHECKIN, {
        method: 'POST',
        body: {
          mood: selectedMood,
          mood_note: moodNote || null,
        },
      });
      
      await fetchCheckins();
      setSelectedMood(null);
      setMoodNote('');
      Alert.alert('Saved', 'Your check-in has been recorded.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save check-in');
    } finally {
      setSaving(false);
    }
  };
  
  const getMoodColor = (mood: string) => {
    const option = MOOD_OPTIONS.find((o) => o.value === mood);
    return option?.color || COLORS.textSecondary;
  };
  
  const getMoodEmoji = (mood: string) => {
    const option = MOOD_OPTIONS.find((o) => o.value === mood);
    return option?.emoji || 'ellipse-outline';
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Emotional Wellness</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>
        
        {/* Check-in Card */}
        <Card style={styles.checkinCard}>
          <Text style={styles.checkinTitle}>Daily Check-in</Text>
          
          {/* Mood Selector */}
          <View style={styles.moodSelector}>
            {MOOD_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.moodOption,
                  selectedMood === option.value && styles.moodOptionSelected,
                  selectedMood === option.value && { borderColor: option.color },
                ]}
                onPress={() => setSelectedMood(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.emoji as any}
                  size={32}
                  color={selectedMood === option.value ? option.color : COLORS.textLight}
                />
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === option.value && { color: option.color },
                  ]}
                >
                  {option.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Note Input */}
          <TextInput
            style={styles.noteInput}
            value={moodNote}
            onChangeText={setMoodNote}
            placeholder="Add a note about how you're feeling... (optional)"
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={3}
          />
          
          <Button
            title="Save Check-in"
            onPress={saveCheckin}
            loading={saving}
            fullWidth
          />
        </Card>
        
        {/* Affirmation */}
        <Card style={styles.affirmationCard}>
          <View style={styles.affirmationHeader}>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} />
            <Text style={styles.affirmationTitle}>Today's Affirmation</Text>
          </View>
          <Text style={styles.affirmationText}>
            "I trust my body and its ability to birth my baby. I am strong, capable, and prepared."
          </Text>
        </Card>
        
        {/* History */}
        <Text style={styles.sectionTitle}>Recent Check-ins</Text>
        {checkins.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No check-ins yet. Start tracking your emotional wellness above.
            </Text>
          </Card>
        ) : (
          checkins.slice(0, 10).map((checkin) => (
            <Card key={checkin.checkin_id} style={styles.historyCard}>
              <View style={styles.historyRow}>
                <View style={styles.historyLeft}>
                  <Ionicons
                    name={getMoodEmoji(checkin.mood) as any}
                    size={28}
                    color={getMoodColor(checkin.mood)}
                  />
                  <View style={styles.historyText}>
                    <Text style={[styles.historyMood, { color: getMoodColor(checkin.mood) }]}>
                      {checkin.mood}
                    </Text>
                    <Text style={styles.historyDate}>
                      {formatDate(checkin.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
              {checkin.mood_note && (
                <Text style={styles.historyNote}>{checkin.mood_note}</Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  header: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  checkinCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  checkinTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.md,
  },
  moodOption: {
    alignItems: 'center',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    borderWidth: 2,
    borderColor: 'transparent',
    flex: 1,
    marginHorizontal: 2,
  },
  moodOptionSelected: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
  },
  moodLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  noteInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: SIZES.md,
  },
  affirmationCard: {
    marginBottom: SIZES.lg,
    backgroundColor: COLORS.accent + '15',
  },
  affirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  affirmationTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  affirmationText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  historyCard: {
    marginBottom: SIZES.sm,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyText: {
    marginLeft: SIZES.sm,
  },
  historyMood: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  historyNote: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
});
