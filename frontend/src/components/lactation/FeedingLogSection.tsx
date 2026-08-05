// FeedingLogSection.tsx - Feeding Session Log for Lactation
// Tracks feeding sessions: breast/bottle/expressed/mixed, side, duration, amount, latch quality

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
interface FeedingLog {
  log_id?: string;
  client_id: string;
  feeding_date?: string;
  feeding_time?: string;
  feeding_type?: string;
  side?: string;
  duration_minutes?: number;
  amount_ml?: number;
  latch_quality?: string;
  milk_type?: string;
  notes?: string;
  created_at?: string;
}

interface FeedingLogSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const FEEDING_TYPE_OPTIONS = [
  { value: 'breast', label: 'Breast', icon: 'water' },
  { value: 'bottle', label: 'Bottle', icon: 'nutrition' },
  { value: 'expressed', label: 'Expressed', icon: 'nutrition-outline' },
  { value: 'mixed', label: 'Mixed', icon: 'swap-horizontal' },
] as const;

const SIDE_OPTIONS = [
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'both', label: 'Both' },
] as const;

const LATCH_QUALITY_OPTIONS = [
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
] as const;

const MILK_TYPE_OPTIONS = [
  { value: 'breast_milk', label: 'Breast Milk' },
  { value: 'formula', label: 'Formula' },
  { value: 'donor', label: 'Donor' },
  { value: 'mixed', label: 'Mixed' },
] as const;

// ============== MAIN COMPONENT ==============
export default function FeedingLogSection({ clientId, primaryColor, onRefresh }: FeedingLogSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  // State
  const [logs, setLogs] = useState<FeedingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetail, setShowDetail] = useState<FeedingLog | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<FeedingLog>>({});

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`${API_ENDPOINTS.LACTATION_FEEDING_LOGS}/client/${clientId}`);
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching feeding logs:', error);
      setLogs([]);
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

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr;
  };

  const resetForm = () => {
    setFormData({
      feeding_date: todayLocal(),
      feeding_type: 'breast',
    });
  };

  const getFeedingTypeIcon = (type?: string): string => {
    const option = FEEDING_TYPE_OPTIONS.find(o => o.value === type);
    return option?.icon || 'nutrition-outline';
  };

  const getFeedingTypeLabel = (type?: string): string => {
    const option = FEEDING_TYPE_OPTIONS.find(o => o.value === type);
    return option?.label || type || '';
  };

  const getSideLabel = (side?: string): string => {
    const option = SIDE_OPTIONS.find(o => o.value === side);
    return option?.label || side || '';
  };

  const getLatchQualityLabel = (quality?: string): string => {
    const option = LATCH_QUALITY_OPTIONS.find(o => o.value === quality);
    return option?.label || quality || '';
  };

  const getMilkTypeLabel = (type?: string): string => {
    const option = MILK_TYPE_OPTIONS.find(o => o.value === type);
    return option?.label || type || '';
  };

  const getLatchQualityColor = (quality?: string): string => {
    if (quality === 'good') return colors.success;
    if (quality === 'fair') return colors.warning;
    if (quality === 'poor') return colors.error;
    return colors.textSecondary;
  };

  const confirmDelete = (record: FeedingLog) => {
    const doDelete = () => {
      apiRequest(`${API_ENDPOINTS.LACTATION_FEEDING_LOGS}/${record.log_id}`, { method: 'DELETE' })
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
      if (window.confirm('Delete this feeding log record?')) {
        doDelete();
      }
    } else {
      Alert.alert('Delete Feeding Log', 'Are you sure you want to delete this feeding log record?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // ============== SAVE HANDLER ==============
  const handleSave = async () => {
    if (!formData.feeding_date) {
      if (Platform.OS === 'web') {
        window.alert('Please select a feeding date');
      } else {
        Alert.alert('Error', 'Please select a feeding date');
      }
      return;
    }
    if (!formData.feeding_type) {
      if (Platform.OS === 'web') {
        window.alert('Please select a feeding type');
      } else {
        Alert.alert('Error', 'Please select a feeding type');
      }
      return;
    }

    setSaving(true);
    try {
      const data: any = {
        client_id: clientId,
        ...formData,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes as any) : undefined,
        amount_ml: formData.amount_ml ? parseFloat(formData.amount_ml as any) : undefined,
      };

      // Remove undefined and empty values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          delete data[key];
        }
      });

      if (formData.log_id) {
        await apiRequest(`${API_ENDPOINTS.LACTATION_FEEDING_LOGS}/${formData.log_id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        await apiRequest(API_ENDPOINTS.LACTATION_FEEDING_LOGS, {
          method: 'POST',
          body: data,
        });
      }

      if (Platform.OS === 'web') {
        window.alert('Feeding log saved');
      } else {
        Alert.alert('Success', 'Feeding log saved');
      }
      setShowAddModal(false);
      resetForm();
      fetchData();
      onRefresh?.();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save feeding log'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save feeding log');
      }
    } finally {
      setSaving(false);
    }
  };

  // ============== RENDER HELPERS ==============
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
          <Text style={[styles.chipText, selectedValue === opt.value && styles.chipTextSelected]}>
            {opt.label}
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
          <Icon name="nutrition-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Feeding Log</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
          data-testid="add-feeding-log-btn"
        >
          <Icon name="add-circle" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : logs.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="nutrition-outline" size={40} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Feeding Logs</Text>
          <Text style={styles.emptyText}>No records yet. Tap + to add one.</Text>
        </Card>
      ) : (
        <View style={styles.listContainer}>
          {logs.map((record) => (
            <TouchableOpacity
              key={record.log_id}
              activeOpacity={0.8}
              onPress={() => setShowDetail(record)}
            >
              <Card style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Icon name={getFeedingTypeIcon(record.feeding_type)} size={16} color={primaryColor} />
                    <Text style={styles.cardDate}>{formatDate(record.feeding_date)}</Text>
                    {record.feeding_time && (
                      <Text style={styles.cardTime}>{formatTime(record.feeding_time)}</Text>
                    )}
                  </View>
                  <Icon name="chevron-forward" size={18} color={colors.textLight} />
                </View>

                <View style={styles.cardDetails}>
                  {/* Feeding type */}
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>Type:</Text>
                    <Text style={styles.detailChipValue}>{getFeedingTypeLabel(record.feeding_type)}</Text>
                  </View>

                  {/* Side (for breast) */}
                  {record.feeding_type === 'breast' && record.side && (
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipLabel}>Side:</Text>
                      <Text style={styles.detailChipValue}>{getSideLabel(record.side)}</Text>
                    </View>
                  )}

                  {/* Duration */}
                  {record.duration_minutes !== undefined && record.duration_minutes !== null && (
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipLabel}>Duration:</Text>
                      <Text style={styles.detailChipValue}>{record.duration_minutes} min</Text>
                    </View>
                  )}

                  {/* Amount */}
                  {record.amount_ml !== undefined && record.amount_ml !== null && (
                    <View style={styles.detailChip}>
                      <Text style={styles.detailChipLabel}>Amount:</Text>
                      <Text style={styles.detailChipValue}>{record.amount_ml} ml</Text>
                    </View>
                  )}
                </View>

                {/* Latch quality badge */}
                {record.latch_quality && (
                  <View style={styles.latchQualityRow}>
                    <Text style={styles.latchQualityLabel}>Latch:</Text>
                    <View
                      style={[
                        styles.latchQualityBadge,
                        { backgroundColor: getLatchQualityColor(record.latch_quality) + '20' },
                      ]}
                    >
                      <Text style={[styles.latchQualityText, { color: getLatchQualityColor(record.latch_quality) }]}>
                        {getLatchQualityLabel(record.latch_quality)}
                      </Text>
                    </View>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))}
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
              {formData.log_id ? 'Edit Feeding Log' : 'New Feeding Log'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Feeding Date */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Feeding Date</Text>
              {Platform.OS === 'web' ? (
                <input
                  type="date"
                  value={formData.feeding_date || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, feeding_date: e.target.value }))}
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
                  value={formData.feeding_date || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, feeding_date: text }))}
                />
              )}
            </View>

            {/* Feeding Time */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Feeding Time (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 14:30"
                placeholderTextColor={colors.textLight}
                value={formData.feeding_time || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, feeding_time: text }))}
              />
            </View>

            {/* Feeding Type */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Feeding Type</Text>
              {renderSelectorChips(
                FEEDING_TYPE_OPTIONS as unknown as { value: string; label: string }[],
                formData.feeding_type,
                (val) => setFormData(prev => ({ ...prev, feeding_type: val, side: val === 'breast' ? prev.side : undefined }))
              )}
            </View>

            {/* Side (only for breast) */}
            {formData.feeding_type === 'breast' && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Side</Text>
                {renderSelectorChips(
                  SIDE_OPTIONS as unknown as { value: string; label: string }[],
                  formData.side,
                  (val) => setFormData(prev => ({ ...prev, side: val }))
                )}
              </View>
            )}

            {/* Duration */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 20"
                placeholderTextColor={colors.textLight}
                value={formData.duration_minutes?.toString() || ''}
                onChangeText={(text) => setFormData(prev => ({ ...prev, duration_minutes: text ? parseInt(text) : undefined }))}
                keyboardType="numeric"
              />
            </View>

            {/* Amount (for bottle/expressed/mixed) */}
            {formData.feeding_type && formData.feeding_type !== 'breast' && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Amount (ml)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 60"
                  placeholderTextColor={colors.textLight}
                  value={formData.amount_ml?.toString() || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, amount_ml: text ? parseFloat(text) : undefined }))}
                  keyboardType="decimal-pad"
                />
              </View>
            )}

            {/* Latch Quality */}
            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Latch Quality</Text>
              {renderSelectorChips(
                LATCH_QUALITY_OPTIONS as unknown as { value: string; label: string }[],
                formData.latch_quality,
                (val) => setFormData(prev => ({ ...prev, latch_quality: val }))
              )}
            </View>

            {/* Milk Type (for bottle/expressed/mixed) */}
            {formData.feeding_type && formData.feeding_type !== 'breast' && (
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Milk Type</Text>
                {renderSelectorChips(
                  MILK_TYPE_OPTIONS as unknown as { value: string; label: string }[],
                  formData.milk_type,
                  (val) => setFormData(prev => ({ ...prev, milk_type: val }))
                )}
              </View>
            )}

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
              title={formData.log_id ? 'Update' : 'Save'}
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
            <Text style={styles.modalTitle}>Feeding Log</Text>
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
                <Icon name={getFeedingTypeIcon(showDetail.feeding_type)} size={20} color={primaryColor} />
                <Text style={[styles.detailDate, { color: primaryColor }]}>
                  {formatDate(showDetail.feeding_date)}
                  {showDetail.feeding_time ? ` ${formatTime(showDetail.feeding_time)}` : ''}
                </Text>
              </View>

              {/* Feeding Details */}
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Feeding Details</Text>

                {showDetail.feeding_type && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Feeding Type:</Text>
                    <Text style={styles.detailValue}>{getFeedingTypeLabel(showDetail.feeding_type)}</Text>
                  </View>
                )}
                {showDetail.feeding_type === 'breast' && showDetail.side && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Side:</Text>
                    <Text style={styles.detailValue}>{getSideLabel(showDetail.side)}</Text>
                  </View>
                )}
                {showDetail.duration_minutes !== undefined && showDetail.duration_minutes !== null && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Duration:</Text>
                    <Text style={styles.detailValue}>{showDetail.duration_minutes} minutes</Text>
                  </View>
                )}
                {showDetail.amount_ml !== undefined && showDetail.amount_ml !== null && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Amount:</Text>
                    <Text style={styles.detailValue}>{showDetail.amount_ml} ml</Text>
                  </View>
                )}
                {showDetail.latch_quality && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Latch Quality:</Text>
                    <Text style={[styles.detailValue, { color: getLatchQualityColor(showDetail.latch_quality) }]}>
                      {getLatchQualityLabel(showDetail.latch_quality)}
                    </Text>
                  </View>
                )}
                {showDetail.milk_type && (
                  <View style={styles.detailInfoRow}>
                    <Text style={styles.detailLabel}>Milk Type:</Text>
                    <Text style={styles.detailValue}>{getMilkTypeLabel(showDetail.milk_type)}</Text>
                  </View>
                )}
                {!showDetail.feeding_type && !showDetail.duration_minutes && !showDetail.amount_ml &&
                  !showDetail.latch_quality && !showDetail.milk_type && (
                    <Text style={styles.noDataText}>No feeding data recorded</Text>
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
  cardTime: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginLeft: 4,
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
  latchQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: SIZES.xs,
  },
  latchQualityLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  latchQualityBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  latchQualityText: {
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