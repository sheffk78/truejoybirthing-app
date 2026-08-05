// OralExamSection.tsx - Oral Examination for Lactation Assessment
// Features: Collapsible form sections, selector chips, detailed view grouped by section

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
interface OralExam {
  exam_id?: string;
  client_id: string;
  exam_date?: string;
  tongue_appearance?: string;
  tongue_tie?: string;
  tongue_tie_severity?: string;
  tongue_lift?: string;
  lateralization?: string;
  lip_tie?: string;
  lip_seal?: string;
  palate?: string;
  palate_notes?: string;
  gums?: string;
  sucking_reflex?: string;
  suck_pattern?: string;
  recommendation?: string;
  referral_notes?: string;
  general_notes?: string;
  created_at?: string;
}

interface OralExamSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const TONGUE_APPEARANCE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'heart_shaped', label: 'Heart-shaped' },
  { value: 'short_frenum', label: 'Short Frenum' },
  { value: 'thick_frenum', label: 'Thick Frenum' },
];

const TONGUE_TIE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'anterior', label: 'Anterior' },
  { value: 'posterior', label: 'Posterior' },
  { value: 'submucosal', label: 'Submucosal' },
];

const SEVERITY_OPTIONS = [
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const TONGUE_LIFT_OPTIONS = [
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'limited', label: 'Limited' },
];

const LATERALIZATION_OPTIONS = [
  { value: 'full', label: 'Full' },
  { value: 'partial', label: 'Partial' },
  { value: 'none', label: 'None' },
];

const LIP_TIE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const LIP_SEAL_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
];

const PALATE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'high_arched', label: 'High Arched' },
  { value: 'cleft', label: 'Cleft' },
  { value: 'other', label: 'Other' },
];

const GUMS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'swollen', label: 'Swollen' },
  { value: 'other', label: 'Other' },
];

const SUCKING_REFLEX_OPTIONS = [
  { value: 'strong', label: 'Strong' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'weak', label: 'Weak' },
  { value: 'absent', label: 'Absent' },
];

const SUCK_PATTERN_OPTIONS = [
  { value: 'rhythmic', label: 'Rhythmic' },
  { value: 'disorganized', label: 'Disorganized' },
  { value: 'weak', label: 'Weak' },
  { value: 'jaw_clench', label: 'Jaw Clench' },
];

const RECOMMENDATION_OPTIONS = [
  { value: 'continue_breastfeeding', label: 'Continue Breastfeeding' },
  { value: 'refer_for_frenotomy', label: 'Refer for Frenotomy' },
  { value: 'refer_to_ent', label: 'Refer to ENT' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'other', label: 'Other' },
];

// ============== MAIN COMPONENT ==============
export default function OralExamSection({ clientId, primaryColor, onRefresh }: OralExamSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  // State
  const [exams, setExams] = useState<OralExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetail, setShowDetail] = useState<OralExam | null>(null);
  const [saving, setSaving] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    date: true,
    tongue: false,
    lips: false,
    palate: false,
    gums: false,
    suck: false,
    recommendations: false,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<OralExam>>({});

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`${API_ENDPOINTS.LACTATION_ORAL_EXAMS}/client/${clientId}`);
      setExams(data || []);
    } catch (error: any) {
      console.error('Error fetching oral exams:', error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============== HELPERS ==============
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const resetForm = () => {
    setFormData({ exam_date: todayLocal() });
    setExpandedSections({
      date: true,
      tongue: false,
      lips: false,
      palate: false,
      gums: false,
      suck: false,
      recommendations: false,
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getLabel = (options: { value: string; label: string }[], value?: string) => {
    return options.find(o => o.value === value)?.label || value || '';
  };

  const confirmDelete = (exam: OralExam) => {
    const doDelete = () => {
      apiRequest(`${API_ENDPOINTS.LACTATION_ORAL_EXAMS}/${exam.exam_id}`, { method: 'DELETE' })
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
      if (window.confirm('Delete this oral exam record?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Oral Exam', 'Are you sure you want to delete this oral exam record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    if (!formData.exam_date) {
      if (Platform.OS === 'web') {
        window.alert('Please select an exam date');
      } else {
        Alert.alert('Error', 'Please select an exam date');
      }
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        client_id: clientId,
        ...formData,
      };

      // Remove undefined and empty values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          delete data[key];
        }
      });

      if (formData.exam_id) {
        await apiRequest(`${API_ENDPOINTS.LACTATION_ORAL_EXAMS}/${formData.exam_id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        await apiRequest(API_ENDPOINTS.LACTATION_ORAL_EXAMS, {
          method: 'POST',
          body: data,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Oral exam saved');
      } else {
        Alert.alert('Success', 'Oral exam saved');
      }
      setShowAddModal(false);
      resetForm();
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save oral exam'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save oral exam');
      }
    } finally {
      setSaving(false);
    }
  };

  // ============== RENDER HELPERS ==============
  const renderCollapsibleSection = (
    title: string,
    sectionKey: string,
    icon: string,
    children: React.ReactNode
  ) => (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection(sectionKey)}
      >
        <View style={styles.collapsibleTitleRow}>
          <Icon name={icon as any} size={20} color={primaryColor} />
          <Text style={styles.collapsibleTitle}>{title}</Text>
        </View>
        <Icon
          name={expandedSections[sectionKey] ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expandedSections[sectionKey] && (
        <View style={styles.collapsibleContent}>{children}</View>
      )}
    </View>
  );

  const renderSelectorChips = (
    options: { value: string; label: string }[],
    selectedValue: string | undefined,
    onSelect: (val: string) => void
  ) => (
    <View style={styles.chipsRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.chip,
            selectedValue === opt.value && [
              styles.chipSelected,
              { backgroundColor: primaryColor, borderColor: primaryColor },
            ],
          ]}
          onPress={() => onSelect(selectedValue === opt.value ? '' : opt.value)}
        >
          <Text
            style={[
              styles.chipText,
              selectedValue === opt.value && styles.chipTextSelected,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ============== EXAM CARD ==============
  const renderExamCard = (exam: OralExam) => (
    <TouchableOpacity
      key={exam.exam_id}
      activeOpacity={0.8}
      onPress={() => setShowDetail(exam)}
    >
      <Card style={styles.examCard}>
        <View style={styles.examCardHeader}>
          <View style={styles.examCardInfo}>
            <View style={styles.examCardTitleRow}>
              <Icon name="calendar-outline" size={16} color={primaryColor} />
              <Text style={styles.examCardDate}>{formatDate(exam.exam_date)}</Text>
            </View>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textLight} />
        </View>

        <View style={styles.examCardDetails}>
          {exam.tongue_tie && exam.tongue_tie !== 'none' && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Tongue Tie:</Text>
              <Text style={styles.detailChipValue}>
                {getLabel(TONGUE_TIE_OPTIONS, exam.tongue_tie)}
                {exam.tongue_tie_severity ? ` (${getLabel(SEVERITY_OPTIONS, exam.tongue_tie_severity)})` : ''}
              </Text>
            </View>
          )}
          {exam.lip_tie && exam.lip_tie !== 'none' && (
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Lip Tie:</Text>
              <Text style={styles.detailChipValue}>{getLabel(LIP_TIE_OPTIONS, exam.lip_tie)}</Text>
            </View>
          )}
        </View>

        {exam.recommendation && (
          <View
            style={[
              styles.recommendationBadge,
              { backgroundColor: primaryColor + '20' },
            ]}
          >
            <Text style={[styles.recommendationText, { color: primaryColor }]}>
              {getLabel(RECOMMENDATION_OPTIONS, exam.recommendation)}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );

  // ============== DETAIL MODAL ==============
  const renderDetailSection = (
    title: string,
    icon: string,
    rows: { label: string; value?: string }[]
  ) => {
    const hasData = rows.some(r => r.value);
    if (!hasData) return null;
    return (
      <Card style={styles.detailCard}>
        <Text style={styles.detailCardTitle}>
          <Icon name={icon as any} size={16} color={primaryColor} /> {title}
        </Text>
        {rows.map((row, idx) => (
          row.value ? (
            <View key={idx} style={styles.detailInfoRow}>
              <Text style={styles.detailLabel}>{row.label}:</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ) : null
        ))}
      </Card>
    );
  };

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="medical-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Oral Exams</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          data-testid="add-oral-exam-btn"
        >
          <Icon name="add-circle" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : exams.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="medical-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Oral Exams</Text>
          <Text style={styles.emptyText}>No records yet. Tap + to add one.</Text>
        </Card>
      ) : (
        <View style={styles.examsList}>{exams.map(renderExamCard)}</View>
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
              {formData.exam_id ? 'Edit Oral Exam' : 'New Oral Exam'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* SECTION: Exam Date */}
            {renderCollapsibleSection('Exam Date', 'date', 'calendar-outline', (
              <View>
                <Text style={styles.fieldLabel}>Exam Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={formData.exam_date || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
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
                    value={formData.exam_date || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, exam_date: text }))}
                  />
                )}
              </View>
            ))}

            {/* SECTION: Tongue */}
            {renderCollapsibleSection('Tongue', 'tongue', 'body-outline', (
              <View>
                <Text style={styles.fieldLabel}>Tongue Appearance</Text>
                {renderSelectorChips(TONGUE_APPEARANCE_OPTIONS, formData.tongue_appearance, (val) => setFormData(prev => ({ ...prev, tongue_appearance: val })))}

                <Text style={styles.fieldLabel}>Tongue Tie</Text>
                {renderSelectorChips(TONGUE_TIE_OPTIONS, formData.tongue_tie, (val) => setFormData(prev => ({ ...prev, tongue_tie: val })))}

                {formData.tongue_tie && formData.tongue_tie !== 'none' && (
                  <>
                    <Text style={styles.fieldLabel}>Tongue Tie Severity</Text>
                    {renderSelectorChips(SEVERITY_OPTIONS, formData.tongue_tie_severity, (val) => setFormData(prev => ({ ...prev, tongue_tie_severity: val })))}
                  </>
                )}

                <Text style={styles.fieldLabel}>Tongue Lift</Text>
                {renderSelectorChips(TONGUE_LIFT_OPTIONS, formData.tongue_lift, (val) => setFormData(prev => ({ ...prev, tongue_lift: val })))}

                <Text style={styles.fieldLabel}>Lateralization</Text>
                {renderSelectorChips(LATERALIZATION_OPTIONS, formData.lateralization, (val) => setFormData(prev => ({ ...prev, lateralization: val })))}
              </View>
            ))}

            {/* SECTION: Lips */}
            {renderCollapsibleSection('Lips', 'lips', 'happy-outline', (
              <View>
                <Text style={styles.fieldLabel}>Lip Tie</Text>
                {renderSelectorChips(LIP_TIE_OPTIONS, formData.lip_tie, (val) => setFormData(prev => ({ ...prev, lip_tie: val })))}

                <Text style={styles.fieldLabel}>Lip Seal</Text>
                {renderSelectorChips(LIP_SEAL_OPTIONS, formData.lip_seal, (val) => setFormData(prev => ({ ...prev, lip_seal: val })))}
              </View>
            ))}

            {/* SECTION: Palate */}
            {renderCollapsibleSection('Palate', 'palate', 'body-outline', (
              <View>
                <Text style={styles.fieldLabel}>Palate</Text>
                {renderSelectorChips(PALATE_OPTIONS, formData.palate, (val) => setFormData(prev => ({ ...prev, palate: val })))}

                <Text style={styles.fieldLabel}>Palate Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional palate observations..."
                  placeholderTextColor={colors.textLight}
                  value={formData.palate_notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, palate_notes: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>
            ))}

            {/* SECTION: Gums */}
            {renderCollapsibleSection('Gums', 'gums', 'body-outline', (
              <View>
                <Text style={styles.fieldLabel}>Gums</Text>
                {renderSelectorChips(GUMS_OPTIONS, formData.gums, (val) => setFormData(prev => ({ ...prev, gums: val })))}
              </View>
            ))}

            {/* SECTION: Suck Assessment */}
            {renderCollapsibleSection('Suck Assessment', 'suck', 'pulse-outline', (
              <View>
                <Text style={styles.fieldLabel}>Sucking Reflex</Text>
                {renderSelectorChips(SUCKING_REFLEX_OPTIONS, formData.sucking_reflex, (val) => setFormData(prev => ({ ...prev, sucking_reflex: val })))}

                <Text style={styles.fieldLabel}>Suck Pattern</Text>
                {renderSelectorChips(SUCK_PATTERN_OPTIONS, formData.suck_pattern, (val) => setFormData(prev => ({ ...prev, suck_pattern: val })))}
              </View>
            ))}

            {/* SECTION: Recommendations */}
            {renderCollapsibleSection('Recommendations', 'recommendations', 'checkmark-circle-outline', (
              <View>
                <Text style={styles.fieldLabel}>Recommendation</Text>
                {renderSelectorChips(RECOMMENDATION_OPTIONS, formData.recommendation, (val) => setFormData(prev => ({ ...prev, recommendation: val })))}

                <Text style={styles.fieldLabel}>Referral Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Referral details..."
                  placeholderTextColor={colors.textLight}
                  value={formData.referral_notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, referral_notes: text }))}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>General Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Additional notes..."
                  placeholderTextColor={colors.textLight}
                  value={formData.general_notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, general_notes: text }))}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={formData.exam_id ? 'Update' : 'Save'}
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
            <Text style={styles.modalTitle}>Oral Exam</Text>
            <TouchableOpacity
              onPress={() => {
                if (showDetail) {
                  setFormData(showDetail);
                  setExpandedSections({
                    date: true,
                    tongue: true,
                    lips: true,
                    palate: true,
                    gums: true,
                    suck: true,
                    recommendations: true,
                  });
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
                  {formatDate(showDetail.exam_date)}
                </Text>
              </View>

              {renderDetailSection('Tongue', 'body-outline', [
                { label: 'Appearance', value: getLabel(TONGUE_APPEARANCE_OPTIONS, showDetail.tongue_appearance) },
                { label: 'Tongue Tie', value: showDetail.tongue_tie && showDetail.tongue_tie !== 'none' ? getLabel(TONGUE_TIE_OPTIONS, showDetail.tongue_tie) : undefined },
                { label: 'Tie Severity', value: showDetail.tongue_tie_severity ? getLabel(SEVERITY_OPTIONS, showDetail.tongue_tie_severity) : undefined },
                { label: 'Tongue Lift', value: getLabel(TONGUE_LIFT_OPTIONS, showDetail.tongue_lift) },
                { label: 'Lateralization', value: getLabel(LATERALIZATION_OPTIONS, showDetail.lateralization) },
              ])}

              {renderDetailSection('Lips', 'happy-outline', [
                { label: 'Lip Tie', value: showDetail.lip_tie && showDetail.lip_tie !== 'none' ? getLabel(LIP_TIE_OPTIONS, showDetail.lip_tie) : undefined },
                { label: 'Lip Seal', value: getLabel(LIP_SEAL_OPTIONS, showDetail.lip_seal) },
              ])}

              {renderDetailSection('Palate', 'body-outline', [
                { label: 'Palate', value: getLabel(PALATE_OPTIONS, showDetail.palate) },
                { label: 'Notes', value: showDetail.palate_notes },
              ])}

              {renderDetailSection('Gums', 'body-outline', [
                { label: 'Gums', value: getLabel(GUMS_OPTIONS, showDetail.gums) },
              ])}

              {renderDetailSection('Suck Assessment', 'pulse-outline', [
                { label: 'Sucking Reflex', value: getLabel(SUCKING_REFLEX_OPTIONS, showDetail.sucking_reflex) },
                { label: 'Suck Pattern', value: getLabel(SUCK_PATTERN_OPTIONS, showDetail.suck_pattern) },
              ])}

              {(showDetail.recommendation || showDetail.referral_notes || showDetail.general_notes) && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>
                    <Icon name="checkmark-circle-outline" size={16} color={primaryColor} /> Recommendations
                  </Text>
                  {showDetail.recommendation && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Recommendation:</Text>
                      <Text style={styles.detailValue}>{getLabel(RECOMMENDATION_OPTIONS, showDetail.recommendation)}</Text>
                    </View>
                  )}
                  {showDetail.referral_notes && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Referral Notes:</Text>
                      <Text style={styles.detailValue}>{showDetail.referral_notes}</Text>
                    </View>
                  )}
                  {showDetail.general_notes && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>General Notes:</Text>
                      <Text style={styles.detailValue}>{showDetail.general_notes}</Text>
                    </View>
                  )}
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
  examsList: {
    gap: SIZES.sm,
  },
  examCard: {
    marginBottom: 0,
  },
  examCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  examCardInfo: {
    flex: 1,
  },
  examCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  examCardDate: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  examCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginBottom: SIZES.xs,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailChipLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: colors.textLight,
    marginRight: 4,
  },
  detailChipValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
  },
  recommendationBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    alignSelf: 'flex-start',
    marginTop: SIZES.xs,
  },
  recommendationText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
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
  // Collapsible sections
  collapsibleSection: {
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: colors.background,
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  collapsibleTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  collapsibleContent: {
    padding: SIZES.md,
    paddingTop: SIZES.sm,
  },
  // Form styles
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
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  // Selector chips
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  chip: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: SIZES.xs,
  },
  chipSelected: {
    // backgroundColor and borderColor set inline
  },
  chipText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyMedium,
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
    flex: 1,
    textAlign: 'right',
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