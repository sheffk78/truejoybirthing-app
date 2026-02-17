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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../src/utils/api';
import useAuthStore from '../../src/store/authStore';
import API_ENDPOINTS from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

// Contract form sections based on the new Midwifery agreement structure
const CONTRACT_SECTIONS = [
  {
    id: 'parties_basics',
    title: 'Parties & Basic Details',
    icon: 'person-outline',
    fields: [
      { id: 'client_name', label: 'Client Name(s)', type: 'text', required: true, placeholder: 'Full name(s) of the client' },
      { id: 'partner_name', label: 'Partner/Support Person (optional)', type: 'text', placeholder: 'Name of partner or support person' },
      { id: 'estimated_due_date', label: 'Estimated Due Date', type: 'date', required: true },
    ]
  },
  {
    id: 'birth_scope',
    title: 'Place of Birth & Scope',
    icon: 'home-outline',
    fields: [
      { id: 'planned_birth_location', label: 'Planned Place of Birth', type: 'text', required: true, placeholder: 'e.g., home at [address], ABC Birth Center, XYZ Hospital' },
      { id: 'scope_description', label: 'Included Services Description', type: 'textarea', placeholder: 'Description of midwifery services included' },
    ]
  },
  {
    id: 'fees_payment',
    title: 'Fees & Payment',
    icon: 'cash-outline',
    fields: [
      { id: 'total_fee', label: 'Total Fee ($)', type: 'number', required: true, placeholder: '0.00' },
      { id: 'retainer_amount', label: 'Retainer Amount ($)', type: 'number', required: true, placeholder: '0.00' },
      { id: 'remaining_balance_due_description', label: 'Remaining Balance Due By', type: 'text', placeholder: 'e.g., 36 weeks\' gestation' },
      { id: 'fee_coverage_description', label: 'Fee Coverage Description', type: 'textarea', placeholder: 'What the fee includes' },
      { id: 'refund_policy_description', label: 'Refund Policy', type: 'textarea', placeholder: 'Terms for refunds if care ends early' },
    ]
  },
  {
    id: 'transfer_withdrawal',
    title: 'Transfer & Withdrawal',
    icon: 'swap-horizontal-outline',
    fields: [
      { id: 'transfer_indications_description', label: 'Transfer Indications', type: 'textarea', placeholder: 'When transfer to hospital/physician is recommended' },
      { id: 'client_refusal_of_transfer_note', label: 'Client Refusal of Transfer Note (optional)', type: 'textarea', placeholder: 'Additional language regarding client refusal of transfer' },
      { id: 'midwife_withdrawal_reasons', label: 'Midwife Withdrawal Reasons', type: 'textarea', placeholder: 'Reasons midwife may discontinue care' },
      { id: 'no_refund_scenarios_description', label: 'No-Refund Scenarios', type: 'textarea', placeholder: 'Situations where no refund is applicable' },
    ]
  },
  {
    id: 'oncall_backup',
    title: 'On-Call & Backup',
    icon: 'call-outline',
    fields: [
      { id: 'on_call_window_description', label: 'On-Call Window', type: 'text', placeholder: 'e.g., 37 to 42 weeks of pregnancy' },
      { id: 'backup_midwife_policy', label: 'Backup Midwife Policy', type: 'textarea', placeholder: 'Details on backup coverage and student involvement' },
    ]
  },
  {
    id: 'communication_emergencies',
    title: 'Communication & Emergencies',
    icon: 'alert-circle-outline',
    fields: [
      { id: 'contact_instructions_routine', label: 'Routine Contact Instructions', type: 'textarea', placeholder: 'How to reach midwife for routine questions' },
      { id: 'contact_instructions_urgent', label: 'Urgent Contact Instructions', type: 'textarea', placeholder: 'How to contact for concerning symptoms' },
      { id: 'emergency_instructions', label: 'Emergency Instructions', type: 'textarea', placeholder: 'When to call 911 or go directly to hospital' },
    ]
  },
  {
    id: 'special_arrangements',
    title: 'Special Arrangements',
    icon: 'document-text-outline',
    fields: [
      { id: 'special_arrangements', label: 'Special Arrangements / Addendum', type: 'textarea', placeholder: 'Any additional services, travel radius, student involvement, etc.' },
    ]
  },
];

// Default values for optional fields
const DEFAULT_VALUES = {
  partner_name: '',
  scope_description: 'Care generally includes routine prenatal visits at intervals recommended by the Midwife, availability for consultation by phone or secure message for non-emergent concerns, on-call availability around the estimated time of birth, attendance at labor and birth in the planned setting when appropriate, and postpartum follow-up visits for both the Client and baby for approximately six to eight weeks after birth.',
  remaining_balance_due_description: '36 weeks\' gestation',
  fee_coverage_description: 'This fee typically covers prenatal care within the practice, attendance at labor and birth in the planned setting, and routine postpartum and newborn care through about six to eight weeks postpartum, but does not include charges from hospitals, laboratories, imaging centers, pharmacies, or other specialists.',
  refund_policy_description: 'When care ends before the birth, the Midwife may, at their discretion, provide a partial refund after subtracting the value of services already rendered and any non-refundable retainer.',
  transfer_indications_description: 'The Midwife will recommend transfer if, in the Midwife\'s clinical judgment, complications develop that cannot be safely managed in the planned setting, such as non-reassuring fetal status, concerning bleeding, signs of infection, or certain blood pressure or labor patterns.',
  client_refusal_of_transfer_note: '',
  midwife_withdrawal_reasons: '',
  no_refund_scenarios_description: 'No refund is due when the Client refuses recommended transfer and the Midwife must withdraw, or when the Client chooses to give birth in another setting for personal reasons after the Midwife has provided extensive prenatal care.',
  on_call_window_description: '37 to 42 weeks of pregnancy',
  backup_midwife_policy: 'The Midwife will make reasonable efforts to introduce any regular back-up midwives or students in advance when possible.',
  contact_instructions_routine: 'The Midwife will provide clear instructions regarding how to reach the Midwife for routine questions.',
  contact_instructions_urgent: 'The Midwife will provide instructions on how to contact the Midwife urgently for concerning symptoms.',
  emergency_instructions: 'The Client understands when to bypass the Midwife and call emergency services or go directly to the hospital.',
  special_arrangements: 'None at this time',
};

export default function MidwifeContracts() {
  const { user } = useAuthStore();
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState({});
  const [selectedClientId, setSelectedClientId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsRes, clientsRes] = await Promise.all([
        apiRequest(API_ENDPOINTS.MIDWIFE_CONTRACTS),
        apiRequest(API_ENDPOINTS.MIDWIFE_CLIENTS),
      ]);
      setContracts(contractsRes || []);
      setClients(clientsRes || []);
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

  const openCreateModal = () => {
    // Initialize form with default values
    const initialData = { ...DEFAULT_VALUES };
    setFormData(initialData);
    setSelectedClientId('');
    setCurrentSection(0);
    setShowCreateModal(true);
  };

  const updateFormField = (fieldId, value) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const calculateRemainingBalance = () => {
    const total = parseFloat(formData.total_fee) || 0;
    const retainer = parseFloat(formData.retainer_amount) || 0;
    return (total - retainer).toFixed(2);
  };

  const validateCurrentSection = () => {
    const section = CONTRACT_SECTIONS[currentSection];
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
      if (currentSection < CONTRACT_SECTIONS.length - 1) {
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
        client_name: formData.client_name,
        partner_name: formData.partner_name || null,
        estimated_due_date: formData.estimated_due_date,
        planned_birth_location: formData.planned_birth_location,
        scope_description: formData.scope_description || DEFAULT_VALUES.scope_description,
        total_fee: parseFloat(formData.total_fee) || 0,
        retainer_amount: parseFloat(formData.retainer_amount) || 0,
        remaining_balance: parseFloat(calculateRemainingBalance()),
        remaining_balance_due_description: formData.remaining_balance_due_description || DEFAULT_VALUES.remaining_balance_due_description,
        fee_coverage_description: formData.fee_coverage_description || DEFAULT_VALUES.fee_coverage_description,
        refund_policy_description: formData.refund_policy_description || DEFAULT_VALUES.refund_policy_description,
        transfer_indications_description: formData.transfer_indications_description || DEFAULT_VALUES.transfer_indications_description,
        client_refusal_of_transfer_note: formData.client_refusal_of_transfer_note || DEFAULT_VALUES.client_refusal_of_transfer_note,
        midwife_withdrawal_reasons: formData.midwife_withdrawal_reasons || DEFAULT_VALUES.midwife_withdrawal_reasons,
        no_refund_scenarios_description: formData.no_refund_scenarios_description || DEFAULT_VALUES.no_refund_scenarios_description,
        on_call_window_description: formData.on_call_window_description || DEFAULT_VALUES.on_call_window_description,
        backup_midwife_policy: formData.backup_midwife_policy || DEFAULT_VALUES.backup_midwife_policy,
        contact_instructions_routine: formData.contact_instructions_routine || DEFAULT_VALUES.contact_instructions_routine,
        contact_instructions_urgent: formData.contact_instructions_urgent || DEFAULT_VALUES.contact_instructions_urgent,
        emergency_instructions: formData.emergency_instructions || DEFAULT_VALUES.emergency_instructions,
        special_arrangements: formData.special_arrangements || DEFAULT_VALUES.special_arrangements,
      };

      await apiRequest(API_ENDPOINTS.MIDWIFE_CONTRACTS, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      Alert.alert('Success', 'Contract created successfully!');
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating contract:', error);
      Alert.alert('Error', 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendContract = async (contractId) => {
    Alert.alert(
      'Send Contract',
      'This will sign the contract on your behalf and send it to the client for their signature. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.MIDWIFE_CONTRACTS}/${contractId}/send`, {
                method: 'POST',
              });
              Alert.alert('Success', 'Contract sent to client for signature!');
              loadData();
            } catch (error) {
              console.error('Error sending contract:', error);
              Alert.alert('Error', 'Failed to send contract');
            }
          },
        },
      ]
    );
  };

  const handleDeleteContract = async (contractId) => {
    Alert.alert(
      'Delete Contract',
      'Are you sure you want to delete this contract? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.MIDWIFE_CONTRACTS}/${contractId}`, {
                method: 'DELETE',
              });
              Alert.alert('Success', 'Contract deleted');
              loadData();
            } catch (error) {
              console.error('Error deleting contract:', error);
              Alert.alert('Error', 'Failed to delete contract');
            }
          },
        },
      ]
    );
  };

  const handleDownloadPDF = async (contractId) => {
    try {
      if (Platform.OS === 'web') {
        const token = localStorage.getItem('authToken');
        const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
        const pdfUrl = `${backendUrl}/api/midwife-contracts/${contractId}/pdf`;
        
        const response = await fetch(pdfUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to download PDF');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Midwifery_Contract_${contractId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Success', 'PDF downloaded!');
      } else {
        Alert.alert('Info', 'PDF download is available on web platform');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      Alert.alert('Error', 'Failed to download PDF');
    }
  };

  const openPreview = (contract) => {
    setSelectedContract(contract);
    setShowPreviewModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Signed': return '#4CAF50';
      case 'Sent': return '#FF9800';
      case 'Draft': return '#9E9E9E';
      default: return COLORS.textSecondary;
    }
  };

  const renderField = (field) => {
    const value = formData[field.id] || '';
    
    if (field.type === 'textarea') {
      return (
        <View key={field.id} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={value}
            onChangeText={(text) => updateFormField(field.id, text)}
            placeholder={field.placeholder}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>
      );
    }
    
    if (field.type === 'number') {
      return (
        <View key={field.id} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
          <TextInput
            style={styles.input}
            value={value.toString()}
            onChangeText={(text) => updateFormField(field.id, text)}
            placeholder={field.placeholder}
            placeholderTextColor={COLORS.textSecondary}
            keyboardType="numeric"
          />
          {(field.id === 'total_fee' || field.id === 'retainer_amount') && formData.total_fee && formData.retainer_amount && (
            <Text style={styles.calculatedText}>
              Remaining Balance: ${calculateRemainingBalance()}
            </Text>
          )}
        </View>
      );
    }
    
    if (field.type === 'date') {
      return (
        <View key={field.id} style={styles.fieldContainer}>
          <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
          {Platform.OS === 'web' ? (
            <input
              type="date"
              value={value}
              onChange={(e) => updateFormField(field.id, e.target.value)}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 8,
                fontSize: 16,
                width: '100%',
              }}
            />
          ) : (
            <TextInput
              style={styles.input}
              value={value}
              onChangeText={(text) => updateFormField(field.id, text)}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
            />
          )}
        </View>
      );
    }
    
    return (
      <View key={field.id} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>{field.label}{field.required ? ' *' : ''}</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => updateFormField(field.id, text)}
          placeholder={field.placeholder}
          placeholderTextColor={COLORS.textSecondary}
        />
      </View>
    );
  };

  const renderContractCard = (contract) => (
    <View key={contract.contract_id} style={styles.contractCard}>
      <View style={styles.contractHeader}>
        <View style={styles.contractInfo}>
          <Text style={styles.clientName}>{contract.client_name}</Text>
          <Text style={styles.contractDate}>Due: {contract.estimated_due_date}</Text>
          {contract.planned_birth_location && (
            <Text style={styles.contractDate}>Location: {contract.planned_birth_location}</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
            {contract.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.contractDetails}>
        <Text style={styles.feeText}>Total: ${contract.total_fee?.toFixed(2) || '0.00'}</Text>
        <Text style={styles.detailText}>
          Retainer: ${contract.retainer_amount?.toFixed(2) || '0.00'} | 
          Balance: ${contract.remaining_balance?.toFixed(2) || '0.00'}
        </Text>
      </View>

      <View style={styles.contractActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => openPreview(contract)}
        >
          <Ionicons name="eye-outline" size={18} color={COLORS.secondary} />
          <Text style={[styles.actionText, { color: COLORS.secondary }]}>Preview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDownloadPDF(contract.contract_id)}
        >
          <Ionicons name="download-outline" size={18} color={COLORS.secondary} />
          <Text style={[styles.actionText, { color: COLORS.secondary }]}>PDF</Text>
        </TouchableOpacity>
        
        {contract.status === 'Draft' && (
          <>
            <TouchableOpacity 
              style={[styles.actionButton, styles.sendButton]}
              onPress={() => handleSendContract(contract.contract_id)}
            >
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Send</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleDeleteContract(contract.contract_id)}
            >
              <Ionicons name="trash-outline" size={18} color="#f44336" />
            </TouchableOpacity>
          </>
        )}
        
        {contract.status === 'Signed' && (
          <View style={styles.signedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            <Text style={styles.signedText}>Fully Signed</Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contracts</Text>
        <TouchableOpacity style={styles.createButton} onPress={openCreateModal}>
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>New Contract</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {contracts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Contracts Yet</Text>
            <Text style={styles.emptyText}>
              Create your first Midwifery Services Agreement to get started
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
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Midwifery Agreement</Text>
              <View style={{ width: 24 }} />
            </View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              {CONTRACT_SECTIONS.map((section, index) => (
                <View key={section.id} style={styles.progressStep}>
                  <View style={[
                    styles.progressDot,
                    index <= currentSection && styles.progressDotActive
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
                  {index < CONTRACT_SECTIONS.length - 1 && (
                    <View style={[
                      styles.progressLine,
                      index < currentSection && styles.progressLineActive
                    ]} />
                  )}
                </View>
              ))}
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Client Selection - always visible at top */}
              {currentSection === 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Select Client *</Text>
                  <View style={styles.clientGrid}>
                    {clients.map((client) => (
                      <TouchableOpacity
                        key={client.client_id}
                        style={[
                          styles.clientOption,
                          selectedClientId === client.client_id && styles.clientOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedClientId(client.client_id);
                          updateFormField('client_name', client.name);
                        }}
                      >
                        <Text style={[
                          styles.clientOptionText,
                          selectedClientId === client.client_id && styles.clientOptionTextSelected
                        ]}>{client.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {clients.length === 0 && (
                    <Text style={styles.noClientsText}>
                      No clients found. Add a client first.
                    </Text>
                  )}
                </View>
              )}

              {/* Section header */}
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={CONTRACT_SECTIONS[currentSection].icon} 
                  size={24} 
                  color={COLORS.secondary} 
                />
                <Text style={styles.sectionTitle}>
                  {CONTRACT_SECTIONS[currentSection].title}
                </Text>
              </View>

              {/* Section fields */}
              {CONTRACT_SECTIONS[currentSection].fields.map(renderField)}
            </ScrollView>

            {/* Navigation buttons */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.navButton, currentSection === 0 && styles.navButtonDisabled]}
                onPress={goToPreviousSection}
                disabled={currentSection === 0}
              >
                <Ionicons name="arrow-back" size={20} color={currentSection === 0 ? '#ccc' : COLORS.secondary} />
                <Text style={[styles.navButtonText, currentSection === 0 && styles.navButtonTextDisabled]}>
                  Previous
                </Text>
              </TouchableOpacity>

              {currentSection === CONTRACT_SECTIONS.length - 1 ? (
                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
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
                  <Text style={styles.navButtonText}>Next</Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.secondary} />
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
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Contract Preview</Text>
              <TouchableOpacity onPress={() => selectedContract && handleDownloadPDF(selectedContract.contract_id)}>
                <Ionicons name="download-outline" size={24} color={COLORS.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.previewContent}>
              {selectedContract && (
                <>
                  <Text style={styles.previewTitle}>Midwifery Services Agreement</Text>
                  <Text style={styles.previewSubtitle}>Powered by True Joy Birthing</Text>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Parties</Text>
                    <Text style={styles.previewText}>Practice/Midwife: {selectedContract.midwife_practice_name}</Text>
                    <Text style={styles.previewText}>Client: {selectedContract.client_name}</Text>
                    {selectedContract.partner_name && (
                      <Text style={styles.previewText}>Partner: {selectedContract.partner_name}</Text>
                    )}
                    <Text style={styles.previewText}>Due Date: {selectedContract.estimated_due_date}</Text>
                    <Text style={styles.previewText}>Birth Location: {selectedContract.planned_birth_location}</Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Payment</Text>
                    <Text style={styles.previewText}>Total Fee: ${selectedContract.total_fee?.toFixed(2)}</Text>
                    <Text style={styles.previewText}>Retainer: ${selectedContract.retainer_amount?.toFixed(2)}</Text>
                    <Text style={styles.previewText}>Balance: ${selectedContract.remaining_balance?.toFixed(2)}</Text>
                    <Text style={styles.previewText}>Due: {selectedContract.remaining_balance_due_description}</Text>
                  </View>

                  {selectedContract.contract_text && (
                    <View style={styles.previewSection}>
                      <Text style={styles.previewSectionTitle}>Full Agreement</Text>
                      <Text style={styles.previewAgreementText}>
                        {selectedContract.contract_text}
                      </Text>
                    </View>
                  )}

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Signatures</Text>
                    {selectedContract.midwife_signature ? (
                      <Text style={styles.previewText}>
                        ✓ Midwife: {selectedContract.midwife_signature.signer_name} 
                        ({selectedContract.midwife_signature.signed_at?.substring(0, 10)})
                      </Text>
                    ) : (
                      <Text style={styles.previewTextPending}>○ Midwife: Pending</Text>
                    )}
                    {selectedContract.client_signature ? (
                      <Text style={styles.previewText}>
                        ✓ Client: {selectedContract.client_signature.signer_name}
                        ({selectedContract.client_signature.signed_at?.substring(0, 10)})
                      </Text>
                    ) : (
                      <Text style={styles.previewTextPending}>○ Client: Pending</Text>
                    )}
                    {selectedContract.partner_name && selectedContract.partner_name !== 'N/A' && (
                      selectedContract.partner_signature ? (
                        <Text style={styles.previewText}>
                          ✓ Partner: {selectedContract.partner_signature.signer_name}
                          ({selectedContract.partner_signature.signed_at?.substring(0, 10)})
                        </Text>
                      ) : (
                        <Text style={styles.previewTextPending}>○ Partner: Pending</Text>
                      )
                    )}
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: 8,
  },
  createButtonText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  content: { flex: 1, padding: SIZES.md },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginTop: SIZES.md },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.sm },
  contractCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  contractInfo: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  contractDate: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  contractDetails: { marginBottom: SIZES.sm },
  feeText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  detailText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  contractActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.sm,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.background,
  },
  actionText: { fontSize: 13, marginLeft: 4 },
  sendButton: { backgroundColor: COLORS.secondary },
  signedBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  signedText: { fontSize: 13, color: '#4CAF50', marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    minHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
  modalBody: { flex: 1, padding: SIZES.md },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
  },
  progressStep: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: COLORS.secondary },
  progressNumber: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  progressNumberActive: { color: '#fff' },
  progressLine: {
    width: 16,
    height: 2,
    backgroundColor: COLORS.border,
  },
  progressLineActive: { backgroundColor: COLORS.secondary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: SIZES.sm,
  },
  fieldContainer: { marginBottom: SIZES.md },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  calculatedText: {
    fontSize: 12,
    color: COLORS.secondary,
    marginTop: 4,
    fontWeight: '500',
  },
  clientGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clientOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  clientOptionSelected: {
    backgroundColor: COLORS.secondary + '20',
    borderColor: COLORS.secondary,
  },
  clientOptionText: { fontSize: 14, color: COLORS.text },
  clientOptionTextSelected: { color: COLORS.secondary, fontWeight: '600' },
  noClientsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  navButtonDisabled: { opacity: 0.5 },
  navButtonText: { fontSize: 16, color: COLORS.secondary, fontWeight: '500' },
  navButtonTextDisabled: { color: '#ccc' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    borderRadius: 8,
  },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, color: '#fff', fontWeight: '600', marginLeft: 6 },
  previewContent: { flex: 1, padding: SIZES.md },
  previewTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: SIZES.lg,
  },
  previewSection: {
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  previewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: SIZES.sm,
  },
  previewText: { fontSize: 14, color: COLORS.text, lineHeight: 20, marginBottom: 4 },
  previewTextPending: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 4 },
  previewAgreementText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 20,
    textAlign: 'justify',
  },
});
