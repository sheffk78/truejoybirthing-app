// BirthRecordSection.tsx - Comprehensive Birth Record for Midwives
// Single record per birth episode showing birth outcomes

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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest, getApiUrl } from '../../utils/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

// ============== TYPES ==============
interface BirthRecord {
  birth_record_id?: string;
  client_id: string;
  provider_id?: string;
  
  // Timeline
  full_dilation_datetime?: string;
  pushing_start_datetime?: string;
  birth_datetime?: string;
  
  // Birth Details
  mode_of_birth?: string;
  place_of_birth?: string;
  
  // Newborn Information
  baby_name?: string;
  baby_sex?: string;
  baby_weight_lbs?: number;
  baby_weight_oz?: number;
  baby_length_inches?: number;
  
  // Newborn Condition
  newborn_condition?: string;
  newborn_condition_notes?: string;
  apgar_1min?: number;
  apgar_5min?: number;
  
  // Maternal Outcomes
  estimated_blood_loss_ml?: number;
  repairs_performed?: string;
  repairs_notes?: string;
  
  // Immediate Postpartum
  maternal_status?: string;
  maternal_status_notes?: string;
  baby_status?: string;
  baby_status_notes?: string;
  
  // Transfer of Care
  transfer_occurred?: boolean;
  transfer_who?: string;
  transfer_destination?: string;
  transfer_reason?: string;
  
  // General
  birth_story_notes?: string;
  
  created_at?: string;
  updated_at?: string;
}

interface BirthRecordSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const MODE_OF_BIRTH_OPTIONS = [
  { value: 'spontaneous_vaginal', label: 'Spontaneous Vaginal' },
  { value: 'assisted_vaginal', label: 'Assisted Vaginal' },
  { value: 'cesarean', label: 'Cesarean' },
  { value: 'vbac', label: 'VBAC' },
];

const PLACE_OF_BIRTH_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'birth_center', label: 'Birth Center' },
  { value: 'hospital', label: 'Hospital' },
];

const BABY_SEX_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'intersex', label: 'Intersex' },
];

const NEWBORN_CONDITION_OPTIONS = [
  { value: 'vigorous', label: 'Vigorous at Birth' },
  { value: 'needed_assistance', label: 'Needed Some Assistance' },
  { value: 'required_resuscitation', label: 'Required Resuscitation' },
];

const REPAIRS_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'first_degree', label: '1st Degree Tear' },
  { value: 'second_degree', label: '2nd Degree Tear' },
  { value: 'third_degree', label: '3rd Degree Tear' },
  { value: 'fourth_degree', label: '4th Degree Tear' },
  { value: 'other', label: 'Other' },
];

const MATERNAL_STATUS_OPTIONS = [
  { value: 'stable', label: 'Stable' },
  { value: 'monitored', label: 'Monitored' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'complications', label: 'Complications' },
];

const BABY_STATUS_OPTIONS = [
  { value: 'skin_to_skin', label: 'Skin-to-Skin' },
  { value: 'breastfeeding_initiated', label: 'Breastfeeding Initiated' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'nicu', label: 'NICU' },
];

const TRANSFER_WHO_OPTIONS = [
  { value: 'mother', label: 'Mother' },
  { value: 'baby', label: 'Baby' },
  { value: 'both', label: 'Both' },
];

// ============== MAIN COMPONENT ==============
export default function BirthRecordSection({ clientId, primaryColor, onRefresh }: BirthRecordSectionProps) {
  // State
  const [birthRecord, setBirthRecord] = useState<BirthRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [fullDilationDatetime, setFullDilationDatetime] = useState('');
  const [pushingStartDatetime, setPushingStartDatetime] = useState('');
  const [birthDatetime, setBirthDatetime] = useState('');
  const [modeOfBirth, setModeOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [babyName, setBabyName] = useState('');
  const [babySex, setBabySex] = useState('');
  const [babyWeightLbs, setBabyWeightLbs] = useState('');
  const [babyWeightOz, setBabyWeightOz] = useState('');
  const [babyLengthInches, setBabyLengthInches] = useState('');
  const [newbornCondition, setNewbornCondition] = useState('');
  const [newbornConditionNotes, setNewbornConditionNotes] = useState('');
  const [apgar1min, setApgar1min] = useState('');
  const [apgar5min, setApgar5min] = useState('');
  const [estimatedBloodLoss, setEstimatedBloodLoss] = useState('');
  const [repairsPerformed, setRepairsPerformed] = useState('');
  const [repairsNotes, setRepairsNotes] = useState('');
  const [maternalStatus, setMaternalStatus] = useState('');
  const [maternalStatusNotes, setMaternalStatusNotes] = useState('');
  const [babyStatus, setBabyStatus] = useState('');
  const [babyStatusNotes, setBabyStatusNotes] = useState('');
  const [transferOccurred, setTransferOccurred] = useState(false);
  const [transferWho, setTransferWho] = useState('');
  const [transferDestination, setTransferDestination] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [birthStoryNotes, setBirthStoryNotes] = useState('');

  // ============== DATA FETCHING ==============
  const fetchBirthRecord = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const record = await apiRequest(`/provider/clients/${clientId}/birth-record`);
      if (record && record.birth_record_id) {
        setBirthRecord(record);
      } else {
        setBirthRecord(null);
      }
    } catch (error: any) {
      console.error('Error fetching birth record:', error);
      setBirthRecord(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchBirthRecord();
  }, [fetchBirthRecord]);

  // ============== HELPERS ==============
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getLabel = (options: { value: string; label: string }[], value?: string) => {
    return options.find(o => o.value === value)?.label || value || '';
  };

  const resetForm = () => {
    setFullDilationDatetime('');
    setPushingStartDatetime('');
    setBirthDatetime('');
    setModeOfBirth('');
    setPlaceOfBirth('');
    setBabyName('');
    setBabySex('');
    setBabyWeightLbs('');
    setBabyWeightOz('');
    setBabyLengthInches('');
    setNewbornCondition('');
    setNewbornConditionNotes('');
    setApgar1min('');
    setApgar5min('');
    setEstimatedBloodLoss('');
    setRepairsPerformed('');
    setRepairsNotes('');
    setMaternalStatus('');
    setMaternalStatusNotes('');
    setBabyStatus('');
    setBabyStatusNotes('');
    setTransferOccurred(false);
    setTransferWho('');
    setTransferDestination('');
    setTransferReason('');
    setBirthStoryNotes('');
  };

  const populateForm = (record: BirthRecord) => {
    setFullDilationDatetime(record.full_dilation_datetime || '');
    setPushingStartDatetime(record.pushing_start_datetime || '');
    setBirthDatetime(record.birth_datetime || '');
    setModeOfBirth(record.mode_of_birth || '');
    setPlaceOfBirth(record.place_of_birth || '');
    setBabyName(record.baby_name || '');
    setBabySex(record.baby_sex || '');
    setBabyWeightLbs(record.baby_weight_lbs?.toString() || '');
    setBabyWeightOz(record.baby_weight_oz?.toString() || '');
    setBabyLengthInches(record.baby_length_inches?.toString() || '');
    setNewbornCondition(record.newborn_condition || '');
    setNewbornConditionNotes(record.newborn_condition_notes || '');
    setApgar1min(record.apgar_1min?.toString() || '');
    setApgar5min(record.apgar_5min?.toString() || '');
    setEstimatedBloodLoss(record.estimated_blood_loss_ml?.toString() || '');
    setRepairsPerformed(record.repairs_performed || '');
    setRepairsNotes(record.repairs_notes || '');
    setMaternalStatus(record.maternal_status || '');
    setMaternalStatusNotes(record.maternal_status_notes || '');
    setBabyStatus(record.baby_status || '');
    setBabyStatusNotes(record.baby_status_notes || '');
    setTransferOccurred(record.transfer_occurred || false);
    setTransferWho(record.transfer_who || '');
    setTransferDestination(record.transfer_destination || '');
    setTransferReason(record.transfer_reason || '');
    setBirthStoryNotes(record.birth_story_notes || '');
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = () => {
    if (birthRecord) {
      populateForm(birthRecord);
    }
    setShowModal(true);
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    setSaving(true);
    try {
      const data: any = {
        full_dilation_datetime: fullDilationDatetime || undefined,
        pushing_start_datetime: pushingStartDatetime || undefined,
        birth_datetime: birthDatetime || undefined,
        mode_of_birth: modeOfBirth || undefined,
        place_of_birth: placeOfBirth || undefined,
        baby_name: babyName || undefined,
        baby_sex: babySex || undefined,
        baby_weight_lbs: babyWeightLbs ? parseFloat(babyWeightLbs) : undefined,
        baby_weight_oz: babyWeightOz ? parseFloat(babyWeightOz) : undefined,
        baby_length_inches: babyLengthInches ? parseFloat(babyLengthInches) : undefined,
        newborn_condition: newbornCondition || undefined,
        newborn_condition_notes: newbornConditionNotes || undefined,
        apgar_1min: apgar1min ? parseInt(apgar1min) : undefined,
        apgar_5min: apgar5min ? parseInt(apgar5min) : undefined,
        estimated_blood_loss_ml: estimatedBloodLoss ? parseInt(estimatedBloodLoss) : undefined,
        repairs_performed: repairsPerformed || undefined,
        repairs_notes: repairsNotes || undefined,
        maternal_status: maternalStatus || undefined,
        maternal_status_notes: maternalStatusNotes || undefined,
        baby_status: babyStatus || undefined,
        baby_status_notes: babyStatusNotes || undefined,
        transfer_occurred: transferOccurred || undefined,
        transfer_who: transferOccurred ? transferWho : undefined,
        transfer_destination: transferOccurred ? transferDestination : undefined,
        transfer_reason: transferOccurred ? transferReason : undefined,
        birth_story_notes: birthStoryNotes || undefined,
      };

      await apiRequest(`/provider/clients/${clientId}/birth-record`, {
        method: 'POST',
        body: data,
      });

      Alert.alert('Success', birthRecord ? 'Birth record updated' : 'Birth record created');
      setShowModal(false);
      fetchBirthRecord();
      onRefresh?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save birth record');
    } finally {
      setSaving(false);
    }
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

  const renderInfoRow = (label: string, value?: string | number, suffix?: string) => {
    if (!value) return null;
    return (
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>{label}:</Text>
        <Text style={styles.infoValue}>{value}{suffix || ''}</Text>
      </View>
    );
  };

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="heart-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Birth Record</Text>
        </View>
        {birthRecord && (
          <TouchableOpacity
            style={[styles.editButton, { borderColor: primaryColor }]}
            onPress={openEditModal}
            data-testid="edit-birth-record-btn"
          >
            <Icon name="create-outline" size={18} color={primaryColor} />
            <Text style={[styles.editButtonText, { color: primaryColor }]}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : !birthRecord ? (
        // Empty state - No birth record yet
        <Card style={styles.emptyCard}>
          <Icon name="heart-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No Birth Record Yet</Text>
          <Text style={styles.emptyText}>
            Create a birth record to document the birth outcomes for this client.
          </Text>
          <Button
            title="Create Birth Record"
            onPress={openCreateModal}
            style={{ marginTop: SIZES.md }}
            data-testid="create-birth-record-btn"
          />
        </Card>
      ) : (
        // Display birth record summary
        <View style={styles.recordContainer}>
          {/* Birth Timeline */}
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Birth Timeline</Text>
            {birthRecord.birth_datetime && (
              <View style={[styles.highlightRow, { backgroundColor: primaryColor + '15' }]}>
                <Icon name="time" size={20} color={primaryColor} />
                <Text style={[styles.highlightText, { color: primaryColor }]}>
                  Born: {formatDateTime(birthRecord.birth_datetime)}
                </Text>
              </View>
            )}
            {renderInfoRow('Full Dilation', formatDateTime(birthRecord.full_dilation_datetime))}
            {renderInfoRow('Pushing Started', formatDateTime(birthRecord.pushing_start_datetime))}
            {renderInfoRow('Mode of Birth', getLabel(MODE_OF_BIRTH_OPTIONS, birthRecord.mode_of_birth))}
            {renderInfoRow('Place of Birth', getLabel(PLACE_OF_BIRTH_OPTIONS, birthRecord.place_of_birth))}
          </Card>

          {/* Newborn Information */}
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Newborn</Text>
            {birthRecord.baby_name && (
              <View style={[styles.highlightRow, { backgroundColor: COLORS.success + '15' }]}>
                <Icon name="person" size={18} color={COLORS.success} />
                <Text style={[styles.highlightText, { color: COLORS.success }]}>
                  {birthRecord.baby_name}
                </Text>
              </View>
            )}
            {renderInfoRow('Sex', getLabel(BABY_SEX_OPTIONS, birthRecord.baby_sex))}
            {(birthRecord.baby_weight_lbs || birthRecord.baby_weight_oz) && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Weight:</Text>
                <Text style={styles.infoValue}>
                  {birthRecord.baby_weight_lbs || 0} lbs {birthRecord.baby_weight_oz || 0} oz
                </Text>
              </View>
            )}
            {renderInfoRow('Length', birthRecord.baby_length_inches, ' inches')}
            {renderInfoRow('Condition', getLabel(NEWBORN_CONDITION_OPTIONS, birthRecord.newborn_condition))}
            {birthRecord.newborn_condition_notes && (
              <Text style={styles.noteText}>{birthRecord.newborn_condition_notes}</Text>
            )}
            {(birthRecord.apgar_1min || birthRecord.apgar_5min) && (
              <View style={styles.apgarRow}>
                {birthRecord.apgar_1min !== undefined && (
                  <View style={styles.apgarChip}>
                    <Text style={styles.apgarLabel}>APGAR 1min</Text>
                    <Text style={styles.apgarValue}>{birthRecord.apgar_1min}</Text>
                  </View>
                )}
                {birthRecord.apgar_5min !== undefined && (
                  <View style={styles.apgarChip}>
                    <Text style={styles.apgarLabel}>APGAR 5min</Text>
                    <Text style={styles.apgarValue}>{birthRecord.apgar_5min}</Text>
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* Maternal Outcomes */}
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Maternal Outcomes</Text>
            {renderInfoRow('Estimated Blood Loss', birthRecord.estimated_blood_loss_ml, ' ml')}
            {renderInfoRow('Repairs', getLabel(REPAIRS_OPTIONS, birthRecord.repairs_performed))}
            {birthRecord.repairs_notes && (
              <Text style={styles.noteText}>{birthRecord.repairs_notes}</Text>
            )}
          </Card>

          {/* Immediate Postpartum */}
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Immediate Postpartum</Text>
            {birthRecord.maternal_status && (
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: birthRecord.maternal_status === 'stable' ? COLORS.success + '20' : COLORS.warning + '20' }
                ]}>
                  <Text style={[
                    styles.statusBadgeText,
                    { color: birthRecord.maternal_status === 'stable' ? COLORS.success : COLORS.warning }
                  ]}>
                    Mom: {getLabel(MATERNAL_STATUS_OPTIONS, birthRecord.maternal_status)}
                  </Text>
                </View>
              </View>
            )}
            {birthRecord.maternal_status_notes && (
              <Text style={styles.noteText}>{birthRecord.maternal_status_notes}</Text>
            )}
            {birthRecord.baby_status && (
              <View style={[styles.statusRow, { marginTop: SIZES.sm }]}>
                <View style={[styles.statusBadge, { backgroundColor: COLORS.primary + '20' }]}>
                  <Text style={[styles.statusBadgeText, { color: COLORS.primary }]}>
                    Baby: {getLabel(BABY_STATUS_OPTIONS, birthRecord.baby_status)}
                  </Text>
                </View>
              </View>
            )}
            {birthRecord.baby_status_notes && (
              <Text style={styles.noteText}>{birthRecord.baby_status_notes}</Text>
            )}
          </Card>

          {/* Transfer of Care */}
          {birthRecord.transfer_occurred && (
            <Card style={[styles.summaryCard, { borderColor: COLORS.warning, borderWidth: 1 }]}>
              <View style={styles.transferHeader}>
                <Icon name="ambulance-outline" size={20} color={COLORS.warning} />
                <Text style={[styles.cardTitle, { color: COLORS.warning, marginLeft: SIZES.xs }]}>
                  Transfer of Care
                </Text>
              </View>
              {renderInfoRow('Who', getLabel(TRANSFER_WHO_OPTIONS, birthRecord.transfer_who))}
              {renderInfoRow('Destination', birthRecord.transfer_destination)}
              {birthRecord.transfer_reason && (
                <View style={styles.transferReason}>
                  <Text style={styles.infoLabel}>Reason:</Text>
                  <Text style={styles.noteText}>{birthRecord.transfer_reason}</Text>
                </View>
              )}
            </Card>
          )}

          {/* Birth Story Notes */}
          {birthRecord.birth_story_notes && (
            <Card style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Birth Story Notes</Text>
              <Text style={styles.storyText}>{birthRecord.birth_story_notes}</Text>
            </Card>
          )}
        </View>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {birthRecord ? 'Edit Birth Record' : 'Create Birth Record'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Birth Timeline */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Birth Timeline</Text>
              
              <Text style={styles.fieldLabel}>Full Dilation Date/Time</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2024-03-15 08:30"
                placeholderTextColor={COLORS.textLight}
                value={fullDilationDatetime}
                onChangeText={setFullDilationDatetime}
              />

              <Text style={styles.fieldLabel}>Pushing Started Date/Time</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2024-03-15 10:00"
                placeholderTextColor={COLORS.textLight}
                value={pushingStartDatetime}
                onChangeText={setPushingStartDatetime}
              />

              <Text style={styles.fieldLabel}>Birth Date/Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 2024-03-15 11:23"
                placeholderTextColor={COLORS.textLight}
                value={birthDatetime}
                onChangeText={setBirthDatetime}
              />
            </View>

            {/* Mode & Place of Birth */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Birth Details</Text>
              
              <Text style={styles.fieldLabel}>Mode of Birth</Text>
              {renderOptionButtons(MODE_OF_BIRTH_OPTIONS, modeOfBirth, setModeOfBirth)}

              <Text style={styles.fieldLabel}>Place of Birth</Text>
              {renderOptionButtons(PLACE_OF_BIRTH_OPTIONS, placeOfBirth, setPlaceOfBirth)}
            </View>

            {/* Newborn Information */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Newborn Information</Text>
              
              <Text style={styles.fieldLabel}>Baby's Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter baby's name"
                placeholderTextColor={COLORS.textLight}
                value={babyName}
                onChangeText={setBabyName}
              />

              <Text style={styles.fieldLabel}>Sex</Text>
              {renderOptionButtons(BABY_SEX_OPTIONS, babySex, setBabySex)}

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.fieldLabel}>Weight (lbs)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 7"
                    placeholderTextColor={COLORS.textLight}
                    value={babyWeightLbs}
                    onChangeText={setBabyWeightLbs}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.fieldLabel}>Weight (oz)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 8"
                    placeholderTextColor={COLORS.textLight}
                    value={babyWeightOz}
                    onChangeText={setBabyWeightOz}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Length (inches)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 20.5"
                placeholderTextColor={COLORS.textLight}
                value={babyLengthInches}
                onChangeText={setBabyLengthInches}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Newborn Condition */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Newborn Condition</Text>
              
              <Text style={styles.fieldLabel}>Condition at Birth</Text>
              {renderOptionButtons(NEWBORN_CONDITION_OPTIONS, newbornCondition, setNewbornCondition)}

              <Text style={styles.fieldLabel}>Condition Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Additional notes about newborn condition..."
                placeholderTextColor={COLORS.textLight}
                value={newbornConditionNotes}
                onChangeText={setNewbornConditionNotes}
                multiline
                numberOfLines={2}
              />

              <View style={styles.rowInputs}>
                <View style={styles.halfInput}>
                  <Text style={styles.fieldLabel}>APGAR 1min (0-10)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-10"
                    placeholderTextColor={COLORS.textLight}
                    value={apgar1min}
                    onChangeText={setApgar1min}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.fieldLabel}>APGAR 5min (0-10)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0-10"
                    placeholderTextColor={COLORS.textLight}
                    value={apgar5min}
                    onChangeText={setApgar5min}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </View>

            {/* Maternal Outcomes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Maternal Outcomes</Text>
              
              <Text style={styles.fieldLabel}>Estimated Blood Loss (ml)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 300"
                placeholderTextColor={COLORS.textLight}
                value={estimatedBloodLoss}
                onChangeText={setEstimatedBloodLoss}
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Repairs Performed</Text>
              {renderOptionButtons(REPAIRS_OPTIONS, repairsPerformed, setRepairsPerformed)}

              {repairsPerformed && repairsPerformed !== 'none' && (
                <>
                  <Text style={styles.fieldLabel}>Repairs Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe repairs performed..."
                    placeholderTextColor={COLORS.textLight}
                    value={repairsNotes}
                    onChangeText={setRepairsNotes}
                    multiline
                    numberOfLines={2}
                  />
                </>
              )}
            </View>

            {/* Immediate Postpartum */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Immediate Postpartum</Text>
              
              <Text style={styles.fieldLabel}>Maternal Status</Text>
              {renderOptionButtons(MATERNAL_STATUS_OPTIONS, maternalStatus, setMaternalStatus)}

              <Text style={styles.fieldLabel}>Maternal Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes about mother's status..."
                placeholderTextColor={COLORS.textLight}
                value={maternalStatusNotes}
                onChangeText={setMaternalStatusNotes}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.fieldLabel}>Baby Status</Text>
              {renderOptionButtons(BABY_STATUS_OPTIONS, babyStatus, setBabyStatus)}

              <Text style={styles.fieldLabel}>Baby Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes about baby's status..."
                placeholderTextColor={COLORS.textLight}
                value={babyStatusNotes}
                onChangeText={setBabyStatusNotes}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Transfer of Care */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Transfer of Care</Text>
              
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setTransferOccurred(!transferOccurred)}
              >
                <View style={[
                  styles.toggleBox,
                  transferOccurred && { backgroundColor: primaryColor, borderColor: primaryColor }
                ]}>
                  {transferOccurred && <Icon name="checkmark" size={16} color={COLORS.white} />}
                </View>
                <Text style={styles.toggleLabel}>Transfer occurred during birth or postpartum</Text>
              </TouchableOpacity>

              {transferOccurred && (
                <>
                  <Text style={styles.fieldLabel}>Who was transferred?</Text>
                  {renderOptionButtons(TRANSFER_WHO_OPTIONS, transferWho, setTransferWho)}

                  <Text style={styles.fieldLabel}>Destination</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., City Hospital"
                    placeholderTextColor={COLORS.textLight}
                    value={transferDestination}
                    onChangeText={setTransferDestination}
                  />

                  <Text style={styles.fieldLabel}>Reason for Transfer</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Explain the reason for transfer..."
                    placeholderTextColor={COLORS.textLight}
                    value={transferReason}
                    onChangeText={setTransferReason}
                    multiline
                    numberOfLines={3}
                  />
                </>
              )}
            </View>

            {/* Birth Story Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Birth Story Notes</Text>
              
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                placeholder="Document the birth story, special moments, or any additional notes..."
                placeholderTextColor={COLORS.textLight}
                value={birthStoryNotes}
                onChangeText={setBirthStoryNotes}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={birthRecord ? 'Update Birth Record' : 'Save Birth Record'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============== STYLES ==============
const styles = StyleSheet.create({
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
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
    paddingHorizontal: SIZES.lg,
  },
  recordContainer: {
    gap: SIZES.sm,
  },
  summaryCard: {
    marginBottom: 0,
  },
  cardTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
  },
  highlightText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    marginLeft: SIZES.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
  },
  infoLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  noteText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SIZES.xs,
  },
  apgarRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginTop: SIZES.sm,
  },
  apgarChip: {
    flex: 1,
    alignItems: 'center',
    padding: SIZES.sm,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  apgarLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  apgarValue: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  statusBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  transferHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  transferReason: {
    marginTop: SIZES.xs,
  },
  storyText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  modalFooter: {
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // Form styles
  formSection: {
    marginBottom: SIZES.lg,
  },
  formSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  halfInput: {
    flex: 1,
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: SIZES.xs,
  },
  optionButtonSelected: {
    borderColor: COLORS.primary,
  },
  optionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  optionButtonTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  toggleBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
