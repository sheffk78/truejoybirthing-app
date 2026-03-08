// Labor Records Section Component for Midwife Client Detail
// Tracks labor progress with timestamped entries

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
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
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';

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
}

interface LaborSectionProps {
  clientId: string;
  primaryColor: string;
  onRecordsChange?: () => void;
}

// ============== CONSTANTS ==============
const LABOR_STAGES = [
  { value: 'early', label: 'Early Labor' },
  { value: 'active', label: 'Active Labor' },
  { value: 'transition', label: 'Transition' },
  { value: 'pushing', label: 'Pushing' },
  { value: 'delivery', label: 'Delivery' },
];

const CONTRACTION_STRENGTHS = ['mild', 'moderate', 'strong'];
const MEMBRANE_STATUSES = ['intact', 'ruptured', 'artificial_rupture'];
const FLUID_COLORS = ['clear', 'bloody', 'light_meconium', 'thick_meconium'];
const STATIONS = ['-3', '-2', '-1', '0', '+1', '+2', '+3'];
const FHR_BASELINES = ['normal', 'tachycardic', 'bradycardic'];
const FHR_VARIABILITIES = ['absent', 'minimal', 'moderate', 'marked'];
const DECELERATIONS = ['none', 'early', 'late', 'variable', 'prolonged'];

// ============== MAIN COMPONENT ==============
export default function LaborSection({ clientId, primaryColor, onRecordsChange }: LaborSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  const [records, setRecords] = useState<LaborRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<LaborRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<LaborRecord | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [laborStage, setLaborStage] = useState('');
  const [stageNotes, setStageNotes] = useState('');
  const [dilationCm, setDilationCm] = useState('');
  const [effacementPercent, setEffacementPercent] = useState('');
  const [station, setStation] = useState('');
  const [contractionsPerMin, setContractionsPerMin] = useState('');
  const [contractionDuration, setContractionDuration] = useState('');
  const [contractionStrength, setContractionStrength] = useState('');
  const [membranesStatus, setMembranesStatus] = useState('');
  const [fluidColor, setFluidColor] = useState('');
  const [maternalBp, setMaternalBp] = useState('');
  const [maternalPulse, setMaternalPulse] = useState('');
  const [maternalTemp, setMaternalTemp] = useState('');
  const [maternalPosition, setMaternalPosition] = useState('');
  const [painCopingLevel, setPainCopingLevel] = useState('');
  const [copingMethods, setCopingMethods] = useState('');
  const [emotionalStatus, setEmotionalStatus] = useState('');
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fhrBaseline, setFhrBaseline] = useState('');
  const [fhrVariability, setFhrVariability] = useState('');
  const [decelerations, setDecelerations] = useState('');
  const [fetalConcerns, setFetalConcerns] = useState('');
  const [interventions, setInterventions] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // ============== DATA FETCHING ==============
  const fetchRecords = useCallback(async () => {
    try {
      const data = await apiRequest(`/midwife/clients/${clientId}/labor-records`);
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching labor records:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
        hour12: true
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
    setFluidColor('');
    setMaternalBp('');
    setMaternalPulse('');
    setMaternalTemp('');
    setMaternalPosition('');
    setPainCopingLevel('');
    setCopingMethods('');
    setEmotionalStatus('');
    setFetalHeartRate('');
    setFhrBaseline('');
    setFhrVariability('');
    setDecelerations('');
    setFetalConcerns('');
    setInterventions('');
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
    setFluidColor(record.fluid_color || '');
    setMaternalBp(record.maternal_bp || '');
    setMaternalPulse(record.maternal_pulse?.toString() || '');
    setMaternalTemp(record.maternal_temp?.toString() || '');
    setMaternalPosition(record.maternal_position || '');
    setPainCopingLevel(record.pain_coping_level?.toString() || '');
    setCopingMethods(record.coping_methods || '');
    setEmotionalStatus(record.emotional_status || '');
    setFetalHeartRate(record.fetal_heart_rate?.toString() || '');
    setFhrBaseline(record.fhr_baseline || '');
    setFhrVariability(record.fhr_variability || '');
    setDecelerations(record.decelerations || '');
    setFetalConcerns(record.fetal_concerns || '');
    setInterventions(record.interventions || '');
    setGeneralNotes(record.general_notes || '');
    setShowDetailModal(null);
    setShowModal(true);
  };

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
        fluid_color: fluidColor || undefined,
        maternal_bp: maternalBp || undefined,
        maternal_pulse: maternalPulse ? parseInt(maternalPulse) : undefined,
        maternal_temp: maternalTemp ? parseFloat(maternalTemp) : undefined,
        maternal_position: maternalPosition || undefined,
        pain_coping_level: painCopingLevel ? parseInt(painCopingLevel) : undefined,
        coping_methods: copingMethods || undefined,
        emotional_status: emotionalStatus || undefined,
        fetal_heart_rate: fetalHeartRate ? parseInt(fetalHeartRate) : undefined,
        fhr_baseline: fhrBaseline || undefined,
        fhr_variability: fhrVariability || undefined,
        decelerations: decelerations || undefined,
        fetal_concerns: fetalConcerns || undefined,
        interventions: interventions || undefined,
        general_notes: generalNotes || undefined,
      };

      if (editingRecord) {
        await apiRequest(`/midwife/clients/${clientId}/labor-records/${editingRecord.labor_record_id}`, {
          method: 'PUT',
          body: data,
        });
        Alert.alert('Success', 'Labor update saved');
      } else {
        await apiRequest(`/midwife/clients/${clientId}/labor-records`, {
          method: 'POST',
          body: data,
        });
        Alert.alert('Success', 'Labor update recorded');
      }

      setShowModal(false);
      resetForm();
      fetchRecords();
      onRecordsChange?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save labor update');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (record: LaborRecord) => {
    Alert.alert(
      'Delete Entry',
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
              fetchRecords();
              onRecordsChange?.();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  // ============== RENDER HELPERS ==============
  const renderOptionSelector = (
    label: string,
    options: string[] | { value: string; label: string }[],
    value: string,
    onChange: (val: string) => void,
    columns: number = 3
  ) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.optionsRow, { flexWrap: 'wrap' }]}>
        {options.map((opt) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt.replace(/_/g, ' ') : opt.label;
          return (
            <TouchableOpacity
              key={optValue}
              style={[
                styles.optionButton,
                { width: `${100 / columns - 2}%` },
                value === optValue && [styles.optionButtonSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
              ]}
              onPress={() => onChange(value === optValue ? '' : optValue)}
            >
              <Text style={[styles.optionButtonText, value === optValue && styles.optionButtonTextSelected]}>
                {optLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ============== LOADING ==============
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={primaryColor} />
      </View>
    );
  }

  // ============== RENDER ==============
  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="pulse-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Labor Progress</Text>
          <Text style={styles.recordCount}>({records.length})</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={openAddModal}
          data-testid="add-labor-btn"
        >
          <Icon name="add" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Records List */}
      {records.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="pulse-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No labor entries yet</Text>
          <Text style={styles.emptyText}>
            Tap the + button to record the first labor update.
          </Text>
        </Card>
      ) : (
        records.map((record) => (
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
                {record.labor_stage && (
                  <View style={[styles.stageBadge, { backgroundColor: primaryColor }]}>
                    <Text style={styles.stageBadgeText}>
                      {record.labor_stage.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.recordSummary}>{record.summary}</Text>
              
              {/* Quick stats row */}
              <View style={styles.quickStats}>
                {record.dilation_cm !== undefined && (
                  <View style={styles.statChip}>
                    <Text style={styles.statLabel}>Dilation</Text>
                    <Text style={styles.statValue}>{record.dilation_cm}cm</Text>
                  </View>
                )}
                {record.fetal_heart_rate && (
                  <View style={styles.statChip}>
                    <Text style={styles.statLabel}>FHR</Text>
                    <Text style={styles.statValue}>{record.fetal_heart_rate}</Text>
                  </View>
                )}
                {record.contractions_per_10min && (
                  <View style={styles.statChip}>
                    <Text style={styles.statLabel}>Ctx/10min</Text>
                    <Text style={styles.statValue}>{record.contractions_per_10min}</Text>
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
              {editingRecord ? 'Edit Labor Update' : 'New Labor Update'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Labor Stage */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Labor Stage</Text>
              {renderOptionSelector('Current Stage', LABOR_STAGES, laborStage, setLaborStage, 2)}
              <TextInput
                style={[styles.input, styles.textArea]}
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
              <Text style={styles.formSectionTitle}>Labor Progress</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Dilation (cm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-10"
                    placeholderTextColor={colors.textLight}
                    value={dilationCm}
                    onChangeText={setDilationCm}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Effacement (%)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-100"
                    placeholderTextColor={colors.textLight}
                    value={effacementPercent}
                    onChangeText={setEffacementPercent}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {renderOptionSelector('Station', STATIONS, station, setStation, 4)}
            </View>

            {/* Contractions */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Contractions</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Per 10 min</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Count"
                    placeholderTextColor={colors.textLight}
                    value={contractionsPerMin}
                    onChangeText={setContractionsPerMin}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Duration (sec)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Seconds"
                    placeholderTextColor={colors.textLight}
                    value={contractionDuration}
                    onChangeText={setContractionDuration}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {renderOptionSelector('Strength', CONTRACTION_STRENGTHS, contractionStrength, setContractionStrength, 3)}
            </View>

            {/* Membranes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Membranes</Text>
              {renderOptionSelector('Status', MEMBRANE_STATUSES, membranesStatus, setMembranesStatus, 3)}
              {membranesStatus === 'ruptured' || membranesStatus === 'artificial_rupture' ? (
                renderOptionSelector('Fluid Color', FLUID_COLORS, fluidColor, setFluidColor, 2)
              ) : null}
            </View>

            {/* Maternal Wellbeing */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Maternal Wellbeing</Text>
              
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Blood Pressure</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 120/80"
                    placeholderTextColor={colors.textLight}
                    value={maternalBp}
                    onChangeText={setMaternalBp}
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Pulse (bpm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Heart rate"
                    placeholderTextColor={colors.textLight}
                    value={maternalPulse}
                    onChangeText={setMaternalPulse}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Temp (°F)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Temperature"
                    placeholderTextColor={colors.textLight}
                    value={maternalTemp}
                    onChangeText={setMaternalTemp}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>Pain/Coping (1-10)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="1-10"
                    placeholderTextColor={colors.textLight}
                    value={painCopingLevel}
                    onChangeText={setPainCopingLevel}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Position & Mobility</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., left lateral, walking, hands and knees"
                placeholderTextColor={colors.textLight}
                value={maternalPosition}
                onChangeText={setMaternalPosition}
              />

              <Text style={styles.fieldLabel}>Coping Methods</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., breathing, water, partner support"
                placeholderTextColor={colors.textLight}
                value={copingMethods}
                onChangeText={setCopingMethods}
              />

              <Text style={styles.fieldLabel}>Emotional Status</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="How is the birthing person coping emotionally?"
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
              
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>FHR (bpm)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Heart rate"
                    placeholderTextColor={colors.textLight}
                    value={fetalHeartRate}
                    onChangeText={setFetalHeartRate}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.inputHalf}>
                  {renderOptionSelector('Baseline', FHR_BASELINES, fhrBaseline, setFhrBaseline, 1)}
                </View>
              </View>

              {renderOptionSelector('Variability', FHR_VARIABILITIES, fhrVariability, setFhrVariability, 4)}
              {renderOptionSelector('Decelerations', DECELERATIONS, decelerations, setDecelerations, 3)}

              <Text style={styles.fieldLabel}>Concerns</Text>
              <TextInput
                style={styles.input}
                placeholder="Any fetal concerns?"
                placeholderTextColor={colors.textLight}
                value={fetalConcerns}
                onChangeText={setFetalConcerns}
              />
            </View>

            {/* Interventions */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Interventions & Notes</Text>
              
              <Text style={styles.fieldLabel}>Interventions / Care</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Position changes, fluids, comfort measures, medications..."
                placeholderTextColor={colors.textLight}
                value={interventions}
                onChangeText={setInterventions}
                multiline
                numberOfLines={3}
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
              <View style={styles.detailHeader}>
                <Icon name="time" size={20} color={primaryColor} />
                <Text style={[styles.detailTime, { color: primaryColor }]}>
                  {formatDateTime(showDetailModal.entry_datetime)}
                </Text>
                {showDetailModal.labor_stage && (
                  <View style={[styles.stageBadge, { backgroundColor: primaryColor }]}>
                    <Text style={styles.stageBadgeText}>
                      {showDetailModal.labor_stage.replace(/_/g, ' ')}
                    </Text>
                  </View>
                )}
              </View>

              {/* Progress Card */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Labor Progress</Text>
                <View style={styles.detailGrid}>
                  {showDetailModal.dilation_cm !== undefined && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Dilation</Text>
                      <Text style={styles.detailValue}>{showDetailModal.dilation_cm}cm</Text>
                    </View>
                  )}
                  {showDetailModal.effacement_percent !== undefined && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Effacement</Text>
                      <Text style={styles.detailValue}>{showDetailModal.effacement_percent}%</Text>
                    </View>
                  )}
                  {showDetailModal.station && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Station</Text>
                      <Text style={styles.detailValue}>{showDetailModal.station}</Text>
                    </View>
                  )}
                </View>
              </Card>

              {/* Contractions Card */}
              {(showDetailModal.contractions_per_10min || showDetailModal.contraction_strength) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Contractions</Text>
                  <View style={styles.detailGrid}>
                    {showDetailModal.contractions_per_10min && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Per 10 min</Text>
                        <Text style={styles.detailValue}>{showDetailModal.contractions_per_10min}</Text>
                      </View>
                    )}
                    {showDetailModal.contraction_duration_sec && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Duration</Text>
                        <Text style={styles.detailValue}>{showDetailModal.contraction_duration_sec}s</Text>
                      </View>
                    )}
                    {showDetailModal.contraction_strength && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Strength</Text>
                        <Text style={styles.detailValue}>{showDetailModal.contraction_strength}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              )}

              {/* Maternal Card */}
              {(showDetailModal.maternal_bp || showDetailModal.maternal_pulse || showDetailModal.emotional_status) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Maternal Wellbeing</Text>
                  <View style={styles.detailGrid}>
                    {showDetailModal.maternal_bp && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>BP</Text>
                        <Text style={styles.detailValue}>{showDetailModal.maternal_bp}</Text>
                      </View>
                    )}
                    {showDetailModal.maternal_pulse && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Pulse</Text>
                        <Text style={styles.detailValue}>{showDetailModal.maternal_pulse}</Text>
                      </View>
                    )}
                    {showDetailModal.pain_coping_level && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Pain/Coping</Text>
                        <Text style={styles.detailValue}>{showDetailModal.pain_coping_level}/10</Text>
                      </View>
                    )}
                  </View>
                  {showDetailModal.emotional_status && (
                    <View style={styles.detailNoteRow}>
                      <Text style={styles.detailLabel}>Emotional:</Text>
                      <Text style={styles.detailNote}>{showDetailModal.emotional_status}</Text>
                    </View>
                  )}
                </Card>
              )}

              {/* Fetal Card */}
              {(showDetailModal.fetal_heart_rate || showDetailModal.fetal_concerns) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Fetal Wellbeing</Text>
                  <View style={styles.detailGrid}>
                    {showDetailModal.fetal_heart_rate && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>FHR</Text>
                        <Text style={styles.detailValue}>{showDetailModal.fetal_heart_rate} bpm</Text>
                      </View>
                    )}
                    {showDetailModal.fhr_variability && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Variability</Text>
                        <Text style={styles.detailValue}>{showDetailModal.fhr_variability}</Text>
                      </View>
                    )}
                    {showDetailModal.decelerations && (
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Decels</Text>
                        <Text style={styles.detailValue}>{showDetailModal.decelerations}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              )}

              {/* Notes Card */}
              {(showDetailModal.interventions || showDetailModal.general_notes) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Notes</Text>
                  {showDetailModal.interventions && (
                    <View style={styles.detailNoteRow}>
                      <Text style={styles.detailLabel}>Interventions:</Text>
                      <Text style={styles.detailNote}>{showDetailModal.interventions}</Text>
                    </View>
                  )}
                  {showDetailModal.general_notes && (
                    <View style={styles.detailNoteRow}>
                      <Text style={styles.detailLabel}>Notes:</Text>
                      <Text style={styles.detailNote}>{showDetailModal.general_notes}</Text>
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
  container: {
    marginTop: SIZES.md,
  },
  loadingContainer: {
    padding: SIZES.xl,
    alignItems: 'center',
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
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  stageBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.white,
    textTransform: 'capitalize',
  },
  recordSummary: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  quickStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.textLight,
    marginRight: 4,
  },
  statValue: {
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
  fieldGroup: {
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
    minHeight: 60,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  inputHalf: {
    flex: 1,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: SIZES.xs,
  },
  optionButton: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  optionButtonTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyMedium,
  },
  // Detail modal styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
    paddingVertical: SIZES.sm,
    gap: SIZES.sm,
  },
  detailTime: {
    fontSize: SIZES.fontLg,
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
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
  },
  detailItem: {
    minWidth: 80,
  },
  detailLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
  },
  detailNoteRow: {
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  detailNote: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    marginTop: SIZES.xs,
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
