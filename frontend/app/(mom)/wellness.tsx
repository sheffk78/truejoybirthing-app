import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const MOODS = [
  { value: 1, emoji: '😢', label: 'Very Low' },
  { value: 2, emoji: '😔', label: 'Low' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
];

const COMMON_SYMPTOMS = [
  'Fatigue', 'Nausea', 'Back pain', 'Headache', 
  'Heartburn', 'Swelling', 'Cramps', 'Insomnia'
];

interface WellnessEntry {
  entry_id: string;
  mood: number;
  energy_level?: number;
  sleep_quality?: number;
  symptoms: string[];
  journal_notes?: string;
  created_at: string;
}

export default function WellnessScreen() {
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [mood, setMood] = useState<number>(3);
  const [energy, setEnergy] = useState<number>(3);
  const [sleep, setSleep] = useState<number>(3);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [journalNotes, setJournalNotes] = useState('');

  const fetchData = async () => {
    try {
      const [entriesData, statsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.WELLNESS_ENTRIES),
        apiRequest(`${API_ENDPOINTS.WELLNESS_STATS}?days=7`),
      ]);
      setEntries(entriesData.entries || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching wellness data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const saveEntry = async () => {
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.WELLNESS_ENTRY, {
        method: 'POST',
        body: {
          mood,
          energy_level: energy,
          sleep_quality: sleep,
          symptoms: selectedSymptoms,
          journal_notes: journalNotes,
        },
      });
      setModalVisible(false);
      resetForm();
      await fetchData();
      Alert.alert('Success', 'Wellness entry saved!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMood(3);
    setEnergy(3);
    setSleep(3);
    setSelectedSymptoms([]);
    setJournalNotes('');
  };

  const toggleSymptom = (symptom: string) => {
    if (selectedSymptoms.includes(symptom)) {
      setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
    } else {
      setSelectedSymptoms([...selectedSymptoms, symptom]);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMoodEmoji = (moodValue: number) => {
    return MOODS.find(m => m.value === moodValue)?.emoji || '😐';
  };

  const renderScaleSelector = (value: number, onChange: (v: number) => void, label: string) => (
    <View style={styles.scaleContainer}>
      <Text style={styles.scaleLabel}>{label}</Text>
      <View style={styles.scaleButtons}>
        {[1, 2, 3, 4, 5].map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.scaleButton, value === v && styles.scaleButtonActive]}
            onPress={() => onChange(v)}
          >
            <Text style={[styles.scaleButtonText, value === v && styles.scaleButtonTextActive]}>{v}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

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
        <Text style={styles.title}>Wellness Journal</Text>
        <Text style={styles.subtitle}>Track your mood, energy, and how you're feeling</Text>

        {/* Check-in Button */}
        <TouchableOpacity style={styles.checkinButton} onPress={() => setModalVisible(true)} data-testid="new-checkin-btn">
          <Icon name="add-circle" size={24} color={COLORS.white} />
          <Text style={styles.checkinButtonText}>New Check-in</Text>
        </TouchableOpacity>

        {/* Weekly Stats */}
        {stats && stats.entries_count > 0 && (
          <Card style={styles.statsCard}>
            <Text style={styles.statsTitle}>Your Week</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avg_mood?.toFixed(1) || '-'}</Text>
                <Text style={styles.statLabel}>Avg Mood</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avg_energy?.toFixed(1) || '-'}</Text>
                <Text style={styles.statLabel}>Avg Energy</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.avg_sleep?.toFixed(1) || '-'}</Text>
                <Text style={styles.statLabel}>Avg Sleep</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.entries_count}</Text>
                <Text style={styles.statLabel}>Check-ins</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Recent Entries */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Entries</Text>
          {entries.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="heart" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyText}>No wellness entries yet</Text>
              <Text style={styles.emptySubtext}>Start tracking how you're feeling!</Text>
            </Card>
          ) : (
            entries.slice(0, 10).map((entry) => (
              <Card key={entry.entry_id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryEmoji}>{getMoodEmoji(entry.mood)}</Text>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entryDate}>{formatDate(entry.created_at)}</Text>
                    <View style={styles.entryScores}>
                      {entry.energy_level && (
                        <Text style={styles.entryScore}>Energy: {entry.energy_level}/5</Text>
                      )}
                      {entry.sleep_quality && (
                        <Text style={styles.entryScore}>Sleep: {entry.sleep_quality}/5</Text>
                      )}
                    </View>
                  </View>
                </View>
                {entry.symptoms && entry.symptoms.length > 0 && (
                  <View style={styles.symptomsRow}>
                    {entry.symptoms.map((s) => (
                      <View key={s} style={styles.symptomTag}>
                        <Text style={styles.symptomTagText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {entry.journal_notes && (
                  <Text style={styles.journalText}>{entry.journal_notes}</Text>
                )}
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Check-in Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} data-testid="close-checkin-modal-btn">
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Daily Check-in</Text>
              <View style={{ width: 24 }} />
            </View>
            
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Mood Selection */}
            <View style={styles.moodSection}>
              <Text style={styles.moodLabel}>How are you feeling today?</Text>
              <View style={styles.moodButtons}>
                {MOODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.moodButton, mood === m.value && styles.moodButtonActive]}
                    onPress={() => setMood(m.value)}
                    data-testid={`mood-${m.value}`}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <Text style={[styles.moodText, mood === m.value && styles.moodTextActive]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Energy & Sleep */}
            {renderScaleSelector(energy, setEnergy, 'Energy Level')}
            {renderScaleSelector(sleep, setSleep, 'Sleep Quality')}

            {/* Symptoms */}
            <View style={styles.symptomsSection}>
              <Text style={styles.scaleLabel}>Any Symptoms?</Text>
              <View style={styles.symptomChips}>
                {COMMON_SYMPTOMS.map((symptom) => (
                  <TouchableOpacity
                    key={symptom}
                    style={[
                      styles.symptomChip,
                      selectedSymptoms.includes(symptom) && styles.symptomChipActive
                    ]}
                    onPress={() => toggleSymptom(symptom)}
                  >
                    <Text style={[
                      styles.symptomChipText,
                      selectedSymptoms.includes(symptom) && styles.symptomChipTextActive
                    ]}>
                      {symptom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Journal */}
            <View style={styles.journalSection}>
              <Text style={styles.scaleLabel}>Journal Notes</Text>
              <TextInput
                style={styles.journalInput}
                value={journalNotes}
                onChangeText={setJournalNotes}
                placeholder="How was your day? Any thoughts or feelings to capture..."
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                data-testid="journal-input"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={saving ? 'Saving...' : 'Save Check-in'}
              onPress={saveEntry}
              disabled={saving}
              fullWidth
              data-testid="save-checkin-btn"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginBottom: SIZES.lg },
  checkinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: SIZES.md, borderRadius: SIZES.radiusMd, marginBottom: SIZES.lg, gap: SIZES.xs },
  checkinButtonText: { color: COLORS.white, fontWeight: '600', fontSize: SIZES.fontMd },
  statsCard: { marginBottom: SIZES.lg },
  statsTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textLight },
  section: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  emptyCard: { alignItems: 'center', padding: SIZES.xl },
  emptyText: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  entryCard: { marginBottom: SIZES.sm },
  entryHeader: { flexDirection: 'row', alignItems: 'center' },
  entryEmoji: { fontSize: 32, marginRight: SIZES.md },
  entryMeta: { flex: 1 },
  entryDate: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },
  entryScores: { flexDirection: 'row', gap: SIZES.md },
  entryScore: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs, marginTop: SIZES.sm },
  symptomTag: { backgroundColor: COLORS.warning + '20', paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  symptomTagText: { fontSize: SIZES.fontXs, color: COLORS.warning },
  journalText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: SIZES.sm, fontStyle: 'italic' },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary },
  modalScroll: { flex: 1, padding: SIZES.md },
  moodSection: { marginBottom: SIZES.lg },
  moodLabel: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md, textAlign: 'center' },
  moodButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: { alignItems: 'center', padding: SIZES.sm, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.border, flex: 1, marginHorizontal: 2 },
  moodButtonActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  moodEmoji: { fontSize: 24 },
  moodText: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 2 },
  moodTextActive: { color: COLORS.primary, fontWeight: '600' },
  scaleContainer: { marginBottom: SIZES.lg },
  scaleLabel: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  scaleButtons: { flexDirection: 'row', gap: SIZES.xs },
  scaleButton: { flex: 1, alignItems: 'center', padding: SIZES.sm, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  scaleButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  scaleButtonText: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textSecondary },
  scaleButtonTextActive: { color: COLORS.white },
  symptomsSection: { marginBottom: SIZES.lg },
  symptomChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  symptomChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  symptomChipActive: { backgroundColor: COLORS.warning, borderColor: COLORS.warning },
  symptomChipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  symptomChipTextActive: { color: COLORS.white },
  journalSection: { marginBottom: SIZES.lg },
  journalInput: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.textPrimary, minHeight: 120, borderWidth: 1, borderColor: COLORS.border },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border },
});
