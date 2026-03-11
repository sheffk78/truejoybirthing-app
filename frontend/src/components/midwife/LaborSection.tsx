// LaborSection.tsx - Labor Record Tracking for Midwives
// Provides a chronological list of labor entries with add/edit modal

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { SIZES, FONTS, SHADOWS } from '../../constants/theme';
import { useColors, createThemedStyles } from '../../hooks/useThemedStyles';

// ============== TYPES ==============
interface LaborRecord {
  labor_record_id: string;
  client_id: string;
  entry_datetime: string;
  labor_stage?: string;
  stage_notes?: string;
  dilation_cm?: number;
  effacement_percent?: number;
  station?: string;
  contractions_per_10min?: number;
  contraction_duration_sec?: number;
  contraction_strength?: string;
  membranes_status?: string;
  rupture_time?: string;
  fluid_color?: string;
  fluid_amount?: string;
  maternal_bp?: string;
  maternal_pulse?: number;
  maternal_temp?: number;
  maternal_respirations?: number;
  maternal_position?: string;
  pain_coping_level?: number;
  coping_methods?: string;
  emotional_status?: string;
  fetal_heart_rate?: number;
  fhr_baseline?: string;
  fhr_variability?: string;
  decelerations?: string;
  fetal_concerns?: string;
  interventions?: string;
  medications_given?: string;
  communication_notes?: string;
  general_notes?: string;
  summary?: string;
  created_at?: string;
}

interface LaborSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const LABOR_STAGES = [
  { value: 'early', label: 'Early Labor' },
  { value: 'active', label: 'Active Labor' },
  { value: 'transition', label: 'Transition' },
  { value: 'pushing', label: 'Pushing' },
  { value: 'delivery', label: 'Delivery' },
];

const CONTRACTION_STRENGTHS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
];

const MEMBRANE_STATUSES = [
  { value: 'intact', label: 'Intact' },
  { value: 'ruptured', label: 'Ruptured' },
  { value: 'artificial_rupture', label: 'Artificial Rupture' },
];

const FLUID_COLORS = [
  { value: 'clear', label: 'Clear' },
  { value: 'bloody', label: 'Bloody' },
  { value: 'light_meconium', label: 'Light Meconium' },
  { value: 'thick_meconium', label: 'Thick Meconium' },
];

const FLUID_AMOUNTS = [
  { value: 'scant', label: 'Scant' },
  { value: 'normal', label: 'Normal' },
  { value: 'copious', label: 'Copious' },
];

const STATION_OPTIONS = ['-3', '-2', '-1', '0', '+1', '+2', '+3'];

const FHR_BASELINES = [
  { value: 'normal', label: 'Normal (110-160)' },
  { value: 'tachycardic', label: 'Tachycardic (>160)' },
  { value: 'bradycardic', label: 'Bradycardic (<110)' },
];

const FHR_VARIABILITY = [
  { value: 'absent', label: 'Absent' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'marked', label: 'Marked' },
];

const DECELERATIONS = [
  { value: 'none', label: 'None' },
  { value: 'early', label: 'Early' },
  { value: 'late', label: 'Late' },
  { value: 'variable', label: 'Variable' },
];

// ============== MAIN COMPONENT ==============
export default function LaborSection({ clientId, primaryColor, onRefresh }: LaborSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  // State
  const [laborRecords, setLaborRecords] = useState<LaborRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<LaborRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<LaborRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [laborStage, setLaborStage] = useState<string>('');
  const [stageNotes, setStageNotes] = useState('');
  const [dilationCm, setDilationCm] = useState('');
  const [effacementPercent, setEffacementPercent] = useState('');
  const [station, setStation] = useState('');
  const [contractionsPerMin, setContractionsPerMin] = useState('');
  const [contractionDuration, setContractionDuration] = useState('');
  const [contractionStrength, setContractionStrength] = useState('');
  const [membranesStatus, setMembranesStatus] = useState('');
  const [ruptureTime, setRuptureTime] = useState('');
  const [fluidColor, setFluidColor] = useState('');
  const [fluidAmount, setFluidAmount] = useState('');
  const [maternalBp, setMaternalBp] = useState('');
  const [maternalPulse, setMaternalPulse] = useState('');
  const [maternalTemp, setMaternalTemp] = useState('');
  const [maternalRespirations, setMaternalRespirations] = useState('');
  const [maternalPosition, setMaternalPosition] = useState('');
  const [painCopingLevel, setPainCopingLevel] = useState<number | null>(null);
  const [copingMethods, setCopingMethods] = useState('');
  const [emotionalStatus, setEmotionalStatus] = useState('');
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fhrBaseline, setFhrBaseline] = useState('');
  const [fhrVariability, setFhrVariability] = useState('');
  const [decelerations, setDecelerations] = useState('');
  const [fetalConcerns, setFetalConcerns] = useState('');
  const [interventions, setInterventions] = useState('');
  const [medicationsGiven, setMedicationsGiven] = useState('');
  const [communicationNotes, setCommunicationNotes] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // ============== DATA FETCHING ==============
  const fetchLaborRecords = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const records = await apiRequest(`/midwife/clients/${clientId}/labor-records`);
      setLaborRecords(records || []);
    } catch (error: any) {
      console.error('Error fetching labor records:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchLaborRecords();
  }, [fetchLaborRecords]);

  // ============== HELPERS ==============
  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const resetForm = () => {
    setLaborStage('');
    setStageNotes('');
    setDilationCm('');
    setEffacementPercent('');
    setStation('');
    setContractionsPerMin('');
    setContractionDuration('');
    setContractionStrength('');
    setMembranesStatus('');
    setRuptureTime('');
    setFluidColor('');
    setFluidAmount('');
    setMaternalBp('');
    setMaternalPulse('');
    setMaternalTemp('');
    setMaternalRespirations('');
    setMaternalPosition('');
    setPainCopingLevel(null);
    setCopingMethods('');
    setEmotionalStatus('');
    setFetalHeartRate('');
    setFhrBaseline('');
    setFhrVariability('');
    setDecelerations('');
    setFetalConcerns('');
    setInterventions('');
    setMedicationsGiven('');
    setCommunicationNotes('');
    setGeneralNotes('');
    setEditingRecord(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (record: LaborRecord) => {
    setEditingRecord(record);
    setLaborStage(record.labor_stage || '');
    setStageNotes(record.stage_notes || '');
    setDilationCm(record.dilation_cm?.toString() || '');
    setEffacementPercent(record.effacement_percent?.toString() || '');
    setStation(record.station || '');
    setContractionsPerMin(record.contractions_per_10min?.toString() || '');
    setContractionDuration(record.contraction_duration_sec?.toString() || '');
    setContractionStrength(record.contraction_strength || '');
    setMembranesStatus(record.membranes_status || '');
    setRuptureTime(record.rupture_time || '');
    setFluidColor(record.fluid_color || '');
    setFluidAmount(record.fluid_amount || '');
    setMaternalBp(record.maternal_bp || '');
    setMaternalPulse(record.maternal_pulse?.toString() || '');
    setMaternalTemp(record.maternal_temp?.toString() || '');
    setMaternalRespirations(record.maternal_respirations?.toString() || '');
    setMaternalPosition(record.maternal_position || '');
    setPainCopingLevel(record.pain_coping_level || null);
    setCopingMethods(record.coping_methods || '');
    setEmotionalStatus(record.emotional_status || '');
    setFetalHeartRate(record.fetal_heart_rate?.toString() || '');
    setFhrBaseline(record.fhr_baseline || '');
    setFhrVariability(record.fhr_variability || '');
    setDecelerations(record.decelerations || '');
    setFetalConcerns(record.fetal_concerns || '');
    setInterventions(record.interventions || '');
    setMedicationsGiven(record.medications_given || '');
    setCommunicationNotes(record.communication_notes || '');
    setGeneralNotes(record.general_notes || '');
    setShowDetailModal(null);
    setShowModal(true);
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        labor_stage: laborStage || undefined,
        stage_notes: stageNotes || undefined,
        dilation_cm: dilationCm ? parseFloat(dilationCm) : undefined,
        effacement_percent: effacementPercent ? parseInt(effacementPercent) : undefined,
        station: station || undefined,
        contractions_per_10min: contractionsPerMin ? parseInt(contractionsPerMin) : undefined,
        contraction_duration_sec: contractionDuration ? parseInt(contractionDuration) : undefined,
        contraction_strength: contractionStrength || undefined,
        membranes_status: membranesStatus || undefined,
        rupture_time: ruptureTime || undefined,
        fluid_color: fluidColor || undefined,
        fluid_amount: fluidAmount || undefined,
        maternal_bp: maternalBp || undefined,
        maternal_pulse: maternalPulse ? parseInt(maternalPulse) : undefined,
        maternal_temp: maternalTemp ? parseFloat(maternalTemp) : undefined,
        maternal_respirations: maternalRespirations ? parseInt(maternalRespirations) : undefined,
        maternal_position: maternalPosition || undefined,
        pain_coping_level: painCopingLevel || undefined,
        coping_methods: copingMethods || undefined,
        emotional_status: emotionalStatus || undefined,
        fetal_heart_rate: fetalHeartRate ? parseInt(fetalHeartRate) : undefined,
        fhr_baseline: fhrBaseline || undefined,
        fhr_variability: fhrVariability || undefined,
        decelerations: decelerations || undefined,
        fetal_concerns: fetalConcerns || undefined,
        interventions: interventions || undefined,
        medications_given: medicationsGiven || undefined,
        communication_notes: communicationNotes || undefined,
        general_notes: generalNotes || undefined,
      };

      if (editingRecord) {
        await apiRequest(`/midwife/clients/${clientId}/labor-records/${editingRecord.labor_record_id}`, {
          method: 'PUT',
          body: data,
        });
        Alert.alert('Success', 'Labor record updated');
      } else {
        await apiRequest(`/midwife/clients/${clientId}/labor-records`, {
          method: 'POST',
          body: data,
        });
        Alert.alert('Success', 'Labor record created');
      }

      setShowModal(false);
      resetForm();
      fetchLaborRecords();
      onRefresh?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save labor record');
    } finally {
      setSaving(false);
    }
  };

  // ============== DELETE HANDLER ==============
  const handleDelete = (record: LaborRecord) => {
    Alert.alert(
      'Delete Labor Record',
      'Are you sure you want to delete this labor entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/midwife/clients/${clientId}/labor-records/${record.labor_record_id}`, {
                method: 'DELETE',
              });
              setShowDetailModal(null);
              fetchLaborRecords();
              Alert.alert('Deleted', 'Labor record deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ============== RENDER HELPERS ==============
  const renderOptionButtons = (
    options: { value: string; label: string }[],
    selectedValue: string,
    onSelect: (val: string) => void
  ) => (
    <View style={styles.optionsRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionButton,
            selectedValue === opt.value && [styles.optionButtonSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
          ]}
          onPress={() => onSelect(selectedValue === opt.value ? '' : opt.value)}
        >
          <Text style={[styles.optionButtonText, selectedValue === opt.value && styles.optionButtonTextSelected]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderPainScale = () => (
    <View style={styles.painScaleRow}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
        <TouchableOpacity
          key={num}
          style={[
            styles.painScaleButton,
            painCopingLevel === num && [styles.painScaleButtonSelected, { backgroundColor: primaryColor }],
          ]}
          onPress={() => setPainCopingLevel(painCopingLevel === num ? null : num)}
        >
          <Text style={[styles.painScaleText, painCopingLevel === num && styles.painScaleTextSelected]}>
            {num}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="pulse-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Labor Records</Text>
          <Text style={styles.recordCount}>({laborRecords.length})</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={openAddModal}
          data-testid="add-labor-record-btn"
        >
          <Icon name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : laborRecords.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="pulse-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No labor records yet</Text>
          <Text style={styles.emptyText}>
            Tap the + button above to start tracking labor progress.
          </Text>
        </Card>
      ) : (
        laborRecords.map((record) => (
          <TouchableOpacity
            key={record.labor_record_id}
            activeOpacity={0.8}
            onPress={() => setShowDetailModal(record)}
          >
            <Card style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={[styles.timeBadge, { backgroundColor: primaryColor + '15' }]}>
                  <Icon name="time-outline" size={14} color={primaryColor} />
                  <Text style={[styles.timeText, { color: primaryColor }]}>
                    {formatDateTime(record.entry_datetime)}
                  </Text>
                </View>
                <Icon name="chevron-forward" size={18} color={colors.textLight} />
              </View>
              
              {record.labor_stage && (
                <View style={[styles.stageBadge, { backgroundColor: primaryColor + '20' }]}>
                  <Text style={[styles.stageText, { color: primaryColor }]}>
                    {LABOR_STAGES.find(s => s.value === record.labor_stage)?.label || record.labor_stage}
                  </Text>
                </View>
              )}

              <View style={styles.vitalsPreview}>
                {record.dilation_cm !== undefined && (
                  <View style={styles.vitalChip}>
                    <Text style={styles.vitalLabel}>Dilation</Text>
                    <Text style={styles.vitalValue}>{record.dilation_cm}cm</Text>
                  </View>
                )}
                {record.effacement_percent !== undefined && (
                  <View style={styles.vitalChip}>
                    <Text style={styles.vitalLabel}>Effacement</Text>
                    <Text style={styles.vitalValue}>{record.effacement_percent}%</Text>
                  </View>
                )}
                {record.station && (
                  <View style={styles.vitalChip}>
                    <Text style={styles.vitalLabel}>Station</Text>
                    <Text style={styles.vitalValue}>{record.station}</Text>
                  </View>
                )}
                {record.fetal_heart_rate && (
                  <View style={styles.vitalChip}>
                    <Text style={styles.vitalLabel}>FHR</Text>
                    <Text style={styles.vitalValue}>{record.fetal_heart_rate}</Text>
                  </View>
                )}
                {record.maternal_bp && (
                  <View style={styles.vitalChip}>
                    <Text style={styles.vitalLabel}>BP</Text>
                    <Text style={styles.vitalValue}>{record.maternal_bp}</Text>
                  </View>
                )}
              </View>
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingRecord ? 'Edit Labor Entry' : 'Add Labor Entry'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Stage of Labor */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Stage of Labor</Text>
              {renderOptionButtons(LABOR_STAGES, laborStage, setLaborStage)}
              <TextInput
                style={[styles.input, styles.textArea, { marginTop: SIZES.sm }]}
                placeholder="Stage notes (optional)..."
                placeholderTextColor={colors.textLight}
                value={stageNotes}
                onChangeText={setStageNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Labor Progress */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Labor Progress (Vaginal Exam)</Text>
              
              <Text style={styles.fieldLabel}>Dilation (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="0-10"
                placeholderTextColor={colors.textLight}
                value={dilationCm}
                onChangeText={setDilationCm}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Effacement (%)</Text>
              <TextInput
                style={styles.input}
                placeholder="0-100"
                placeholderTextColor={colors.textLight}
                value={effacementPercent}
                onChangeText={setEffacementPercent}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Station</Text>
              <View style={styles.optionsRow}>
                {STATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionButton,
                      station === opt && [styles.optionButtonSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
                    ]}
                    onPress={() => setStation(station === opt ? '' : opt)}
                  >
                    <Text style={[styles.optionButtonText, station === opt && styles.optionButtonTextSelected]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Contraction Pattern */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Contraction Pattern</Text>
              
              <Text style={styles.fieldLabel}>Contractions per 10 min</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 4"
                placeholderTextColor={colors.textLight}
                value={contractionsPerMin}
                onChangeText={setContractionsPerMin}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Duration (seconds)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 60"
                placeholderTextColor={colors.textLight}
                value={contractionDuration}
                onChangeText={setContractionDuration}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Strength</Text>
              {renderOptionButtons(CONTRACTION_STRENGTHS, contractionStrength, setContractionStrength)}
            </View>

            {/* Membranes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Membranes</Text>
              
              <Text style={styles.fieldLabel}>Status</Text>
              {renderOptionButtons(MEMBRANE_STATUSES, membranesStatus, setMembranesStatus)}

              {(membranesStatus === 'ruptured' || membranesStatus === 'artificial_rupture') && (
                <>
                  <Text style={styles.fieldLabel}>Rupture Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 14:30"
                    placeholderTextColor={colors.textLight}
                    value={ruptureTime}
                    onChangeText={setRuptureTime}
                  />

                  <Text style={styles.fieldLabel}>Fluid Color</Text>
                  {renderOptionButtons(FLUID_COLORS, fluidColor, setFluidColor)}

                  <Text style={styles.fieldLabel}>Fluid Amount</Text>
                  {renderOptionButtons(FLUID_AMOUNTS, fluidAmount, setFluidAmount)}
                </>
              )}
            </View>

            {/* Maternal Wellbeing */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Maternal Wellbeing</Text>
              
              <Text style={styles.fieldLabel}>Blood Pressure</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 120/80"
                placeholderTextColor={colors.textLight}
                value={maternalBp}
                onChangeText={setMaternalBp}
              />

              <Text style={styles.fieldLabel}>Pulse (bpm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 88"
                placeholderTextColor={colors.textLight}
                value={maternalPulse}
                onChangeText={setMaternalPulse}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Temperature</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 98.6"
                placeholderTextColor={colors.textLight}
                value={maternalTemp}
                onChangeText={setMaternalTemp}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Respirations</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 16"
                placeholderTextColor={colors.textLight}
                value={maternalRespirations}
                onChangeText={setMaternalRespirations}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Position</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Left lateral, hands and knees"
                placeholderTextColor={colors.textLight}
                value={maternalPosition}
                onChangeText={setMaternalPosition}
              />

              <Text style={styles.fieldLabel}>Pain/Coping Level (1-10)</Text>
              {renderPainScale()}

              <Text style={styles.fieldLabel}>Coping Methods</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Breathing, water, partner support"
                placeholderTextColor={colors.textLight}
                value={copingMethods}
                onChangeText={setCopingMethods}
              />

              <Text style={styles.fieldLabel}>Emotional Status</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="How is mom feeling emotionally?"
                placeholderTextColor={colors.textLight}
                value={emotionalStatus}
                onChangeText={setEmotionalStatus}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Fetal Wellbeing */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Fetal Wellbeing</Text>
              
              <Text style={styles.fieldLabel}>Fetal Heart Rate (bpm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 145"
                placeholderTextColor={colors.textLight}
                value={fetalHeartRate}
                onChangeText={setFetalHeartRate}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>FHR Baseline</Text>
              {renderOptionButtons(FHR_BASELINES, fhrBaseline, setFhrBaseline)}

              <Text style={styles.fieldLabel}>FHR Variability</Text>
              {renderOptionButtons(FHR_VARIABILITY, fhrVariability, setFhrVariability)}

              <Text style={styles.fieldLabel}>Decelerations</Text>
              {renderOptionButtons(DECELERATIONS, decelerations, setDecelerations)}

              <Text style={styles.fieldLabel}>Fetal Concerns</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any concerns about fetal wellbeing?"
                placeholderTextColor={colors.textLight}
                value={fetalConcerns}
                onChangeText={setFetalConcerns}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Interventions & Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Interventions & Notes</Text>
              
              <Text style={styles.fieldLabel}>Interventions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Position changes, fluids, etc."
                placeholderTextColor={colors.textLight}
                value={interventions}
                onChangeText={setInterventions}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.fieldLabel}>Medications Given</Text>
              <TextInput
                style={styles.input}
                placeholder="Any medications administered"
                placeholderTextColor={colors.textLight}
                value={medicationsGiven}
                onChangeText={setMedicationsGiven}
              />

              <Text style={styles.fieldLabel}>Communication Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Consultations, transfer decisions, etc."
                placeholderTextColor={colors.textLight}
                value={communicationNotes}
                onChangeText={setCommunicationNotes}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.fieldLabel}>General Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional observations..."
                placeholderTextColor={colors.textLight}
                value={generalNotes}
                onChangeText={setGeneralNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={editingRecord ? 'Update Entry' : 'Save Entry'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={!!showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetailModal(null)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Labor Entry</Text>
            <TouchableOpacity onPress={() => showDetailModal && openEditModal(showDetailModal)}>
              <Icon name="create-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>

          {showDetailModal && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailDateHeader}>
                <Icon name="time" size={20} color={primaryColor} />
                <Text style={[styles.detailDate, { color: primaryColor }]}>
                  {formatDateTime(showDetailModal.entry_datetime)}
                </Text>
              </View>

              {showDetailModal.labor_stage && (
                <View style={[styles.stageBadgeDetail, { backgroundColor: primaryColor + '20' }]}>
                  <Text style={[styles.stageBadgeDetailText, { color: primaryColor }]}>
                    {LABOR_STAGES.find(s => s.value === showDetailModal.labor_stage)?.label}
                  </Text>
                </View>
              )}

              {/* Labor Progress Card */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Labor Progress</Text>
                {showDetailModal.dilation_cm !== undefined && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Dilation:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.dilation_cm} cm</Text>
                  </View>
                )}
                {showDetailModal.effacement_percent !== undefined && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Effacement:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.effacement_percent}%</Text>
                  </View>
                )}
                {showDetailModal.station && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Station:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.station}</Text>
                  </View>
                )}
                {!showDetailModal.dilation_cm && !showDetailModal.effacement_percent && !showDetailModal.station && (
                  <Text style={styles.noDataText}>No progress data recorded</Text>
                )}
              </Card>

              {/* Contractions Card */}
              {(showDetailModal.contractions_per_10min || showDetailModal.contraction_duration_sec || showDetailModal.contraction_strength) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Contractions</Text>
                  {showDetailModal.contractions_per_10min && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Frequency:</Text>
                      <Text style={styles.detailValue}>{showDetailModal.contractions_per_10min}/10min</Text>
                    </View>
                  )}
                  {showDetailModal.contraction_duration_sec && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Duration:</Text>
                      <Text style={styles.detailValue}>{showDetailModal.contraction_duration_sec} sec</Text>
                    </View>
                  )}
                  {showDetailModal.contraction_strength && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Strength:</Text>
                      <Text style={styles.detailValue}>{showDetailModal.contraction_strength}</Text>
                    </View>
                  )}
                </Card>
              )}

              {/* Membranes Card */}
              {showDetailModal.membranes_status && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Membranes</Text>
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={styles.detailValue}>
                      {MEMBRANE_STATUSES.find(m => m.value === showDetailModal.membranes_status)?.label}
                    </Text>
                  </View>
                  {showDetailModal.rupture_time && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Rupture Time:</Text>
                      <Text style={styles.detailValue}>{showDetailModal.rupture_time}</Text>
                    </View>
                  )}
                  {showDetailModal.fluid_color && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Fluid Color:</Text>
                      <Text style={styles.detailValue}>
                        {FLUID_COLORS.find(f => f.value === showDetailModal.fluid_color)?.label}
                      </Text>
                    </View>
                  )}
                  {showDetailModal.fluid_amount && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Fluid Amount:</Text>
                      <Text style={styles.detailValue}>
                        {FLUID_AMOUNTS.find(f => f.value === showDetailModal.fluid_amount)?.label}
                      </Text>
                    </View>
                  )}
                </Card>
              )}

              {/* Maternal Vitals Card */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Maternal Vitals</Text>
                {showDetailModal.maternal_bp && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Blood Pressure:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.maternal_bp}</Text>
                  </View>
                )}
                {showDetailModal.maternal_pulse && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Pulse:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.maternal_pulse} bpm</Text>
                  </View>
                )}
                {showDetailModal.maternal_temp && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Temperature:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.maternal_temp}</Text>
                  </View>
                )}
                {showDetailModal.maternal_respirations && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Respirations:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.maternal_respirations}</Text>
                  </View>
                )}
                {showDetailModal.maternal_position && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Position:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.maternal_position}</Text>
                  </View>
                )}
                {showDetailModal.pain_coping_level && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Pain/Coping Level:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.pain_coping_level}/10</Text>
                  </View>
                )}
                {showDetailModal.coping_methods && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Coping Methods:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.coping_methods}</Text>
                  </View>
                )}
                {showDetailModal.emotional_status && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Emotional:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.emotional_status}</Text>
                  </View>
                )}
                {!showDetailModal.maternal_bp && !showDetailModal.maternal_pulse && 
                 !showDetailModal.maternal_temp && !showDetailModal.pain_coping_level && (
                  <Text style={styles.noDataText}>No maternal vitals recorded</Text>
                )}
              </Card>

              {/* Fetal Wellbeing Card */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Fetal Wellbeing</Text>
                {showDetailModal.fetal_heart_rate && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Heart Rate:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.fetal_heart_rate} bpm</Text>
                  </View>
                )}
                {showDetailModal.fhr_baseline && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Baseline:</Text>
                    <Text style={styles.detailValue}>
                      {FHR_BASELINES.find(f => f.value === showDetailModal.fhr_baseline)?.label}
                    </Text>
                  </View>
                )}
                {showDetailModal.fhr_variability && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Variability:</Text>
                    <Text style={styles.detailValue}>
                      {FHR_VARIABILITY.find(f => f.value === showDetailModal.fhr_variability)?.label}
                    </Text>
                  </View>
                )}
                {showDetailModal.decelerations && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Decelerations:</Text>
                    <Text style={styles.detailValue}>
                      {DECELERATIONS.find(d => d.value === showDetailModal.decelerations)?.label}
                    </Text>
                  </View>
                )}
                {showDetailModal.fetal_concerns && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Concerns:</Text>
                    <Text style={styles.detailValue}>{showDetailModal.fetal_concerns}</Text>
                  </View>
                )}
                {!showDetailModal.fetal_heart_rate && !showDetailModal.fhr_baseline && 
                 !showDetailModal.fhr_variability && !showDetailModal.decelerations && (
                  <Text style={styles.noDataText}>No fetal data recorded</Text>
                )}
              </Card>

              {/* Notes Card */}
              {(showDetailModal.interventions || showDetailModal.medications_given || 
                showDetailModal.communication_notes || showDetailModal.general_notes) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Notes & Interventions</Text>
                  {showDetailModal.interventions && (
                    <View style={styles.noteRow}>
                      <Text style={styles.noteLabel}>Interventions:</Text>
                      <Text style={styles.noteText}>{showDetailModal.interventions}</Text>
                    </View>
                  )}
                  {showDetailModal.medications_given && (
                    <View style={styles.noteRow}>
                      <Text style={styles.noteLabel}>Medications:</Text>
                      <Text style={styles.noteText}>{showDetailModal.medications_given}</Text>
                    </View>
                  )}
                  {showDetailModal.communication_notes && (
                    <View style={styles.noteRow}>
                      <Text style={styles.noteLabel}>Communication:</Text>
                      <Text style={styles.noteText}>{showDetailModal.communication_notes}</Text>
                    </View>
                  )}
                  {showDetailModal.general_notes && (
                    <View style={styles.noteRow}>
                      <Text style={styles.noteLabel}>General:</Text>
                      <Text style={styles.noteText}>{showDetailModal.general_notes}</Text>
                    </View>
                  )}
                </Card>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(showDetailModal)}
              >
                <Icon name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>Delete Entry</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============== STYLES ==============
const getStyles = createThemedStyles((colors) => ({
  section: {
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  recordCount: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textLight,
    marginLeft: SIZES.xs,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
    paddingHorizontal: SIZES.lg,
  },
  recordCard: {
    marginBottom: SIZES.sm,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  timeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    marginBottom: SIZES.sm,
  },
  stageText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  vitalsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vitalLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.textLight,
    marginRight: 4,
  },
  vitalValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  modalFooter: {
    padding: SIZES.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Form styles
  formSection: {
    marginBottom: SIZES.lg,
  },
  formSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginBottom: SIZES.sm,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    backgroundColor: colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  optionButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  optionButtonTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyMedium,
  },
  painScaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  painScaleButton: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  painScaleButtonSelected: {
    borderColor: 'transparent',
  },
  painScaleText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
  },
  painScaleTextSelected: {
    color: colors.white,
  },
  // Detail modal styles
  detailDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  detailDate: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    marginLeft: SIZES.sm,
  },
  stageBadgeDetail: {
    alignSelf: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    marginBottom: SIZES.md,
  },
  stageBadgeDetailText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
  },
  detailCard: {
    marginBottom: SIZES.md,
  },
  detailCardTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginBottom: SIZES.sm,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
  },
  detailLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
  },
  noteRow: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  noteLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  noteText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  noDataText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SIZES.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    marginTop: SIZES.lg,
  },
  deleteButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.error,
    marginLeft: SIZES.xs,
  },
}));
