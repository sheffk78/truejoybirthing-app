// PrenatalVisitSection.tsx - Prenatal Visit Tracking for Midwives
// Provides a list of prenatal visits with add/edit/detail modals

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
import { COLORS, SIZES, FONTS } from '../../constants/theme';

// ============== TYPES ==============
interface PrenatalVisit {
  prenatal_visit_id: string;
  client_id: string;
  visit_date: string;
  summary: string;
  urinalysis?: string;
  urinalysis_note?: string;
  blood_pressure?: string;
  fetal_heart_rate?: number;
  fundal_height?: number;
  weight?: number;
  weight_unit?: string;
  eating_score?: number;
  eating_note?: string;
  water_score?: number;
  water_note?: string;
  emotional_score?: number;
  emotional_note?: string;
  physical_score?: number;
  physical_note?: string;
  mental_score?: number;
  mental_note?: string;
  spiritual_score?: number;
  spiritual_note?: string;
  general_notes?: string;
  created_at: string;
}

interface PrenatalVisitSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const URINALYSIS_OPTIONS = ['Normal', 'Protein +', 'Protein ++', 'Glucose +', 'Glucose ++', 'Protein & Glucose +', 'Other'];

const WELLBEING_SCALE = [
  { value: 1, label: '1 - Struggling' },
  { value: 2, label: '2 - Challenging' },
  { value: 3, label: '3 - Okay' },
  { value: 4, label: '4 - Good' },
  { value: 5, label: '5 - Great' },
];

// ============== MAIN COMPONENT ==============
export default function PrenatalVisitSection({ clientId, primaryColor, onRefresh }: PrenatalVisitSectionProps) {
  // State
  const [prenatalVisits, setPrenatalVisits] = useState<PrenatalVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [editingVisit, setEditingVisit] = useState<PrenatalVisit | null>(null);
  const [showVisitDetail, setShowVisitDetail] = useState<PrenatalVisit | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [visitDate, setVisitDate] = useState('');
  const [urinalysis, setUrinalysis] = useState('');
  const [urinalysisNote, setUrinalysisNote] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [fundalHeight, setFundalHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lbs');
  const [eatingScore, setEatingScore] = useState<number | null>(null);
  const [eatingNote, setEatingNote] = useState('');
  const [waterScore, setWaterScore] = useState<number | null>(null);
  const [waterNote, setWaterNote] = useState('');
  const [emotionalScore, setEmotionalScore] = useState<number | null>(null);
  const [emotionalNote, setEmotionalNote] = useState('');
  const [physicalScore, setPhysicalScore] = useState<number | null>(null);
  const [physicalNote, setPhysicalNote] = useState('');
  const [mentalScore, setMentalScore] = useState<number | null>(null);
  const [mentalNote, setMentalNote] = useState('');
  const [spiritualScore, setSpiritualScore] = useState<number | null>(null);
  const [spiritualNote, setSpiritualNote] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  // ============== DATA FETCHING ==============
  const fetchPrenatalVisits = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const visitsData = await apiRequest(`/midwife/clients/${clientId}/prenatal-visits`);
      setPrenatalVisits(visitsData || []);
    } catch (error: any) {
      console.error('Error fetching prenatal visits:', error);
      setPrenatalVisits([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchPrenatalVisits();
  }, [fetchPrenatalVisits]);

  // ============== HELPERS ==============
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const resetVisitForm = () => {
    const today = new Date().toISOString().split('T')[0];
    setVisitDate(today);
    setUrinalysis('');
    setUrinalysisNote('');
    setBloodPressure('');
    setFetalHeartRate('');
    setFundalHeight('');
    setWeight('');
    setWeightUnit('lbs');
    setEatingScore(null);
    setEatingNote('');
    setWaterScore(null);
    setWaterNote('');
    setEmotionalScore(null);
    setEmotionalNote('');
    setPhysicalScore(null);
    setPhysicalNote('');
    setMentalScore(null);
    setMentalNote('');
    setSpiritualScore(null);
    setSpiritualNote('');
    setGeneralNotes('');
    setEditingVisit(null);
  };

  const openAddVisit = () => {
    resetVisitForm();
    setShowVisitModal(true);
  };

  const openEditVisit = (visit: PrenatalVisit) => {
    setEditingVisit(visit);
    setVisitDate(visit.visit_date);
    setUrinalysis(visit.urinalysis || '');
    setUrinalysisNote(visit.urinalysis_note || '');
    setBloodPressure(visit.blood_pressure || '');
    setFetalHeartRate(visit.fetal_heart_rate?.toString() || '');
    setFundalHeight(visit.fundal_height?.toString() || '');
    setWeight(visit.weight?.toString() || '');
    setWeightUnit(visit.weight_unit || 'lbs');
    setEatingScore(visit.eating_score || null);
    setEatingNote(visit.eating_note || '');
    setWaterScore(visit.water_score || null);
    setWaterNote(visit.water_note || '');
    setEmotionalScore(visit.emotional_score || null);
    setEmotionalNote(visit.emotional_note || '');
    setPhysicalScore(visit.physical_score || null);
    setPhysicalNote(visit.physical_note || '');
    setMentalScore(visit.mental_score || null);
    setMentalNote(visit.mental_note || '');
    setSpiritualScore(visit.spiritual_score || null);
    setSpiritualNote(visit.spiritual_note || '');
    setGeneralNotes(visit.general_notes || '');
    setShowVisitDetail(null);
    setShowVisitModal(true);
  };

  // ============== SAVE HANDLER ==============
  const handleSaveVisit = async () => {
    if (!visitDate) {
      Alert.alert('Error', 'Please select a visit date');
      return;
    }

    setSaving(true);
    try {
      const visitData = {
        client_id: clientId,
        visit_date: visitDate,
        urinalysis: urinalysis || undefined,
        urinalysis_note: urinalysisNote || undefined,
        blood_pressure: bloodPressure || undefined,
        fetal_heart_rate: fetalHeartRate ? parseInt(fetalHeartRate) : undefined,
        fundal_height: fundalHeight ? parseFloat(fundalHeight) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        weight_unit: weightUnit,
        eating_score: eatingScore || undefined,
        eating_note: eatingNote || undefined,
        water_score: waterScore || undefined,
        water_note: waterNote || undefined,
        emotional_score: emotionalScore || undefined,
        emotional_note: emotionalNote || undefined,
        physical_score: physicalScore || undefined,
        physical_note: physicalNote || undefined,
        mental_score: mentalScore || undefined,
        mental_note: mentalNote || undefined,
        spiritual_score: spiritualScore || undefined,
        spiritual_note: spiritualNote || undefined,
        general_notes: generalNotes || undefined,
      };

      if (editingVisit) {
        await apiRequest(`/midwife/clients/${clientId}/prenatal-visits/${editingVisit.prenatal_visit_id}`, {
          method: 'PUT',
          body: visitData,
        });
        Alert.alert('Success', 'Prenatal visit updated');
      } else {
        await apiRequest(`/midwife/clients/${clientId}/prenatal-visits`, {
          method: 'POST',
          body: visitData,
        });
        Alert.alert('Success', 'Prenatal visit saved');
      }

      setShowVisitModal(false);
      resetVisitForm();
      fetchPrenatalVisits();
      onRefresh?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save prenatal visit');
    } finally {
      setSaving(false);
    }
  };

  // ============== DELETE HANDLER ==============
  const handleDeleteVisit = (visit: PrenatalVisit) => {
    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this prenatal visit record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/midwife/clients/${clientId}/prenatal-visits/${visit.prenatal_visit_id}`, {
                method: 'DELETE',
              });
              setShowVisitDetail(null);
              fetchPrenatalVisits();
              Alert.alert('Deleted', 'Prenatal visit record deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete visit');
            }
          },
        },
      ]
    );
  };

  // ============== RENDER HELPERS ==============
  const renderScoreSelector = (
    label: string,
    value: number | null,
    onChange: (val: number | null) => void,
    note: string,
    onNoteChange: (val: string) => void
  ) => (
    <View style={styles.wellbeingItem}>
      <Text style={styles.wellbeingLabel}>{label}</Text>
      <View style={styles.scoreRow}>
        {WELLBEING_SCALE.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.scoreButton,
              value === item.value && [styles.scoreButtonSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
            ]}
            onPress={() => onChange(value === item.value ? null : item.value)}
          >
            <Text style={[styles.scoreButtonText, value === item.value && styles.scoreButtonTextSelected]}>
              {item.value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="Optional note..."
        placeholderTextColor={COLORS.textLight}
        value={note}
        onChangeText={onNoteChange}
      />
    </View>
  );

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="clipboard-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Prenatal Visits</Text>
          <Text style={styles.visitCount}>({prenatalVisits.length})</Text>
        </View>
        <TouchableOpacity
          style={[styles.addVisitButton, { backgroundColor: primaryColor }]}
          onPress={openAddVisit}
          data-testid="add-prenatal-visit-btn"
        >
          <Icon name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : prenatalVisits.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="document-text-outline" size={40} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No prenatal visits yet</Text>
          <Text style={styles.emptyText}>
            Tap the + button above to record your first prenatal visit assessment.
          </Text>
        </Card>
      ) : (
        prenatalVisits.map((visit) => (
          <TouchableOpacity
            key={visit.prenatal_visit_id}
            activeOpacity={0.8}
            onPress={() => setShowVisitDetail(visit)}
          >
            <Card style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={[styles.visitDateBadge, { backgroundColor: primaryColor + '15' }]}>
                  <Icon name="calendar-outline" size={14} color={primaryColor} />
                  <Text style={[styles.visitDateText, { color: primaryColor }]}>{formatDate(visit.visit_date)}</Text>
                </View>
                <Icon name="chevron-forward" size={18} color={COLORS.textLight} />
              </View>
              <Text style={styles.visitSummary}>{visit.summary}</Text>

              {/* Quick vitals preview */}
              {(visit.blood_pressure || visit.fetal_heart_rate || visit.fundal_height) && (
                <View style={styles.vitalsPreview}>
                  {visit.blood_pressure && (
                    <View style={styles.vitalChip}>
                      <Text style={styles.vitalLabel}>BP</Text>
                      <Text style={styles.vitalValue}>{visit.blood_pressure}</Text>
                    </View>
                  )}
                  {visit.fetal_heart_rate && (
                    <View style={styles.vitalChip}>
                      <Text style={styles.vitalLabel}>FHR</Text>
                      <Text style={styles.vitalValue}>{visit.fetal_heart_rate}</Text>
                    </View>
                  )}
                  {visit.fundal_height && (
                    <View style={styles.vitalChip}>
                      <Text style={styles.vitalLabel}>FH</Text>
                      <Text style={styles.vitalValue}>{visit.fundal_height}cm</Text>
                    </View>
                  )}
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))
      )}

      {/* Add/Edit Visit Modal */}
      <Modal
        visible={showVisitModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVisitModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVisitModal(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingVisit ? 'Edit Prenatal Visit' : 'Add Prenatal Visit'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Visit Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Visit Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  style={{
                    padding: 14,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 10,
                    fontSize: 16,
                    width: '100%',
                    backgroundColor: COLORS.white,
                  }}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={COLORS.textLight}
                  value={visitDate}
                  onChangeText={setVisitDate}
                />
              )}
            </View>

            {/* Vitals & Measurements */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Vitals & Measurements</Text>

              <Text style={styles.fieldLabel}>Urinalysis</Text>
              <View style={styles.urinalysisRow}>
                {URINALYSIS_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.urinalysisOption,
                      urinalysis === option && [styles.urinalysisOptionSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
                    ]}
                    onPress={() => setUrinalysis(urinalysis === option ? '' : option)}
                  >
                    <Text
                      style={[styles.urinalysisOptionText, urinalysis === option && styles.urinalysisOptionTextSelected]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {urinalysis === 'Other' && (
                <TextInput
                  style={styles.input}
                  placeholder="Specify urinalysis result..."
                  placeholderTextColor={COLORS.textLight}
                  value={urinalysisNote}
                  onChangeText={setUrinalysisNote}
                />
              )}

              <Text style={styles.fieldLabel}>Blood Pressure</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 120/70"
                placeholderTextColor={COLORS.textLight}
                value={bloodPressure}
                onChangeText={setBloodPressure}
              />

              <Text style={styles.fieldLabel}>Fetal Heart Rate (bpm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 140"
                placeholderTextColor={COLORS.textLight}
                value={fetalHeartRate}
                onChangeText={setFetalHeartRate}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Fundal Height (cm)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 28"
                placeholderTextColor={COLORS.textLight}
                value={fundalHeight}
                onChangeText={setFundalHeight}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Weight</Text>
              <View style={styles.weightRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="e.g., 145"
                  placeholderTextColor={COLORS.textLight}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitToggle}>
                  <TouchableOpacity
                    style={[styles.unitOption, weightUnit === 'lbs' && [styles.unitOptionSelected, { backgroundColor: primaryColor }]]}
                    onPress={() => setWeightUnit('lbs')}
                  >
                    <Text style={[styles.unitText, weightUnit === 'lbs' && styles.unitTextSelected]}>lbs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitOption, weightUnit === 'kg' && [styles.unitOptionSelected, { backgroundColor: primaryColor }]]}
                    onPress={() => setWeightUnit('kg')}
                  >
                    <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextSelected]}>kg</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Overall Well-Being */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Overall Well-Being</Text>
              <Text style={styles.formSectionSubtitle}>1 = Struggling, 5 = Feeling great</Text>

              {renderScoreSelector('Eating', eatingScore, setEatingScore, eatingNote, setEatingNote)}
              {renderScoreSelector('Water Intake', waterScore, setWaterScore, waterNote, setWaterNote)}
              {renderScoreSelector('Emotional', emotionalScore, setEmotionalScore, emotionalNote, setEmotionalNote)}
              {renderScoreSelector('Physical', physicalScore, setPhysicalScore, physicalNote, setPhysicalNote)}
              {renderScoreSelector('Mental', mentalScore, setMentalScore, mentalNote, setMentalNote)}
              {renderScoreSelector('Spiritual', spiritualScore, setSpiritualScore, spiritualNote, setSpiritualNote)}
            </View>

            {/* General Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>General Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional observations or notes..."
                placeholderTextColor={COLORS.textLight}
                value={generalNotes}
                onChangeText={setGeneralNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={editingVisit ? 'Update Visit' : 'Save Visit'}
              onPress={handleSaveVisit}
              loading={saving}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Visit Detail Modal */}
      <Modal
        visible={!!showVisitDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowVisitDetail(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowVisitDetail(null)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Prenatal Visit</Text>
            <TouchableOpacity onPress={() => showVisitDetail && openEditVisit(showVisitDetail)}>
              <Icon name="create-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>

          {showVisitDetail && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailDateHeader}>
                <Icon name="calendar" size={20} color={primaryColor} />
                <Text style={[styles.detailDate, { color: primaryColor }]}>{formatDate(showVisitDetail.visit_date)}</Text>
              </View>

              {/* Vitals Section */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Vitals & Measurements</Text>

                {showVisitDetail.urinalysis && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Urinalysis:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.urinalysis}</Text>
                  </View>
                )}
                {showVisitDetail.blood_pressure && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Blood Pressure:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.blood_pressure}</Text>
                  </View>
                )}
                {showVisitDetail.fetal_heart_rate && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Fetal Heart Rate:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.fetal_heart_rate} bpm</Text>
                  </View>
                )}
                {showVisitDetail.fundal_height && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Fundal Height:</Text>
                    <Text style={styles.detailValue}>{showVisitDetail.fundal_height} cm</Text>
                  </View>
                )}
                {showVisitDetail.weight && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>
                      {showVisitDetail.weight} {showVisitDetail.weight_unit || 'lbs'}
                    </Text>
                  </View>
                )}
                {!showVisitDetail.urinalysis && !showVisitDetail.blood_pressure &&
                  !showVisitDetail.fetal_heart_rate && !showVisitDetail.fundal_height &&
                  !showVisitDetail.weight && (
                    <Text style={styles.noDataText}>No vitals recorded</Text>
                  )}
              </Card>

              {/* Well-Being Section */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Overall Well-Being</Text>

                {[
                  { label: 'Eating', score: showVisitDetail.eating_score, note: showVisitDetail.eating_note },
                  { label: 'Water Intake', score: showVisitDetail.water_score, note: showVisitDetail.water_note },
                  { label: 'Emotional', score: showVisitDetail.emotional_score, note: showVisitDetail.emotional_note },
                  { label: 'Physical', score: showVisitDetail.physical_score, note: showVisitDetail.physical_note },
                  { label: 'Mental', score: showVisitDetail.mental_score, note: showVisitDetail.mental_note },
                  { label: 'Spiritual', score: showVisitDetail.spiritual_score, note: showVisitDetail.spiritual_note },
                ].map((item) => item.score && (
                  <View key={item.label} style={styles.wellbeingDetailRow}>
                    <View style={styles.wellbeingDetailHeader}>
                      <Text style={styles.detailLabel}>{item.label}:</Text>
                      <View style={[styles.scoreBadge, { backgroundColor: primaryColor + '20' }]}>
                        <Text style={[styles.scoreBadgeText, { color: primaryColor }]}>{item.score}/5</Text>
                      </View>
                    </View>
                    {item.note && <Text style={styles.wellbeingNote}>{item.note}</Text>}
                  </View>
                ))}

                {!showVisitDetail.eating_score && !showVisitDetail.water_score &&
                  !showVisitDetail.emotional_score && !showVisitDetail.physical_score &&
                  !showVisitDetail.mental_score && !showVisitDetail.spiritual_score && (
                    <Text style={styles.noDataText}>No well-being data recorded</Text>
                  )}
              </Card>

              {/* General Notes */}
              {showVisitDetail.general_notes && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>General Notes</Text>
                  <Text style={styles.generalNotesText}>{showVisitDetail.general_notes}</Text>
                </Card>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteVisit(showVisitDetail)}
              >
                <Icon name="trash-outline" size={18} color={COLORS.error} />
                <Text style={styles.deleteButtonText}>Delete Visit</Text>
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
  visitCount: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
  },
  addVisitButton: {
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
  visitCard: {
    marginBottom: SIZES.sm,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  visitDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  visitDateText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  visitSummary: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  vitalsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vitalLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textLight,
    marginRight: 4,
  },
  vitalValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
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
  formSectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  urinalysisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  urinalysisOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  urinalysisOptionSelected: {
    borderColor: COLORS.primary,
  },
  urinalysisOptionText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  urinalysisOptionTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  unitOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  unitText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  unitTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  wellbeingItem: {
    marginBottom: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wellbeingLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scoreButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  scoreButtonTextSelected: {
    color: COLORS.white,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
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
  detailCard: {
    marginBottom: SIZES.md,
  },
  detailCardTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
  },
  detailLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  noDataText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SIZES.md,
  },
  wellbeingDetailRow: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wellbeingDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  scoreBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  wellbeingNote: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  generalNotesText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
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
    color: COLORS.error,
    marginLeft: SIZES.xs,
  },
});
