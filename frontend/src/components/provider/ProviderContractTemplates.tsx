// Shared Contract Templates Screen for Doula and Midwife
// Uses config-based customization for role-specific behavior

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';

interface ContractTemplate {
  template_id: string;
  template_name: string;
  template_type: string;
  description?: string;
  is_default: boolean;
  template_data: {
    total_fee?: number;
    retainer_amount?: number;
    services_included?: string[];
    terms_and_conditions?: string;
    prenatal_visit_description?: string;
    on_call_window_description?: string;
    postpartum_visit_description?: string;
    [key: string]: any;
  };
  created_at: string;
}

interface ProviderContractTemplatesProps {
  config: ProviderConfig;
}

export default function ProviderContractTemplates({ config }: ProviderContractTemplatesProps) {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  const primaryColor = config.primaryColor;
  const templateType = config.role.toLowerCase();
  const roleLabel = config.roleLabel;

  // Form state
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [retainerAmount, setRetainerAmount] = useState('');
  const [servicesIncluded, setServicesIncluded] = useState('');
  const [prenatalVisit, setPrenatalVisit] = useState('');
  const [onCallWindow, setOnCallWindow] = useState('');
  const [postpartumVisit, setPostpartumVisit] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const fetchTemplates = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.CONTRACT_TEMPLATES);
      // Filter by role
      const filtered = data.filter((t: ContractTemplate) => t.template_type === templateType);
      setTemplates(filtered);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setTemplateName('');
    setDescription('');
    setTotalFee('');
    setRetainerAmount('');
    setServicesIncluded('');
    setPrenatalVisit('');
    setOnCallWindow('');
    setPostpartumVisit('');
    setTermsAndConditions('');
    setIsDefault(false);
    setEditingTemplate(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setTemplateName(template.template_name);
    setDescription(template.description || '');
    setTotalFee(template.template_data.total_fee?.toString() || '');
    setRetainerAmount(template.template_data.retainer_amount?.toString() || '');
    setServicesIncluded(template.template_data.services_included?.join('\n') || '');
    setPrenatalVisit(template.template_data.prenatal_visit_description || '');
    setOnCallWindow(template.template_data.on_call_window_description || '');
    setPostpartumVisit(template.template_data.postpartum_visit_description || '');
    setTermsAndConditions(template.template_data.terms_and_conditions || '');
    setIsDefault(template.is_default);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert('Required', 'Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        template_name: templateName.trim(),
        template_type: templateType,
        description: description.trim() || null,
        is_default: isDefault,
        total_fee: totalFee ? parseFloat(totalFee) : null,
        retainer_amount: retainerAmount ? parseFloat(retainerAmount) : null,
        services_included: servicesIncluded.trim() ? servicesIncluded.split('\n').filter(s => s.trim()) : null,
        prenatal_visit_description: prenatalVisit.trim() || null,
        on_call_window_description: onCallWindow.trim() || null,
        postpartum_visit_description: postpartumVisit.trim() || null,
        terms_and_conditions: termsAndConditions.trim() || null,
      };

      if (editingTemplate) {
        await apiRequest(`${API_ENDPOINTS.CONTRACT_TEMPLATES}/${editingTemplate.template_id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest(API_ENDPOINTS.CONTRACT_TEMPLATES, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      resetForm();
      fetchTemplates();
      Alert.alert('Success', editingTemplate ? 'Template updated' : 'Template created');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      await apiRequest(`${API_ENDPOINTS.CONTRACT_TEMPLATES}/${templateId}/set-default`, {
        method: 'POST',
      });
      fetchTemplates();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to set default');
    }
  };

  const handleDelete = (template: ContractTemplate) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.template_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.CONTRACT_TEMPLATES}/${template.template_id}`, {
                method: 'DELETE',
              });
              fetchTemplates();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete template');
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTemplates();
  };

  const renderTemplateCard = (template: ContractTemplate) => (
    <View key={template.template_id} style={styles.templateCard} data-testid={`template-${template.template_id}`}>
      <View style={styles.templateHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.templateName}>{template.template_name}</Text>
          {template.description && (
            <Text style={styles.templateDescription}>{template.description}</Text>
          )}
        </View>
        {template.is_default && (
          <View style={[styles.defaultBadge, { backgroundColor: primaryColor }]}>
            <Ionicons name="star" size={12} color="#fff" />
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>

      {template.template_data.total_fee && (
        <Text style={styles.templateFee}>
          Fee: ${template.template_data.total_fee.toFixed(2)}
          {template.template_data.retainer_amount && (
            <Text style={styles.templateRetainer}> (${template.template_data.retainer_amount.toFixed(2)} retainer)</Text>
          )}
        </Text>
      )}

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: primaryColor }]}
          onPress={() => openEditModal(template)}
        >
          <Ionicons name="pencil" size={16} color={primaryColor} />
          <Text style={[styles.actionBtnText, { color: primaryColor }]}>Edit</Text>
        </TouchableOpacity>

        {!template.is_default && (
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: primaryColor }]}
            onPress={() => handleSetDefault(template.template_id)}
          >
            <Ionicons name="star-outline" size={16} color={primaryColor} />
            <Text style={[styles.actionBtnText, { color: primaryColor }]}>Set Default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: COLORS.error }]}
          onPress={() => handleDelete(template)}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="contract-templates-screen">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contract Templates</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={openCreateModal}
          data-testid="add-template-btn"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
      >
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptyText}>
              Create reusable templates to quickly generate {roleLabel.toLowerCase()} contracts with pre-filled terms and fees.
            </Text>
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: primaryColor }]}
              onPress={openCreateModal}
            >
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.createBtnText}>Create First Template</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map(renderTemplateCard)
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Template Name *</Text>
              <TextInput
                style={styles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="e.g., Standard Package"
                placeholderTextColor={COLORS.textLight}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description of this template"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={2}
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Total Fee ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={totalFee}
                    onChangeText={setTotalFee}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Retainer ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={retainerAmount}
                    onChangeText={setRetainerAmount}
                    placeholder="0.00"
                    placeholderTextColor={COLORS.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Services Included (one per line)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={servicesIncluded}
                onChangeText={setServicesIncluded}
                placeholder="e.g.
Prenatal visits
Labor support
Postpartum visit"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Prenatal Visits</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={prenatalVisit}
                onChangeText={setPrenatalVisit}
                placeholder="Description of prenatal visits"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>On-Call Window</Text>
              <TextInput
                style={styles.input}
                value={onCallWindow}
                onChangeText={setOnCallWindow}
                placeholder="e.g., 38 to 42 weeks"
                placeholderTextColor={COLORS.textLight}
              />

              <Text style={styles.inputLabel}>Postpartum Support</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={postpartumVisit}
                onChangeText={setPostpartumVisit}
                placeholder="Description of postpartum visits"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>Terms & Conditions</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={termsAndConditions}
                onChangeText={setTermsAndConditions}
                placeholder="Additional terms and conditions"
                placeholderTextColor={COLORS.textLight}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsDefault(!isDefault)}
              >
                <View style={[styles.checkbox, isDefault && { backgroundColor: primaryColor, borderColor: primaryColor }]}>
                  {isDefault && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default template</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: primaryColor }, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingTemplate ? 'Update' : 'Create'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: SIZES.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    gap: SIZES.sm,
  },
  createBtnText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  templateCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginBottom: SIZES.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  templateName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  templateDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSm,
    gap: 4,
  },
  defaultBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  templateFee: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  templateRetainer: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.body,
  },
  templateActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    marginTop: SIZES.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  modalBody: {
    padding: SIZES.lg,
    maxHeight: 450,
  },
  inputLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  halfInput: {
    flex: 1,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.lg,
    gap: SIZES.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.md,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelBtn: {
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
  },
  cancelBtnText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
});
