// WeightTrackerSection.tsx - Infant Weight Tracking for Lactation
// Tracks weight entries with g/oz units, baby age, % change from birth

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
interface InfantWeight {
  weight_id?: string;
  client_id: string;
  weight_date?: string;
  weight?: number;
  weight_unit?: string;
  weight_grams?: number;
  baby_age_days?: number;
  percent_change_from_birth?: number;
  notes?: string;
  created_at?: string;
}

interface WeightTrackerSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const WEIGHT_UNITS = ['g', 'oz'] as const;

// ============== MAIN COMPONENT ==============
export default function WeightTrackerSection({ clientId, primaryColor, onRefresh }: WeightTrackerSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  // State
  const [weights, setWeights] = useState<InfantWeight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetail, setShowDetail] = useState<InfantWeight | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<InfantWeight>>({});

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`${API_ENDPOINTS.LACTATION_INFANT_WEIGHTS}/client/${clientId}`);
      setWeights(data || []);
    } catch (error: any) {
      console.error('Error fetching infant weights:', error);
      setWeights([]);
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
    setFormData({
      weight_date: todayLocal(),
      weight_unit: 'g',
    });
  };

  const getPercentChangeColor = (pct: number | undefined): string => {
    if (pct === undefined || pct === null) return colors.textSecondary;
    if (pct >= -7) return colors.success;
    if (pct >= -10) return colors.warning;
    return colors.error;
  };

  const formatPercentChange = (pct: number | undefined): string => {
    if (pct === undefined || pct === null) return '';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  };

  const confirmDelete = (record: InfantWeight) => {
    const doDelete = () => {
      apiRequest(`${API_ENDPOINTS.LACTATION_INFANT_WEIGHTS}/${record.weight_id}`, { method: 'DELETE' })
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
      if (window.confirm('Delete this weight record?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Weight Record', 'Are you sure you want to delete this weight record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    if (!formData.weight_date) {
      if (Platform.OS === 'web') {
        window.alert('Please select a weight date');
      } else {
        Alert.alert('Error', 'Please select a weight date');
      }
      return;
    }
    if (formData.weight === undefined || formData.weight === null || isNaN(Number(formData.weight))) {
      if (Platform.OS === 'web') {
        window.alert('Please enter a weight value');
      } else {
        Alert.alert('Error', 'Please enter a weight value');
      }
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        client_id: clientId,
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight as any) : undefined,
        baby_age_days: formData.baby_age_days ? parseInt(formData.baby_age_days as any) : undefined,
      };

      // Remove undefined and empty values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          delete data[key];
        }
      });

      if (formData.weight_id) {
        await apiRequest(`${API_ENDPOINTS.LACTATION_INFANT_WEIGHTS}/${formData.weight_id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        await apiRequest(API_ENDPOINTS.LACTATION_INFANT_WEIGHTS, {
          method: 'POST',
          body: data,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Weight record saved');
      } else {
        Alert.alert('Success', 'Weight record saved');
      }
      setShowAddModal(false);
      resetForm();
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save weight record'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save weight record');
      }
    } finally {
      setSaving(false);
    }
  };

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="scale-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Weight Tracker</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          data-testid="add-weight-btn"
        >
          <Icon name="add-circle" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : weights.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="scale-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Weight Records</Text>
          <Text style={styles.emptyText}>No records yet. Tap + to add one.</Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {weights.map((record) => {
            const pctColor = getPercentChangeColor(record.percent_change_from_birth);
            return (
              <TouchableOpacity
                key={record.weight_id}
                activeOpacity={0.8}
                onPress={() => setShowDetail(record)}
              >
                <Card style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardTitleRow}>
                      <Icon name="calendar-outline" size={16} color={primaryColor} />
                      <Text style={styles.cardDate}>{formatDate(record.weight_date)}</Text>
                    </View>
                    <Icon name="chevron-forward" size={18} color={colors.textLight} />
                  </View>

                  <View style={styles.cardDetails}>
                    {/* Weight */}
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipLabel}>Weight:</Text>
                      <Text style={styles.detailChipValue}>
                        {record.weight} {record.weight_unit || 'g'}
                      </Text>
                    </View>

                    {/* Weight in grams */}
                    {record.weight_grams !== undefined && record.weight_grams !== null && (
                      <View style={styles.detailChip}>
                        <Text style={styles.detailChipLabel}>Grams:</Text>
                        <Text style={styles.detailChipValue}>{record.weight_grams}g</Text>
                      </View>
                    )}

                    {/* Baby age */}
                    {record.baby_age_days !== undefined && record.baby_age_days !== null && (
                      <View style={styles.detailChip}>
                        <Text style={styles.detailChipLabel}>Age:</Text>
                        <Text style={styles.detailChipValue}>{record.baby_age_days}d</Text>
                      </View>
                    )}
                  </View>

                  {/* Percent change from birth */}
                  {record.percent_change_from_birth !== undefined && record.percent_change_from_birth !== null && (
                    <View style={styles.percentChangeRow}>
                      <Text style={styles.percentChangeLabel}>Change from birth:</Text>
                      <Text style={[styles.percentChangeValue, { color: pctColor }]}>
                        {formatPercentChange(record.percent_change_from_birth)}
                      </Text>
                    </View>
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
              {formData.weight_id ? 'Edit Weight Record' : 'New Weight Record'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Weight Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Weigh Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formData.weight_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, weight_date: e.target.value }))}
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
                  value={formData.weight_date || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, weight_date: text }))}
                />
              )}
            </View>

            {/* Weight */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Weight</Text>

              <Text style={styles.fieldLabel}>Weight Value</Text>
              <View style={styles.weightRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="e.g., 3200"
                  placeholderTextColor={colors.textLight}
                  value={formData.weight?.toString() || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, weight: text ? parseFloat(text) : undefined }))}
                  keyboardType="decimal-pad"
                />
                <View style={styles.unitToggle}>
                  {WEIGHT_UNITS.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitOption,
                        (formData.weight_unit || 'g') === unit && [styles.unitOptionSelected, { backgroundColor: primaryColor }],
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, weight_unit: unit }))}
                    >
                      <Text
                        style={[
                          styles.unitText,
                          (formData.weight_unit || 'g') === unit && styles.unitTextSelected,
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Baby Age */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Baby Age (optional)</Text>
              <Text style={styles.fieldLabel}>Age in Days</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 7"
                placeholderTextColor={colors.textLight}
                value={formData.baby_age_days?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, baby_age_days: text ? parseInt(text) : undefined }))}
                keyboardType="numeric"
              />
            </View>

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional observations or notes..."
                placeholderTextColor={colors.textLight}
                value={formData.notes || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={formData.weight_id ? 'Update' : 'Save'}
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
            <Text style={styles.modalTitle}>Weight Record</Text>
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
                  {formatDate(showDetail.weight_date)}
                </Text>
              </View>

              {/* Weight Details */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Weight Details</Text>

                {showDetail.weight !== undefined && showDetail.weight !== null && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Weight:</Text>
                    <Text style={styles.detailValue}>
                      {showDetail.weight} {showDetail.weight_unit || 'g'}
                    </Text>
                  </View>
                )}
                {showDetail.weight_grams !== undefined && showDetail.weight_grams !== null && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Weight (grams):</Text>
                    <Text style={styles.detailValue}>{showDetail.weight_grams} g</Text>
                  </View>
                )}
                {showDetail.baby_age_days !== undefined && showDetail.baby_age_days !== null && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Baby Age:</Text>
                    <Text style={styles.detailValue}>{showDetail.baby_age_days} days</Text>
                  </View>
                )}
                {showDetail.percent_change_from_birth !== undefined && showDetail.percent_change_from_birth !== null && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Change from Birth:</Text>
                    <Text style={[styles.detailValue, { color: getPercentChangeColor(showDetail.percent_change_from_birth) }]}>
                      {formatPercentChange(showDetail.percent_change_from_birth)}
                    </Text>
                  </View>
                )}
                {showDetail.weight === undefined && showDetail.weight_grams === undefined &&
                  showDetail.baby_age_days === undefined && showDetail.percent_change_from_birth === undefined && (
                    <Text style={styles.noDataText}>No weight data recorded</Text>
                  )}
              </Card>

              {/* Notes */}
              {showDetail.notes && (
                <Card style={styles.detailCard}>
                  <Text style={styles.detailCardTitle}>Notes</Text>
                  <Text style={styles.generalNotesText}>{showDetail.notes}</Text>
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
    marginBottom: SIZES.xs,
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
  cardDetails: {
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
  percentChangeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: SIZES.xs,
  },
  percentChangeLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  percentChangeValue: {
    fontSize: SIZES.fontSm,
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
    backgroundColor: colors.surface,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: colors.surface,
  },
  unitOptionSelected: {
    // backgroundColor set inline
  },
  unitText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  unitTextSelected: {
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