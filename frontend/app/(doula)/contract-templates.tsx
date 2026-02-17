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
import { useAuthStore } from '../../src/store/authStore';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';

const COLORS = {
  primary: '#7c3aed',
  roleDoula: '#9333ea',
  background: '#faf8f5',
  card: '#ffffff',
  text: '#1f2937',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
};

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

export default function DoulaContractTemplatesScreen() {
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [saving, setSaving] = useState(false);

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
      setTemplates(data);
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
        template_type: 'doula',
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.roleDoula} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contract Templates</Text>
        <TouchableOpacity style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTemplates(); }} />
        }
      >
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Templates Yet</Text>
            <Text style={styles.emptyText}>
              Create reusable templates to quickly generate contracts with pre-filled terms and fees.
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Template</Text>
            </TouchableOpacity>
          </View>
        ) : (
          templates.map((template) => (
            <View key={template.template_id} style={styles.templateCard}>
              <View style={styles.templateHeader}>
                <View style={styles.templateTitleRow}>
                  <Text style={styles.templateName}>{template.template_name}</Text>
                  {template.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>DEFAULT</Text>
                    </View>
                  )}
                </View>
                {template.description && (
                  <Text style={styles.templateDescription}>{template.description}</Text>
                )}
              </View>

              <View style={styles.templateDetails}>
                {template.template_data.total_fee && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Fee:</Text>
                    <Text style={styles.detailValue}>${template.template_data.total_fee.toLocaleString()}</Text>
                  </View>
                )}
                {template.template_data.retainer_amount && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Retainer:</Text>
                    <Text style={styles.detailValue}>${template.template_data.retainer_amount.toLocaleString()}</Text>
                  </View>
                )}
                {template.template_data.services_included && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Services:</Text>
                    <Text style={styles.detailValue}>{template.template_data.services_included.length} items</Text>
                  </View>
                )}
              </View>

              <View style={styles.templateActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(template)}>
                  <Ionicons name="create-outline" size={18} color={COLORS.roleDoula} />
                  <Text style={[styles.actionBtnText, { color: COLORS.roleDoula }]}>Edit</Text>
                </TouchableOpacity>
                {!template.is_default && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetDefault(template.template_id)}>
                    <Ionicons name="star-outline" size={18} color={COLORS.warning} />
                    <Text style={[styles.actionBtnText, { color: COLORS.warning }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(template)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTemplate ? 'Edit Template' : 'Create Template'}
              </Text>
              <TouchableOpacity onPress={() => { setShowModal(false); resetForm(); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Template Name *</Text>
              <TextInput
                style={styles.input}
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="e.g., Standard Birth Doula Package"
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description of this template"
              />

              <View style={styles.row}>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Total Fee ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={totalFee}
                    onChangeText={setTotalFee}
                    placeholder="2000"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.halfInput}>
                  <Text style={styles.inputLabel}>Retainer ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={retainerAmount}
                    onChangeText={setRetainerAmount}
                    placeholder="500"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Services Included (one per line)</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={servicesIncluded}
                onChangeText={setServicesIncluded}
                placeholder="Prenatal visits&#10;Birth support&#10;Postpartum visit"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Prenatal Visit Description</Text>
              <TextInput
                style={styles.input}
                value={prenatalVisit}
                onChangeText={setPrenatalVisit}
                placeholder="e.g., Two 1-hour prenatal visits"
              />

              <Text style={styles.inputLabel}>On-Call Window</Text>
              <TextInput
                style={styles.input}
                value={onCallWindow}
                onChangeText={setOnCallWindow}
                placeholder="e.g., 2 weeks before to 2 weeks after due date"
              />

              <Text style={styles.inputLabel}>Postpartum Visit Description</Text>
              <TextInput
                style={styles.input}
                value={postpartumVisit}
                onChangeText={setPostpartumVisit}
                placeholder="e.g., One 2-hour postpartum visit"
              />

              <Text style={styles.inputLabel}>Terms & Conditions</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={termsAndConditions}
                onChangeText={setTermsAndConditions}
                placeholder="Standard contract terms..."
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setIsDefault(!isDefault)}
              >
                <Ionicons
                  name={isDefault ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={COLORS.roleDoula}
                />
                <Text style={styles.defaultToggleText}>Set as default template</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </Text>
                )}
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  addButton: {
    backgroundColor: COLORS.roleDoula,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 16 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: 16 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleDoula,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  createButtonText: { color: '#fff', fontWeight: '600' },

  templateCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  templateHeader: { marginBottom: 12 },
  templateTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateName: { fontSize: 16, fontWeight: '600', color: COLORS.text, flex: 1 },
  defaultBadge: {
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.warning },
  templateDescription: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4 },

  templateDetails: {
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  detailLabel: { fontSize: 13, color: COLORS.textSecondary },
  detailValue: { fontSize: 13, fontWeight: '500', color: COLORS.text },

  templateActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 16,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtnText: { fontSize: 13, fontWeight: '500' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  modalBody: { padding: 16 },

  inputLabel: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  multilineInput: { minHeight: 80, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },

  defaultToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  defaultToggleText: { fontSize: 15, color: COLORS.text },

  saveButton: {
    backgroundColor: COLORS.roleDoula,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: { backgroundColor: COLORS.textSecondary },
  saveButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
