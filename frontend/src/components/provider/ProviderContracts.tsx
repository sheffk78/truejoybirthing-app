// Shared Contracts Screen for Doula and Midwife
// Uses config-based customization for role-specific sections and defaults

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../utils/api';
import useAuthStore from '../../store/authStore';
import { useRouter } from 'expo-router';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ContractsConfig, ContractSection } from './config/contractsConfig';

interface Contract {
  contract_id: string;
  client_id: string;
  client_name: string;
  status: string;
  total_fee: number;
  created_at: string;
  signed_at?: string;
  [key: string]: any;
}

interface Client {
  client_id: string;
  name: string;
  linked_mom_id?: string;
  edd?: string;
}

interface Template {
  template_id: string;
  template_name: string;
  is_default?: boolean;
  template_data: Record<string, any>;
}

interface ProviderContractsProps {
  config: ContractsConfig;
}

export default function ProviderContracts({ config }: ProviderContractsProps) {
  const { user, backendUrl } = useAuthStore();
  const router = useRouter();
  
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isQuickEditMode, setIsQuickEditMode] = useState(false);
  const [quickEditData, setQuickEditData] = useState<Record<string, any>>({});

  const primaryColor = config.primaryColor;
  const sections = config.sections;
  const defaultValues = config.defaultValues;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsRes, clientsRes] = await Promise.all([
        apiRequest(config.endpoints.list),
        apiRequest(config.clientsEndpoint),
      ]);
      setContracts(contractsRes || []);
      setClients(clientsRes || []);
      
      // Load templates separately
      try {
        const templatesRes = await apiRequest('/contract-templates');
        setTemplates(templatesRes || []);
      } catch (templateError) {
        console.log('Templates not available:', templateError);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.template_id === templateId);
    if (template?.template_data) {
      const data = template.template_data;
      setFormData(prev => ({
        ...defaultValues,
        ...prev,
        ...data,
        total_fee: data.total_fee?.toString() || prev.total_fee || '',
        retainer_amount: data.retainer_amount?.toString() || prev.retainer_amount || '',
      }));
    }
  };

  const openCreateModal = async () => {
    try {
      const savedDefaults = await apiRequest(config.endpoints.defaults);
      setFormData({ ...defaultValues, ...savedDefaults });
    } catch {
      setFormData({ ...defaultValues });
    }
    
    setSelectedClientId('');
    setSelectedTemplateId('');
    setCurrentSection(0);
    setShowCreateModal(true);
  };

  const updateFormField = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const calculateRemainingBalance = () => {
    const total = parseFloat(formData.total_fee) || 0;
    const retainer = parseFloat(formData.retainer_amount) || 0;
    return (total - retainer).toFixed(2);
  };

  const validateCurrentSection = () => {
    const section = sections[currentSection];
    for (const field of section.fields) {
      if (field.required && !formData[field.id]) {
        Alert.alert('Required Field', `Please fill in ${field.label}`);
        return false;
      }
    }
    return true;
  };

  const goToNextSection = () => {
    if (validateCurrentSection()) {
      if (currentSection < sections.length - 1) {
        setCurrentSection(currentSection + 1);
      }
    }
  };

  const goToPreviousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
    }
  };

  const handleCreateContract = async () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    if (!validateCurrentSection()) return;

    setSubmitting(true);
    try {
      const payload = {
        client_id: selectedClientId,
        ...formData,
        total_fee: parseFloat(formData.total_fee) || 0,
        retainer_amount: parseFloat(formData.retainer_amount) || 0,
      };

      await apiRequest(config.endpoints.create, {
        method: 'POST',
        body: payload,
      });

      Alert.alert('Success', `${config.roleLabel} Service Agreement created!`);
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendContract = async (contract: Contract) => {
    Alert.alert(
      'Send Contract',
      `Send this agreement to ${contract.client_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await apiRequest(config.endpoints.send(contract.contract_id), {
                method: 'POST',
              });
              Alert.alert('Success', 'Contract sent to client for signature!');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send contract');
            }
          },
        },
      ]
    );
  };

  const handleDuplicateContract = async (contract: Contract) => {
    try {
      await apiRequest(config.endpoints.duplicate(contract.contract_id), {
        method: 'POST',
      });
      Alert.alert('Success', 'Contract duplicated! Select a client and edit as needed.');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to duplicate contract');
    }
  };

  const handleDeleteContract = async (contract: Contract) => {
    if (contract.status !== 'Draft') {
      Alert.alert('Cannot Delete', 'Only draft contracts can be deleted.');
      return;
    }

    Alert.alert(
      'Delete Contract',
      'Are you sure you want to delete this draft contract?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(config.endpoints.delete(contract.contract_id), {
                method: 'DELETE',
              });
              Alert.alert('Success', 'Contract deleted');
              loadData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete contract');
            }
          },
        },
      ]
    );
  };

  const handleViewPDF = async (contract: Contract) => {
    const pdfUrl = config.endpoints.pdf(contract.contract_id, backendUrl || '');
    if (Platform.OS === 'web') {
      window.open(pdfUrl, '_blank');
    } else {
      Linking.openURL(pdfUrl);
    }
  };

  const openPreviewModal = (contract: Contract) => {
    setSelectedContract(contract);
    setIsQuickEditMode(false);
    setQuickEditData({});
    setShowPreviewModal(true);
  };

  const handleQuickEditSave = async () => {
    if (!selectedContract) return;

    setSubmitting(true);
    try {
      await apiRequest(config.endpoints.update(selectedContract.contract_id), {
        method: 'PUT',
        body: quickEditData,
      });
      Alert.alert('Success', 'Contract updated!');
      setIsQuickEditMode(false);
      setShowPreviewModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update contract');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return COLORS.textSecondary;
      case 'Sent': return COLORS.warning;
      case 'Signed': return COLORS.success;
      default: return COLORS.textSecondary;
    }
  };

  const renderField = (field: any) => {
    const value = formData[field.id] || '';
    
    return (
      <View key={field.id} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {field.label} {field.required && '*'}
        </Text>
        
        {field.type === 'textarea' ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={value}
            onChangeText={(text) => updateFormField(field.id, text)}
            placeholder={field.placeholder}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={4}
          />
        ) : field.type === 'date' ? (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => updateFormField(field.id, text)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textLight}
          />
        ) : field.type === 'number' ? (
          <TextInput
            style={styles.input}
            value={value.toString()}
            onChangeText={(text) => updateFormField(field.id, text)}
            placeholder={field.placeholder}
            placeholderTextColor={COLORS.textLight}
            keyboardType="numeric"
          />
        ) : (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={(text) => updateFormField(field.id, text)}
            placeholder={field.placeholder}
            placeholderTextColor={COLORS.textLight}
          />
        )}
      </View>
    );
  };

  const renderContractCard = (contract: Contract) => (
    <TouchableOpacity
      key={contract.contract_id}
      style={styles.contractCard}
      onPress={() => openPreviewModal(contract)}
      data-testid={`contract-card-${contract.contract_id}`}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clientName}>{contract.client_name}</Text>
          <Text style={styles.contractDate}>
            Created: {new Date(contract.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
            {contract.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <Text style={styles.feeText}>
          Total: ${contract.total_fee?.toFixed(2) || '0.00'}
        </Text>
        {contract.signed_at && (
          <Text style={styles.signedDate}>
            Signed: {new Date(contract.signed_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      <View style={styles.cardActions}>
        {contract.status === 'Draft' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: primaryColor }]}
              onPress={() => handleSendContract(contract)}
            >
              <Ionicons name="send" size={16} color="#fff" />
              <Text style={styles.actionButtonText}>Send</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonOutline]}
              onPress={() => handleDeleteContract(contract)}
            >
              <Ionicons name="trash-outline" size={16} color={COLORS.error} />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={() => handleDuplicateContract(contract)}
        >
          <Ionicons name="copy-outline" size={16} color={primaryColor} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonOutline]}
          onPress={() => handleViewPDF(contract)}
        >
          <Ionicons name="document-outline" size={16} color={primaryColor} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
    <SafeAreaView style={styles.container} edges={['top']} data-testid="provider-contracts-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.roleLabel} Contracts</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={openCreateModal}
          data-testid="add-contract-btn"
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {contracts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Contracts Yet</Text>
            <Text style={styles.emptyText}>
              Create your first {config.roleLabel} Service Agreement to get started
            </Text>
          </View>
        ) : (
          contracts.map(renderContractCard)
        )}
      </ScrollView>

      {/* Create Contract Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Service Agreement</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {sections.map((section, index) => (
                <View key={section.id} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    index <= currentSection && { backgroundColor: primaryColor }
                  ]}>
                    {index < currentSection ? (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    ) : (
                      <Text style={[
                        styles.progressNumber,
                        index <= currentSection && styles.progressNumberActive
                      ]}>{index + 1}</Text>
                    )}
                  </View>
                  {index < sections.length - 1 && (
                    <View style={[
                      styles.progressLine,
                      index < currentSection && { backgroundColor: primaryColor }
                    ]} />
                  )}
                </View>
              ))}
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Template Selection */}
              {currentSection === 0 && templates.length > 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Start from Template (optional)</Text>
                  <View style={styles.templateGrid}>
                    <TouchableOpacity
                      style={[
                        styles.templateOption,
                        selectedTemplateId === '' && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }
                      ]}
                      onPress={() => {
                        setSelectedTemplateId('');
                        setFormData({ ...defaultValues });
                      }}
                    >
                      <Ionicons name="document-outline" size={16} color={selectedTemplateId === '' ? primaryColor : COLORS.textSecondary} />
                      <Text style={[
                        styles.templateOptionText,
                        selectedTemplateId === '' && { color: primaryColor }
                      ]}>From Scratch</Text>
                    </TouchableOpacity>
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.template_id}
                        style={[
                          styles.templateOption,
                          selectedTemplateId === template.template_id && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }
                        ]}
                        onPress={() => {
                          setSelectedTemplateId(template.template_id);
                          applyTemplate(template.template_id);
                        }}
                      >
                        <Ionicons name="copy-outline" size={16} color={selectedTemplateId === template.template_id ? primaryColor : COLORS.textSecondary} />
                        <Text style={[
                          styles.templateOptionText,
                          selectedTemplateId === template.template_id && { color: primaryColor }
                        ]}>{template.template_name}</Text>
                        {template.is_default && (
                          <View style={[styles.defaultLabel, { backgroundColor: primaryColor }]}>
                            <Text style={styles.defaultLabelText}>Default</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Client Selection */}
              {currentSection === 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Select Client *</Text>
                  <View style={styles.clientGrid}>
                    {clients.filter(c => c.linked_mom_id).map((client) => (
                      <TouchableOpacity
                        key={client.client_id}
                        style={[
                          styles.clientOption,
                          selectedClientId === client.client_id && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }
                        ]}
                        onPress={() => {
                          setSelectedClientId(client.client_id);
                          updateFormField('client_name', client.name);
                          if (client.edd) {
                            updateFormField('estimated_due_date', client.edd);
                          }
                        }}
                      >
                        <Text style={[
                          styles.clientOptionText,
                          selectedClientId === client.client_id && { color: primaryColor }
                        ]}>{client.name}</Text>
                        {client.edd && (
                          <Text style={styles.clientDueDate}>Due: {client.edd}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {clients.filter(c => c.linked_mom_id).length === 0 && (
                    <Text style={styles.noClientsText}>
                      No active clients. Clients will appear here when Moms connect with you.
                    </Text>
                  )}
                </View>
              )}

              {/* Section header */}
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={sections[currentSection].icon as any} 
                  size={24} 
                  color={primaryColor} 
                />
                <Text style={styles.sectionTitle}>
                  {sections[currentSection].title}
                </Text>
              </View>

              {/* Section fields */}
              {sections[currentSection].fields.map(renderField)}

              {/* Show remaining balance after fees section */}
              {sections[currentSection].id === 'fees_payment' && (
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>Remaining Balance:</Text>
                  <Text style={styles.balanceValue}>${calculateRemainingBalance()}</Text>
                </View>
              )}
            </ScrollView>

            {/* Navigation buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.navButton, currentSection === 0 && styles.navButtonDisabled]}
                onPress={goToPreviousSection}
                disabled={currentSection === 0}
              >
                <Ionicons name="arrow-back" size={20} color={currentSection === 0 ? COLORS.border : primaryColor} />
                <Text style={[styles.navButtonText, currentSection === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {currentSection === sections.length - 1 ? (
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: primaryColor }, submitting && styles.submitButtonDisabled]}
                  onPress={handleCreateContract}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>Create Contract</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.navButton} onPress={goToNextSection}>
                  <Text style={[styles.navButtonText, { color: primaryColor }]}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color={primaryColor} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPreviewModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Contract Details</Text>
              {selectedContract?.status === 'Draft' && !isQuickEditMode && (
                <TouchableOpacity onPress={() => {
                  setIsQuickEditMode(true);
                  setQuickEditData({ ...selectedContract });
                }}>
                  <Ionicons name="pencil" size={24} color={primaryColor} />
                </TouchableOpacity>
              )}
              {isQuickEditMode && (
                <TouchableOpacity onPress={handleQuickEditSave} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color={primaryColor} />
                  ) : (
                    <Ionicons name="checkmark" size={24} color={primaryColor} />
                  )}
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedContract && (
                <View>
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Client</Text>
                    <Text style={styles.previewValue}>{selectedContract.client_name}</Text>
                  </View>
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Status</Text>
                    <Text style={[styles.previewValue, { color: getStatusColor(selectedContract.status) }]}>
                      {selectedContract.status}
                    </Text>
                  </View>
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Total Fee</Text>
                    {isQuickEditMode ? (
                      <TextInput
                        style={styles.quickEditInput}
                        value={quickEditData.total_fee?.toString() || ''}
                        onChangeText={(text) => setQuickEditData(prev => ({ ...prev, total_fee: text }))}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.previewValue}>${selectedContract.total_fee?.toFixed(2)}</Text>
                    )}
                  </View>
                  <View style={styles.previewSection}>
                    <Text style={styles.previewLabel}>Retainer</Text>
                    {isQuickEditMode ? (
                      <TextInput
                        style={styles.quickEditInput}
                        value={quickEditData.retainer_amount?.toString() || ''}
                        onChangeText={(text) => setQuickEditData(prev => ({ ...prev, retainer_amount: text }))}
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.previewValue}>${selectedContract.retainer_amount?.toFixed(2)}</Text>
                    )}
                  </View>
                  {selectedContract.estimated_due_date && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Due Date</Text>
                      <Text style={styles.previewValue}>{selectedContract.estimated_due_date}</Text>
                    </View>
                  )}
                  {selectedContract.signed_at && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewLabel}>Signed</Text>
                      <Text style={styles.previewValue}>
                        {new Date(selectedContract.signed_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonOutline, { flex: 1, marginRight: 8 }]}
                onPress={() => selectedContract && handleViewPDF(selectedContract)}
              >
                <Ionicons name="document-outline" size={20} color={primaryColor} />
                <Text style={[styles.actionButtonText, { color: primaryColor }]}>View PDF</Text>
              </TouchableOpacity>
              {selectedContract?.status === 'Draft' && (
                <TouchableOpacity
                  style={[styles.submitButton, { flex: 1, backgroundColor: primaryColor }]}
                  onPress={() => {
                    setShowPreviewModal(false);
                    handleSendContract(selectedContract);
                  }}
                >
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitButtonText}>Send</Text>
                </TouchableOpacity>
              )}
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
  backButton: {
    padding: SIZES.xs,
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
  },
  contractCard: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  contractDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  statusText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  cardDetails: {
    marginBottom: SIZES.sm,
  },
  feeText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  signedDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.success,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    marginTop: SIZES.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    gap: SIZES.xs,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.white,
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
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
  },
  progressNumberActive: {
    color: COLORS.white,
  },
  progressLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.border,
  },
  modalBody: {
    padding: SIZES.lg,
    maxHeight: 400,
  },
  fieldContainer: {
    marginBottom: SIZES.lg,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
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
    height: 100,
    textAlignVertical: 'top',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SIZES.xs,
  },
  templateOptionText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  defaultLabel: {
    paddingHorizontal: SIZES.xs,
    paddingVertical: 2,
    borderRadius: SIZES.radiusXs,
  },
  defaultLabelText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  clientGrid: {
    gap: SIZES.sm,
  },
  clientOption: {
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  clientOptionText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  clientDueDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  noClientsText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  balanceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.md,
  },
  balanceLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  balanceValue: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.success,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  navButtonTextDisabled: {
    color: COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  previewSection: {
    marginBottom: SIZES.md,
  },
  previewLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  previewValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  quickEditInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
  },
});
