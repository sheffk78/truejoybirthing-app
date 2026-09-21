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
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, kickerStyle, srowBase } from '../../src/constants/designRefresh';
const DF = F;

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
  const colors = useColors();
  const styles = getStyles(colors);
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.rose} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header - S14 mockup: kicker + serif title */}
        <View style={styles.header}>
          <Text style={styles.headerKicker}>Wellness Journal</Text>
          <Text style={styles.headerTitle}>How are you feeling{' '}
            <Text style={styles.headerName}>today?</Text>
          </Text>
        </View>

        {/* Daily Check-in Button */}
        <TouchableOpacity style={styles.checkinButton} onPress={() => setModalVisible(true)} data-testid="new-checkin-btn">
          <Icon name="add-circle" size={24} color={C.white} />
          <Text style={styles.checkinButtonText}>Daily Check-in</Text>
        </TouchableOpacity>

        {/* Weekly Stats - 2x2 grid (Jeff approved 2026-09-21) */}
        {stats && stats.entries_count > 0 && (
          <Card style={styles.statsCard}>
            <Text style={styles.statsKicker}>YOUR WEEK</Text>
            <View style={styles.statsGrid}>
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
              <Icon name="heart" size={40} color={C.grayLight} />
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
                <Icon name="close" size={24} color={C.ink} />
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
                placeholderTextColor={C.grayLight}
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: C.cream },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { alignItems: 'center', marginBottom: SIZES.lg },
  headerKicker: { ...kickerStyle(C.rose), marginBottom: 6 },
  headerTitle: { fontFamily: DF.serif, fontSize: 26, color: C.ink, marginBottom: 14, textAlign: 'center' },
  headerName: { color: C.rose },
  checkinButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: C.rose, padding: SIZES.md, borderRadius: SIZES.radiusMd, marginBottom: SIZES.lg, gap: SIZES.xs },
  checkinButtonText: { color: C.white, fontWeight: '600', fontSize: SIZES.fontMd },
  statsCard: { marginBottom: SIZES.lg },
  statsKicker: { fontSize: SIZES.fontSm, fontFamily: DF.ui, color: C.gray, marginBottom: SIZES.md, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  statItem: { width: '48%', backgroundColor: C.cardBg, borderRadius: SIZES.radiusMd, padding: SIZES.md, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  statValue: { fontSize: SIZES.fontXxl, fontWeight: '700', color: C.lavender },
  statLabel: { fontSize: SIZES.fontXs, color: C.grayLight, marginTop: SIZES.xs },
  section: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: C.ink, marginBottom: SIZES.md },
  emptyCard: { alignItems: 'center', padding: SIZES.xl, backgroundColor: C.white, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: C.border },
  emptyText: { fontSize: SIZES.fontMd, fontWeight: '600', color: C.ink, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, color: C.gray },
  // Rowline entry card (S14 mockup style)
  entryCard: { backgroundColor: C.white, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: C.border, padding: SIZES.md, marginBottom: SIZES.sm },
  entryHeader: { flexDirection: 'row', alignItems: 'center' },
  entryEmoji: { fontSize: 32, marginRight: SIZES.md },
  entryMeta: { flex: 1 },
  entryDate: { fontSize: SIZES.fontMd, fontWeight: '600', color: C.ink },
  entryScores: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.xs },
  entryScore: { fontSize: SIZES.fontSm, color: C.gray },
  symptomsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs, marginTop: SIZES.sm },
  symptomTag: { backgroundColor: C.sage + '20', paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  symptomTagText: { fontSize: SIZES.fontXs, color: C.sage },
  journalText: { fontSize: SIZES.fontSm, color: C.gray, marginTop: SIZES.sm, fontStyle: 'italic' },
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: C.cream },
  keyboardAvoidingContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: C.ink },
  modalScroll: { flex: 1, padding: SIZES.md },
  moodSection: { marginBottom: SIZES.lg },
  moodLabel: { fontSize: SIZES.fontMd, fontWeight: '600', color: C.ink, marginBottom: SIZES.md, textAlign: 'center' },
  moodButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  moodButton: { alignItems: 'center', padding: SIZES.sm, borderRadius: SIZES.radiusMd, backgroundColor: C.cardBg, borderWidth: 2, borderColor: C.border, flex: 1, marginHorizontal: 2 },
  moodButtonActive: { borderColor: C.rose, backgroundColor: C.roseBg },
  moodEmoji: { fontSize: 24 },
  moodText: { fontSize: SIZES.fontXs, color: C.gray, marginTop: 2 },
  moodTextActive: { color: C.rose, fontWeight: '600' },
  scaleContainer: { marginBottom: SIZES.lg },
  scaleLabel: { fontSize: SIZES.fontMd, fontWeight: '600', color: C.ink, marginBottom: SIZES.sm },
  scaleButtons: { flexDirection: 'row', gap: SIZES.xs },
  scaleButton: { flex: 1, alignItems: 'center', padding: SIZES.sm, borderRadius: SIZES.radiusMd, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border },
  scaleButtonActive: { backgroundColor: C.rose, borderColor: C.rose },
  scaleButtonText: { fontSize: SIZES.fontMd, fontWeight: '600', color: C.gray },
  scaleButtonTextActive: { color: C.white },
  symptomsSection: { marginBottom: SIZES.lg },
  symptomChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  symptomChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusFull, backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border },
  symptomChipActive: { backgroundColor: C.rose, borderColor: C.rose },
  symptomChipText: { fontSize: SIZES.fontSm, color: C.gray },
  symptomChipTextActive: { color: C.white },
  journalSection: { marginBottom: SIZES.lg },
  journalInput: { backgroundColor: C.cardBg, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, color: C.ink, minHeight: 120, borderWidth: 1, borderColor: C.border },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1, borderTopColor: C.border },
}));
