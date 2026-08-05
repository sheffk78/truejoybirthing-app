// SoapNoteSection.tsx - Lactation SOAP Notes (Subjective, Objective, Assessment, Plan)
// Features: 4 large text areas, colored section headers, follow-up tracking

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
import { SIZES, FONTS, COLORS } from '../../constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../hooks/useThemedStyles';
import { API_ENDPOINTS } from '../../constants/api';

// ============== TYPES ==============
interface SoapNote {
  soap_id?: string;
  client_id: string;
  note_date?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  follow_up_date?: string;
  follow_up_notes?: string;
  created_at?: string;
}

interface SoapNoteSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== SECTION COLORS ==============
// S: blue, O: green, A: orange, P: purple
const SOAP_SECTION_COLORS = {
  S: '#4A90D9', // blue
  O: '#5BA85B', // green
  A: '#E89B4A', // orange
  P: '#9B6BD0', // purple
};

// ============== MAIN COMPONENT ==============
export default function SoapNoteSection({ clientId, primaryColor, onRefresh }: SoapNoteSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  // State
  const [notes, setNotes] = useState<SoapNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetail, setShowDetail] = useState<SoapNote | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<SoapNote>>({});

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`${API_ENDPOINTS.LACTATION_SOAP_NOTES}/client/${clientId}`);
      setNotes(data || []);
    } catch (error: any) {
      console.error('Error fetching SOAP notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============== HELPERS ==============
  const resetForm = () => {
    setFormData({ note_date: todayLocal() });
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

  const truncate = (text: string | undefined, max: number = 80): string => {
    if (!text) return '';
    return text.length > max ? text.substring(0, max) + '...' : text;
  };

  const confirmDelete = (note: SoapNote) => {
    const doDelete = () => {
      apiRequest(`${API_ENDPOINTS.LACTATION_SOAP_NOTES}/${note.soap_id}`, { method: 'DELETE' })
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
      if (window.confirm('Delete this SOAP note?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete SOAP Note', 'Are you sure you want to delete this SOAP note?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    if (!formData.note_date) {
      if (Platform.OS === 'web') {
        window.alert('Please select a note date');
      } else {
        Alert.alert('Error', 'Please select a note date');
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

      if (formData.soap_id) {
        await apiRequest(`${API_ENDPOINTS.LACTATION_SOAP_NOTES}/${formData.soap_id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        await apiRequest(API_ENDPOINTS.LACTATION_SOAP_NOTES, {
          method: 'POST',
          body: data,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('SOAP note saved');
      } else {
        Alert.alert('Success', 'SOAP note saved');
      }
      setShowAddModal(false);
      resetForm();
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save SOAP note'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save SOAP note');
      }
    } finally {
      setSaving(false);
    }
  };

  // ============== RENDER HELPERS ==============
  const renderDateInput = (
    label: string,
    value: string | undefined,
    onChange: (val: string) => void
  ) => (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      {Platform.OS === 'web' ? (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
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
          value={value || ''}
          onChangeText={onChange}
        />
      )}
    </View>
  );

  const renderTextArea = (
    label: string,
    placeholder: string,
    value: string | undefined,
    onChange: (val: string) => void,
    minHeight: number = 120
  ) => (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, styles.textArea, { minHeight }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value || ''}
        onChangeText={onChange}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );

  const renderDetailSection = (
    letter: string,
    title: string,
    content?: string
  ) => {
    if (!content) return null;
    const sectionColor = SOAP_SECTION_COLORS[letter as keyof typeof SOAP_SECTION_COLORS];
    return (
      <Card style={styles.detailCard}>
        <View style={[styles.detailSectionHeader, { backgroundColor: sectionColor + '15' }]}>
          <View style={[styles.detailLetterBadge, { backgroundColor: sectionColor }]}>
            <Text style={styles.detailLetterText}>{letter}</Text>
          </View>
          <Text style={[styles.detailSectionTitle, { color: sectionColor }]}>{title}</Text>
        </View>
        <Text style={styles.detailContentText}>{content}</Text>
      </Card>
    );
  };

  // ============== NOTE CARD ==============
  const renderNoteCard = (note: SoapNote) => (
    <TouchableOpacity
      key={note.soap_id}
      activeOpacity={0.8}
      onPress={() => setShowDetail(note)}
    >
      <Card style={styles.noteCard}>
        <View style={styles.noteCardHeader}>
          <View style={[styles.noteDateBadge, { backgroundColor: primaryColor + '15' }]}>
            <Icon name="calendar-outline" size={14} color={primaryColor} />
            <Text style={[styles.noteDateText, { color: primaryColor }]}>{formatDate(note.note_date)}</Text>
          </View>
          <View style={styles.noteCardActions}>
            {note.follow_up_date && (
              <View style={[styles.followUpBadge, { backgroundColor: colors.warning + '20' }]}>
                <Icon name="time-outline" size={12} color={colors.warning} />
                <Text style={[styles.followUpBadgeText, { color: colors.warning }]}>
                  {formatDate(note.follow_up_date)}
                </Text>
              </View>
            )}
            <Icon name="chevron-forward" size={18} color={colors.textLight} />
          </View>
        </View>

        {note.assessment && (
          <Text style={styles.noteAssessmentPreview} numberOfLines={2}>
            {truncate(note.assessment, 80)}
          </Text>
        )}

        <View style={styles.noteCardFooter}>
          {note.subjective && (
            <View style={[styles.soapMiniBadge, { backgroundColor: SOAP_SECTION_COLORS.S + '20' }]}>
              <Text style={[styles.soapMiniText, { color: SOAP_SECTION_COLORS.S }]}>S</Text>
            </View>
          )}
          {note.objective && (
            <View style={[styles.soapMiniBadge, { backgroundColor: SOAP_SECTION_COLORS.O + '20' }]}>
              <Text style={[styles.soapMiniText, { color: SOAP_SECTION_COLORS.O }]}>O</Text>
            </View>
          )}
          {note.assessment && (
            <View style={[styles.soapMiniBadge, { backgroundColor: SOAP_SECTION_COLORS.A + '20' }]}>
              <Text style={[styles.soapMiniText, { color: SOAP_SECTION_COLORS.A }]}>A</Text>
            </View>
          )}
          {note.plan && (
            <View style={[styles.soapMiniBadge, { backgroundColor: SOAP_SECTION_COLORS.P + '20' }]}>
              <Text style={[styles.soapMiniText, { color: SOAP_SECTION_COLORS.P }]}>P</Text>
            </View>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="document-text-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>SOAP Notes</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          data-testid="add-soap-note-btn"
        >
          <Icon name="add-circle" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : notes.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="document-text-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No SOAP Notes</Text>
          <Text style={styles.emptyText}>No records yet. Tap + to add one.</Text>
        </Card>
      ) : (
        <View style={styles.notesList}>{notes.map(renderNoteCard)}</View>
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
              {formData.soap_id ? 'Edit SOAP Note' : 'New SOAP Note'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Date */}
            {renderDateInput('Note Date', formData.note_date, (val) => setFormData(prev => ({ ...prev, note_date: val })))}

            {/* S - Subjective */}
            <View style={styles.formSection}>
              <View style={[styles.formSectionHeader, { backgroundColor: SOAP_SECTION_COLORS.S + '15' }]}>
                <View style={[styles.formLetterBadge, { backgroundColor: SOAP_SECTION_COLORS.S }]}>
                  <Text style={styles.formLetterText}>S</Text>
                </View>
                <Text style={[styles.formSectionTitle, { color: SOAP_SECTION_COLORS.S }]}>Subjective</Text>
              </View>
              {renderTextArea(
                'Subjective',
                'Parent concerns, reported symptoms, feeding history...',
                formData.subjective,
                (val) => setFormData(prev => ({ ...prev, subjective: val })),
                130
              )}
            </View>

            {/* O - Objective */}
            <View style={styles.formSection}>
              <View style={[styles.formSectionHeader, { backgroundColor: SOAP_SECTION_COLORS.O + '15' }]}>
                <View style={[styles.formLetterBadge, { backgroundColor: SOAP_SECTION_COLORS.O }]}>
                  <Text style={styles.formLetterText}>O</Text>
                </View>
                <Text style={[styles.formSectionTitle, { color: SOAP_SECTION_COLORS.O }]}>Objective</Text>
              </View>
              {renderTextArea(
                'Objective',
                'Observations, exam findings, LATCH score reference, weight data...',
                formData.objective,
                (val) => setFormData(prev => ({ ...prev, objective: val })),
                130
              )}
            </View>

            {/* A - Assessment */}
            <View style={styles.formSection}>
              <View style={[styles.formSectionHeader, { backgroundColor: SOAP_SECTION_COLORS.A + '15' }]}>
                <View style={[styles.formLetterBadge, { backgroundColor: SOAP_SECTION_COLORS.A }]}>
                  <Text style={styles.formLetterText}>A</Text>
                </View>
                <Text style={[styles.formSectionTitle, { color: SOAP_SECTION_COLORS.A }]}>Assessment</Text>
              </View>
              {renderTextArea(
                'Assessment',
                'Clinical impression, diagnosis...',
                formData.assessment,
                (val) => setFormData(prev => ({ ...prev, assessment: val })),
                120
              )}
            </View>

            {/* P - Plan */}
            <View style={styles.formSection}>
              <View style={[styles.formSectionHeader, { backgroundColor: SOAP_SECTION_COLORS.P + '15' }]}>
                <View style={[styles.formLetterBadge, { backgroundColor: SOAP_SECTION_COLORS.P }]}>
                  <Text style={styles.formLetterText}>P</Text>
                </View>
                <Text style={[styles.formSectionTitle, { color: SOAP_SECTION_COLORS.P }]}>Plan</Text>
              </View>
              {renderTextArea(
                'Plan',
                'Recommendations, follow-up, referrals...',
                formData.plan,
                (val) => setFormData(prev => ({ ...prev, plan: val })),
                120
              )}
            </View>

            {/* Follow-up */}
            <View style={styles.formSection}>
              <Text style={styles.followUpSectionTitle}>Follow-up (Optional)</Text>
              {renderDateInput('Follow-up Date', formData.follow_up_date, (val) => setFormData(prev => ({ ...prev, follow_up_date: val })))}
              {renderTextArea(
                'Follow-up Notes',
                'Follow-up instructions or notes...',
                formData.follow_up_notes,
                (val) => setFormData(prev => ({ ...prev, follow_up_notes: val })),
                80
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={formData.soap_id ? 'Update' : 'Save'}
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
            <Text style={styles.modalTitle}>SOAP Note</Text>
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
                  {formatDate(showDetail.note_date)}
                </Text>
              </View>

              {renderDetailSection('S', 'Subjective', showDetail.subjective)}
              {renderDetailSection('O', 'Objective', showDetail.objective)}
              {renderDetailSection('A', 'Assessment', showDetail.assessment)}
              {renderDetailSection('P', 'Plan', showDetail.plan)}

              {/* Follow-up Section */}
              {(showDetail.follow_up_date || showDetail.follow_up_notes) && (
                <Card style={styles.detailCard}>
                  <View style={[styles.detailSectionHeader, { backgroundColor: colors.warning + '15' }]}>
                    <View style={[styles.detailLetterBadge, { backgroundColor: colors.warning }]}>
                      <Icon name="time-outline" size={14} color={colors.white} />
                    </View>
                    <Text style={[styles.detailSectionTitle, { color: colors.warning }]}>Follow-up</Text>
                  </View>
                  {showDetail.follow_up_date && (
                    <View style={styles.detailInfoRow}>
                      <Text style={styles.detailLabel}>Follow-up Date:</Text>
                      <Text style={styles.detailValue}>{formatDate(showDetail.follow_up_date)}</Text>
                    </View>
                  )}
                  {showDetail.follow_up_notes && (
                    <Text style={styles.detailContentText}>{showDetail.follow_up_notes}</Text>
                  )}
                </Card>
              )}

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(showDetail)}
              >
                <Icon name="trash-outline" size={18} color={colors.error} />
                <Text style={styles.deleteButtonText}>Delete Note</Text>
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
  notesList: {
    gap: SIZES.sm,
  },
  // Note card
  noteCard: {
    marginBottom: 0,
  },
  noteCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  noteDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  noteDateText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  noteCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  followUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
    gap: 4,
  },
  followUpBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
  },
  noteAssessmentPreview: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: SIZES.xs,
    marginBottom: SIZES.sm,
    lineHeight: 20,
  },
  noteCardFooter: {
    flexDirection: 'row',
    gap: SIZES.xs,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  soapMiniBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soapMiniText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
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
  formSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  formLetterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formLetterText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.white,
  },
  formSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
  },
  followUpSectionTitle: {
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
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
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
  detailSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
    gap: SIZES.sm,
  },
  detailLetterBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLetterText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: colors.white,
  },
  detailSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
  },
  detailContentText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    lineHeight: 22,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
    marginTop: SIZES.xs,
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