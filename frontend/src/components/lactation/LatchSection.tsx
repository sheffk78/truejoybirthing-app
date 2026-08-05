// LatchSection.tsx - LATCH Breastfeeding Assessment Score Tracking
// 5 scoring items (0-2 each): Latch, Audible Swallow, Type of Nipple, Comfort, Hold
// Total score auto-calculated (max 10)

import React, { useState, useCallback, useEffect } from 'react';
import { formatDateLocal, todayLocal } from '../../utils/date';
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
import { SIZES, FONTS } from '../../constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../hooks/useThemedStyles';
import { API_ENDPOINTS } from '../../constants/api';

// ============== TYPES ==============
interface LatchScore {
  score_id?: string;
  client_id: string;
  assessment_date?: string;
  latch_score?: number;
  latch_notes?: string;
  swallow_score?: number;
  swallow_notes?: string;
  nipple_type?: number;
  nipple_type_notes?: string;
  comfort_score?: number;
  comfort_notes?: string;
  hold_score?: number;
  hold_notes?: string;
  total_score?: number;
  general_notes?: string;
  created_at?: string;
}

interface LatchSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const LATCH_ITEMS = [
  { key: 'latch_score', notesKey: 'latch_notes', label: 'Latch' },
  { key: 'swallow_score', notesKey: 'swallow_notes', label: 'Audible Swallow' },
  { key: 'nipple_type', notesKey: 'nipple_type_notes', label: 'Type of Nipple' },
  { key: 'comfort_score', notesKey: 'comfort_notes', label: 'Comfort' },
  { key: 'hold_score', notesKey: 'hold_notes', label: 'Hold' },
] as const;

const SCORE_OPTIONS = [0, 1, 2];

// ============== MAIN COMPONENT ==============
export default function LatchSection({ clientId, primaryColor, onRefresh }: LatchSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  // State
  const [scores, setScores] = useState<LatchScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetail, setShowDetail] = useState<LatchScore | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<LatchScore>>({});

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`${API_ENDPOINTS.LACTATION_LATCH_SCORES}/client/${clientId}`);
      setScores(data || []);
    } catch (error: any) {
      console.error('Error fetching latch scores:', error);
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============== HELPERS ==============
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const resetForm = () => {
    setFormData({ assessment_date: todayLocal() });
  };

  const computeTotal = (data: Partial<LatchScore>): number => {
    return (
      (data.latch_score || 0) +
      (data.swallow_score || 0) +
      (data.nipple_type || 0) +
      (data.comfort_score || 0) +
      (data.hold_score || 0)
    );
  };

  const getScoreColor = (total: number): string => {
    if (total <= 4) return colors.error;
    if (total <= 7) return colors.warning;
    return colors.success;
  };

  const confirmDelete = (record: LatchScore) => {
    const doDelete = () => {
      apiRequest(`${API_ENDPOINTS.LACTATION_LATCH_SCORES}/${record.score_id}`, { method: 'DELETE' })
        .then(() => {
          setShowDetail(null);
          fetchData();
          onRefresh?.();
        })
        .catch((error: any) => {
          if (Platform.OS === 'web') {
            window.alert(`Error: ${error.message || 'Failed to delete'}`);
          } else {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this latch assessment record?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Latch Assessment', 'Are you sure you want to delete this latch assessment record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    if (!formData.assessment_date) {
      if (Platform.OS === 'web') {
        window.alert('Please select an assessment date');
      } else {
        Alert.alert('Error', 'Please select an assessment date');
      }
      return;
    }

    setSaving(true);
    try {
      const total = computeTotal(formData);
      const data: any = {
        client_id: clientId,
        ...formData,
        total_score: total,
      };

      // Remove undefined and empty values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          delete data[key];
        }
      });

      if (formData.score_id) {
        await apiRequest(`${API_ENDPOINTS.LACTATION_LATCH_SCORES}/${formData.score_id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        await apiRequest(API_ENDPOINTS.LACTATION_LATCH_SCORES, {
          method: 'POST',
          body: data,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Latch assessment saved');
      } else {
        Alert.alert('Success', 'Latch assessment saved');
      }
      setShowAddModal(false);
      resetForm();
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save latch assessment'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save latch assessment');
      }
    } finally {
      setSaving(false);
    }
  };

  // ============== RENDER HELPERS ==============
  const renderScoreSelector = (
    item: typeof LATCH_ITEMS[number],
    value: number | undefined,
    note: string | undefined
  ) => (
    <View style={styles.scoreItem}>
      <View style={styles.scoreItemHeader}>
        <Text style={styles.scoreItemLabel}>{item.label}</Text>
        <View style={styles.scoreRow}>
          {SCORE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.scoreButton,
                value === opt && [styles.scoreButtonSelected, { backgroundColor: primaryColor, borderColor: primaryColor }],
              ]}
              onPress={() =>
                setFormData(prev => ({
                  ...prev,
                  [item.key]: value === opt ? undefined : opt,
                }))
              }
            >
              <Text style={[styles.scoreButtonText, value === opt && styles.scoreButtonTextSelected]}>
                {opt}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TextInput
        style={styles.noteInput}
        placeholder="Optional note..."
        placeholderTextColor={colors.textLight}
        value={note || ''}
        onChangeText={(text) => setFormData(prev => ({ ...prev, [item.notesKey]: text }))}
      />
    </View>
  );

  const renderDetailRow = (label: string, score: number | undefined, note: string | undefined) => {
    if (score === undefined || score === null) return null;
    return (
      <View style={styles.subscoreRow}>
        <View style={styles.subscoreHeader}>
          <Text style={styles.detailLabel}>{label}:</Text>
          <View style={[styles.scoreBadge, { backgroundColor: primaryColor + '20' }]}>
            <Text style={[styles.scoreBadgeText, { color: primaryColor }]}>{score}/2</Text>
          </View>
        </View>
        {note && <Text style={styles.subscoreNote}>{note}</Text>}
      </View>
    );
  };

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="water-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Latch Assessment</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          data-testid="add-latch-score-btn"
        >
          <Icon name="add-circle" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : scores.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="water-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Latch Assessments</Text>
          <Text style={styles.emptyText}>No records yet. Tap + to add one.</Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {scores.map((record) => {
            const total = record.total_score ?? computeTotal(record);
            const scoreColor = getScoreColor(total);
            return (
              <TouchableOpacity
                key={record.score_id}
                activeOpacity={0.8}
                onPress={() => setShowDetail(record)}
              >
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Icon name="calendar-outline" size={16} color={primaryColor} />
                      <Text style={styles.cardDate}>{formatDate(record.assessment_date)}</Text>
                    </View>
                    <View style={[styles.totalScoreBadge, { backgroundColor: scoreColor + '20' }]}>
                      <Text style={[styles.totalScoreText, { color: scoreColor }]}>
                        {total}/10
                      </Text>
                    </View>
                  </View>

                  {record.general_notes && (
                    <Text style={styles.cardNotes} numberOfLines={2}>
                      {record.general_notes}
                    </Text>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {formData.score_id ? 'Edit Latch Assessment' : 'New Latch Assessment'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Assessment Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Assessment Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formData.assessment_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, assessment_date: e.target.value }))}
                  style={{
                    padding: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    fontSize: 16,
                    width: '100%',
                    backgroundColor: colors.surface,
                  }}
                />
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textLight}
                  value={formData.assessment_date || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, assessment_date: text }))}
                />
              )}
            </View>

            {/* Scoring Items */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>LATCH Scoring</Text>
              <Text style={styles.formSectionSubtitle}>Score each item 0-2. Total auto-calculated.</Text>

              {LATCH_ITEMS.map((item) =>
                renderScoreSelector(item, formData[item.key] as number | undefined, formData[item.notesKey] as string | undefined)
              )}

              {/* Total Score Display */}
              <View style={styles.totalDisplay}>
                <Text style={styles.totalDisplayLabel}>Total Score</Text>
                <Text
                  style={[
                    styles.totalDisplayValue,
                    { color: getScoreColor(computeTotal(formData)) },
                  ]}
                >
                  {computeTotal(formData)}/10
                </Text>
              </View>
            </View>

            {/* General Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>General Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional observations or notes..."
                placeholderTextColor={colors.textLight}
                value={formData.general_notes || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, general_notes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={formData.score_id ? 'Update' : 'Save'}
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={!!showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetail(null)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Latch Assessment</Text>
            <TouchableOpacity
              onPress={() => {
                if (showDetail) {
                  setFormData(showDetail);
                  setShowDetail(null);
                  setShowAddModal(true);
                }
              }}
            >
              <Icon name="create-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>

          {showDetail && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailDateHeader}>
                <Icon name="calendar" size={20} color={primaryColor} />
                <Text style={[styles.detailDate, { color: primaryColor }]}>
                  {formatDate(showDetail.assessment_date)}
                </Text>
              </View>

              {/* Total Score */}
              <View style={styles.detailTotalContainer}>
                <Text style={styles.detailTotalLabel}>Total LATCH Score</Text>
                <View
                  style={[
                    styles.detailTotalBadge,
                    { backgroundColor: getScoreColor(showDetail.total_score ?? computeTotal(showDetail)) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.detailTotalValue,
                      { color: getScoreColor(showDetail.total_score ?? computeTotal(showDetail)) },
                    ]}
                  >
                    {showDetail.total_score ?? computeTotal(showDetail)}/10
                  </Text>
                </View>
              </View>

              {/* Subscores */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Subscores</Text>
                {LATCH_ITEMS.map((item) =>
                  renderDetailRow(
                    item.label,
                    showDetail[item.key] as number | undefined,
                    showDetail[item.notesKey] as string | undefined
                  )
                )}
                {LATCH_ITEMS.every(
                  (item) => showDetail[item.key] === undefined || showDetail[item.key] === null
                ) && <Text style={styles.noDataText}>No scores recorded</Text>}
              </Card>

              {/* General Notes */}
              {showDetail.general_notes && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>General Notes</Text>
                  <Text style={styles.generalNotesText}>{showDetail.general_notes}</Text>
                </Card>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(showDetail)}
              >
                <Icon name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>Delete Record</Text>
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
const getStyles = createThemedStyles((colors: ThemeColors) => ({
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  addButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.white,
    marginLeft: 4,
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
  listContainer: {
    gap: SIZES.sm,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    flex: 1,
  },
  cardDate: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  totalScoreBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  totalScoreText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
  },
  cardNotes: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.surface,
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
  formSectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: SIZES.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Score selector
  scoreItem: {
    marginBottom: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scoreItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  scoreItemLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButtonSelected: {
    // backgroundColor and borderColor set inline
  },
  scoreButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
  },
  scoreButtonTextSelected: {
    color: colors.white,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  // Total display in form
  totalDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.md,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: SIZES.sm,
  },
  totalDisplayLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  totalDisplayValue: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.bodyBold,
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
  detailTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailTotalLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  detailTotalBadge: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
  },
  detailTotalValue: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.bodyBold,
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
  subscoreRow: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  subscoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
  subscoreNote: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SIZES.md,
  },
  generalNotesText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
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
    color: colors.error,
    marginLeft: SIZES.xs,
  },
}));