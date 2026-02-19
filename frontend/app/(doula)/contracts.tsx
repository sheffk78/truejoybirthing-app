import React, { useEffect, useState, useRef } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../src/utils/api';
import useAuthStore from '../../src/store/authStore';
import API_ENDPOINTS from '../../src/constants/api';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../src/constants/theme';

// Contract form sections based on the new agreement structure
const CONTRACT_SECTIONS = [
  {
    id: 'parties_basics',
    title: 'Parties & Basic Details',
    icon: 'person-outline',
    fields: [
      { id: 'client_name', label: 'Client Name(s)', type: 'text', required: true, placeholder: 'Full name(s) of the birthing parent and partner' },
      { id: 'estimated_due_date', label: 'Estimated Due Date', type: 'date', required: true },
      { id: 'total_fee', label: 'Total Fee ($)', type: 'number', required: true, placeholder: '0.00' },
      { id: 'retainer_amount', label: 'Retainer Amount ($)', type: 'number', required: true, placeholder: '0.00' },
    ]
  },
  {
    id: 'services_scope',
    title: 'Services & Scope',
    icon: 'clipboard-outline',
    fields: [
      { id: 'prenatal_visit_description', label: 'Prenatal Visits', type: 'textarea', placeholder: 'e.g., Three prenatal visits of 60-90 minutes each to discuss preferences, birth plan, and support' },
      { id: 'on_call_window_description', label: 'On-Call Window', type: 'text', placeholder: 'e.g., 38 to 42 weeks' },
      { id: 'on_call_response_description', label: 'Response Expectations', type: 'textarea', placeholder: 'e.g., Respond to non-urgent messages within 24 hours...' },
      { id: 'backup_doula_preferences', label: 'Backup Doula Preferences', type: 'textarea', placeholder: 'Any preferences or limits on backup doula use' },
      { id: 'postpartum_visit_description', label: 'Postpartum Support', type: 'textarea', placeholder: 'e.g., Two in-home visits within the first two weeks after birth' },
    ]
  },
  {
    id: 'boundaries_communication',
    title: 'Boundaries & Communication',
    icon: 'chatbubble-outline',
    fields: [
      { id: 'speak_for_client_exception', label: 'Exception for Speaking on Client\'s Behalf', type: 'textarea', placeholder: 'Leave blank for standard language ("None"), or specify any agreed exceptions' },
    ]
  },
  {
    id: 'payment_refunds',
    title: 'Payment & Refunds',
    icon: 'card-outline',
    fields: [
      { id: 'retainer_non_refundable_after_weeks', label: 'Retainer Non-Refundable After (weeks)', type: 'number', placeholder: '37' },
      { id: 'cancellation_weeks_threshold', label: 'Cancellation Threshold (weeks)', type: 'number', placeholder: '37' },
      { id: 'final_payment_due_detail', label: 'Final Payment Due Detail', type: 'text', placeholder: 'e.g., Day after birth' },
      { id: 'cesarean_alternative_support_description', label: 'Cesarean Alternative Support', type: 'textarea', placeholder: 'e.g., Two postpartum sessions if Doula does not attend cesarean birth' },
    ]
  },
  {
    id: 'unavailability_circumstances',
    title: 'Unavailability & Special Circumstances',
    icon: 'alert-circle-outline',
    fields: [
      { id: 'unreachable_timeframe_description', label: 'Unreachable Timeframe', type: 'text', placeholder: 'e.g., Within two hours after notification at onset of labor' },
      { id: 'unreachable_remedy_description', label: 'Remedy if Unreachable', type: 'textarea', placeholder: 'e.g., Contract may be void and payments refunded' },
      { id: 'precipitous_labor_definition', label: 'Precipitous Labor Definition', type: 'text', placeholder: 'e.g., Less than two hours from first call' },
      { id: 'precipitous_labor_compensation_description', label: 'Rapid Birth Compensation', type: 'textarea', placeholder: 'e.g., Four extra postpartum hours at no cost' },
      { id: 'other_absence_policy', label: 'Other Absence Policy', type: 'textarea', placeholder: 'How other absences are handled' },
    ]
  },
  {
    id: 'addendum',
    title: 'Addendum / Special Arrangements',
    icon: 'document-text-outline',
    fields: [
      { id: 'special_arrangements', label: 'Special Arrangements', type: 'textarea', placeholder: 'Any additional boundaries, services, or exceptions specific to this agreement' },
    ]
  },
];

// Default values for optional fields
const DEFAULT_VALUES = {
  prenatal_visit_description: 'Three prenatal visits to discuss preferences, birth plan, and support roles',
  on_call_window_description: '38 to 42 weeks',
  on_call_response_description: 'Respond to non-urgent messages within 24 hours and as promptly as possible while on call',
  backup_doula_preferences: 'A backup doula may be introduced prior to labor in case coverage is needed',
  postpartum_visit_description: 'One or two in-home visits within the first two weeks after birth',
  speak_for_client_exception: 'None - the Doula will not speak on the Client\'s behalf to staff',
  retainer_non_refundable_after_weeks: 37,
  cancellation_weeks_threshold: 37,
  final_payment_due_detail: 'Day after birth',
  cesarean_alternative_support_description: 'Two postpartum sessions even if Doula does not attend the birth',
  unreachable_timeframe_description: 'Within two hours after notification at onset of labor',
  unreachable_remedy_description: 'The contract may be considered void and payments may be refunded',
  precipitous_labor_definition: 'Less than two hours from first call',
  precipitous_labor_compensation_description: 'Four extra postpartum hours at no cost as a gesture of goodwill',
  other_absence_policy: 'Reviewed case-by-case, any refund or waiver at the Doula\'s discretion',
  special_arrangements: 'None at this time',
  final_payment_due_description: 'Day after birth',
};

export default function DoulaContracts() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [formData, setFormData] = useState({});
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isQuickEditMode, setIsQuickEditMode] = useState(false);
  const [quickEditData, setQuickEditData] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [contractsRes, clientsRes] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_CONTRACTS),
        apiRequest(API_ENDPOINTS.DOULA_CLIENTS),
      ]);
      setContracts(contractsRes || []);
      setClients(clientsRes || []);
      
      // Load templates separately to prevent failure from blocking main data
      try {
        const templatesRes = await apiRequest(API_ENDPOINTS.CONTRACT_TEMPLATES);
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
    if (template && template.template_data) {
      const data = template.template_data;
      setFormData(prev => ({
        ...DEFAULT_VALUES,
        ...prev,
        total_fee: data.total_fee?.toString() || prev.total_fee || '',
        retainer_amount: data.retainer_amount?.toString() || prev.retainer_amount || '',
        prenatal_visit_description: data.prenatal_visit_description || prev.prenatal_visit_description || DEFAULT_VALUES.prenatal_visit_description,
        on_call_window_description: data.on_call_window_description || prev.on_call_window_description || DEFAULT_VALUES.on_call_window_description,
        on_call_response_description: data.on_call_response_description || prev.on_call_response_description || DEFAULT_VALUES.on_call_response_description,
        backup_doula_preferences: data.backup_doula_preferences || prev.backup_doula_preferences || DEFAULT_VALUES.backup_doula_preferences,
        postpartum_visit_description: data.postpartum_visit_description || prev.postpartum_visit_description || DEFAULT_VALUES.postpartum_visit_description,
        retainer_non_refundable_after_weeks: data.retainer_non_refundable_after_weeks?.toString() || prev.retainer_non_refundable_after_weeks?.toString() || DEFAULT_VALUES.retainer_non_refundable_after_weeks.toString(),
        cancellation_weeks_threshold: data.cancellation_weeks_threshold?.toString() || prev.cancellation_weeks_threshold?.toString() || DEFAULT_VALUES.cancellation_weeks_threshold.toString(),
        cesarean_alternative_support_description: data.cesarean_alternative_support_description || prev.cesarean_alternative_support_description || DEFAULT_VALUES.cesarean_alternative_support_description,
        terms_and_conditions: data.terms_and_conditions || prev.terms_and_conditions || '',
      }));
    }
  };

  const openCreateModal = async () => {
    // Load saved defaults first
    try {
      const savedDefaults = await apiRequest('/doula/contract-defaults');
      const initialData = { ...DEFAULT_VALUES, ...savedDefaults };
      setFormData(initialData);
    } catch (error) {
      setFormData({ ...DEFAULT_VALUES });
    }
    
    setSelectedClientId('');
    setSelectedTemplateId('');
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
        estimated_due_date: formData.estimated_due_date,
        total_fee: parseFloat(formData.total_fee) || 0,
        retainer_amount: parseFloat(formData.retainer_amount) || 0,
        remaining_balance: parseFloat(calculateRemainingBalance()),
        final_payment_due_description: formData.final_payment_due_detail || DEFAULT_VALUES.final_payment_due_detail,
        prenatal_visit_description: formData.prenatal_visit_description || DEFAULT_VALUES.prenatal_visit_description,
        on_call_window_description: formData.on_call_window_description || DEFAULT_VALUES.on_call_window_description,
        on_call_response_description: formData.on_call_response_description || DEFAULT_VALUES.on_call_response_description,
        backup_doula_preferences: formData.backup_doula_preferences || DEFAULT_VALUES.backup_doula_preferences,
        postpartum_visit_description: formData.postpartum_visit_description || DEFAULT_VALUES.postpartum_visit_description,
        speak_for_client_exception: formData.speak_for_client_exception || DEFAULT_VALUES.speak_for_client_exception,
        retainer_non_refundable_after_weeks: parseInt(formData.retainer_non_refundable_after_weeks) || DEFAULT_VALUES.retainer_non_refundable_after_weeks,
        cancellation_weeks_threshold: parseInt(formData.cancellation_weeks_threshold) || DEFAULT_VALUES.cancellation_weeks_threshold,
        final_payment_due_detail: formData.final_payment_due_detail || DEFAULT_VALUES.final_payment_due_detail,
        cesarean_alternative_support_description: formData.cesarean_alternative_support_description || DEFAULT_VALUES.cesarean_alternative_support_description,
        unreachable_timeframe_description: formData.unreachable_timeframe_description || DEFAULT_VALUES.unreachable_timeframe_description,
        unreachable_remedy_description: formData.unreachable_remedy_description || DEFAULT_VALUES.unreachable_remedy_description,
        precipitous_labor_definition: formData.precipitous_labor_definition || DEFAULT_VALUES.precipitous_labor_definition,
        precipitous_labor_compensation_description: formData.precipitous_labor_compensation_description || DEFAULT_VALUES.precipitous_labor_compensation_description,
        other_absence_policy: formData.other_absence_policy || DEFAULT_VALUES.other_absence_policy,
        special_arrangements: formData.special_arrangements || DEFAULT_VALUES.special_arrangements,
      };

      await apiRequest(API_ENDPOINTS.DOULA_CONTRACTS, {
        method: 'POST',
        body: payload,  // Don't stringify - apiRequest handles it
      });
      
      // Save the current form data as "last used" preferences
      await saveLastUsedDefaults(payload);

      Alert.alert('Success', 'Contract created successfully!');
      setShowCreateModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating contract:', error);
      Alert.alert('Error', error.message || 'Failed to create contract');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Save the last used contract values as user preferences
  const saveLastUsedDefaults = async (data: any) => {
    try {
      await apiRequest('/doula/contract-defaults', {
        method: 'PUT',
        body: {
          total_fee: data.total_fee,
          retainer_amount: data.retainer_amount,
          prenatal_visit_description: data.prenatal_visit_description,
          on_call_window_description: data.on_call_window_description,
          on_call_response_description: data.on_call_response_description,
          backup_doula_preferences: data.backup_doula_preferences,
          postpartum_visit_description: data.postpartum_visit_description,
          retainer_non_refundable_after_weeks: data.retainer_non_refundable_after_weeks,
          cancellation_weeks_threshold: data.cancellation_weeks_threshold,
          cesarean_alternative_support_description: data.cesarean_alternative_support_description,
          final_payment_due_description: data.final_payment_due_description,
        },
      });
    } catch (error) {
      console.log('Could not save contract defaults:', error);
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
              await apiRequest(`${API_ENDPOINTS.DOULA_CONTRACTS}/${contractId}/send`, {
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
              await apiRequest(`${API_ENDPOINTS.DOULA_CONTRACTS}/${contractId}`, {
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

  const handleDuplicateContract = async (contractId) => {
    Alert.alert(
      'Duplicate Contract',
      'This will create a new draft contract with the same settings. You will need to select a client for the new contract.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Duplicate',
          onPress: async () => {
            try {
              const response = await apiRequest(`${API_ENDPOINTS.DOULA_CONTRACTS}/${contractId}/duplicate`, {
                method: 'POST',
              });
              Alert.alert('Success', 'Contract duplicated! Open the new draft to select a client and finalize.');
              loadData();
            } catch (error) {
              console.error('Error duplicating contract:', error);
              Alert.alert('Error', 'Failed to duplicate contract');
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
        const pdfUrl = `${backendUrl}/api/contracts/${contractId}/pdf`;
        
        const response = await fetch(pdfUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to download PDF');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Doula_Contract_${contractId}.pdf`;
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
    setIsQuickEditMode(false);
    setQuickEditData({});
    setShowPreviewModal(true);
  };

  const startQuickEdit = () => {
    if (selectedContract) {
      setQuickEditData({
        client_name: selectedContract.client_name || '',
        estimated_due_date: selectedContract.estimated_due_date || '',
        total_fee: selectedContract.total_fee?.toString() || '0',
        retainer_amount: selectedContract.retainer_amount?.toString() || '0',
        final_payment_due_description: selectedContract.final_payment_due_description || '',
        prenatal_visit_description: selectedContract.prenatal_visit_description || '',
        on_call_window_description: selectedContract.on_call_window_description || '',
        postpartum_visit_description: selectedContract.postpartum_visit_description || '',
        special_arrangements: selectedContract.special_arrangements || '',
      });
      setIsQuickEditMode(true);
    }
  };

  const cancelQuickEdit = () => {
    setIsQuickEditMode(false);
    setQuickEditData({});
  };

  const saveQuickEdit = async () => {
    if (!selectedContract) return;
    
    setSubmitting(true);
    try {
      const total = parseFloat(quickEditData.total_fee) || 0;
      const retainer = parseFloat(quickEditData.retainer_amount) || 0;
      
      const updateData = {
        client_name: quickEditData.client_name,
        estimated_due_date: quickEditData.estimated_due_date,
        total_fee: total,
        retainer_amount: retainer,
        remaining_balance: total - retainer,
        final_payment_due_description: quickEditData.final_payment_due_description,
        prenatal_visit_description: quickEditData.prenatal_visit_description,
        on_call_window_description: quickEditData.on_call_window_description,
        postpartum_visit_description: quickEditData.postpartum_visit_description,
        special_arrangements: quickEditData.special_arrangements,
      };
      
      await apiRequest(`${API_ENDPOINTS.DOULA_CONTRACTS}/${selectedContract.contract_id}`, {
        method: 'PUT',
        body: updateData,
      });
      
      Alert.alert('Success', 'Contract updated successfully');
      setIsQuickEditMode(false);
      setShowPreviewModal(false);
      loadData();
    } catch (error) {
      console.error('Error updating contract:', error);
      Alert.alert('Error', 'Failed to update contract');
    } finally {
      setSubmitting(false);
    }
  };

  const updateQuickEditField = (field, value) => {
    setQuickEditData(prev => ({ ...prev, [field]: value }));
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
          <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionText}>Preview</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDownloadPDF(contract.contract_id)}
        >
          <Ionicons name="download-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionText}>PDF</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleDuplicateContract(contract.contract_id)}
        >
          <Ionicons name="copy-outline" size={18} color={COLORS.primary} />
          <Text style={styles.actionText}>Duplicate</Text>
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
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeHeader} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Contracts</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.createButton} onPress={openCreateModal} data-testid="new-contract-btn">
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {contracts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Contracts Yet</Text>
            <Text style={styles.emptyText}>
              Create your first Doula Service Agreement to get started
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
              <Text style={styles.modalTitle}>New Service Agreement</Text>
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
              {/* Template Selection - always visible at top */}
              {currentSection === 0 && templates.length > 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Start from Template (optional)</Text>
                  <View style={styles.templateGrid}>
                    <TouchableOpacity
                      style={[
                        styles.templateOption,
                        selectedTemplateId === '' && styles.templateOptionSelected
                      ]}
                      onPress={() => {
                        setSelectedTemplateId('');
                        setFormData({ ...DEFAULT_VALUES });
                      }}
                      data-testid="template-option-none"
                    >
                      <Ionicons name="document-outline" size={16} color={selectedTemplateId === '' ? COLORS.primary : COLORS.textSecondary} />
                      <Text style={[
                        styles.templateOptionText,
                        selectedTemplateId === '' && styles.templateOptionTextSelected
                      ]}>From Scratch</Text>
                    </TouchableOpacity>
                    {templates.map((template) => (
                      <TouchableOpacity
                        key={template.template_id}
                        style={[
                          styles.templateOption,
                          selectedTemplateId === template.template_id && styles.templateOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedTemplateId(template.template_id);
                          applyTemplate(template.template_id);
                        }}
                        data-testid={`template-option-${template.template_id}`}
                      >
                        <Ionicons name="copy-outline" size={16} color={selectedTemplateId === template.template_id ? COLORS.primary : COLORS.textSecondary} />
                        <Text style={[
                          styles.templateOptionText,
                          selectedTemplateId === template.template_id && styles.templateOptionTextSelected
                        ]}>{template.template_name}</Text>
                        {template.is_default && (
                          <View style={styles.defaultLabel}>
                            <Text style={styles.defaultLabelText}>Default</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Client Selection - always visible at top */}
              {currentSection === 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Select Client *</Text>
                  <View style={styles.clientGrid}>
                    {clients.filter(c => c.linked_mom_id).map((client) => (
                      <TouchableOpacity
                        key={client.client_id}
                        style={[
                          styles.clientOption,
                          selectedClientId === client.client_id && styles.clientOptionSelected
                        ]}
                        onPress={() => {
                          setSelectedClientId(client.client_id);
                          updateFormField('client_name', client.name);
                          // Auto-fill due date if available
                          if (client.edd) {
                            updateFormField('estimated_due_date', client.edd);
                          }
                        }}
                        data-testid={`client-option-${client.client_id}`}
                      >
                        <Text style={[
                          styles.clientOptionText,
                          selectedClientId === client.client_id && styles.clientOptionTextSelected
                        ]}>{client.name}</Text>
                        {client.edd && (
                          <Text style={styles.clientDueDate}>Due: {client.edd}</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                  {clients.filter(c => c.linked_mom_id).length === 0 && (
                    <Text style={styles.noClientsText}>
                      No active clients. Clients will appear here when Moms connect with you from the Marketplace.
                    </Text>
                  )}
                </View>
              )}

              {/* Section header */}
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={CONTRACT_SECTIONS[currentSection].icon} 
                  size={24} 
                  color={COLORS.primary} 
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
                <Ionicons name="arrow-back" size={20} color={currentSection === 0 ? '#ccc' : COLORS.primary} />
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
                  <Ionicons name="arrow-forward" size={20} color={COLORS.primary} />
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
              <TouchableOpacity onPress={() => { setShowPreviewModal(false); setIsQuickEditMode(false); }}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {isQuickEditMode ? 'Quick Edit' : 'Contract Preview'}
              </Text>
              {!isQuickEditMode ? (
                <TouchableOpacity onPress={() => selectedContract && handleDownloadPDF(selectedContract.contract_id)}>
                  <Ionicons name="download-outline" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 24 }} />
              )}
            </View>

            <ScrollView style={styles.previewContent}>
              {selectedContract && !isQuickEditMode && (
                <>
                  <Text style={styles.previewTitle}>Doula Service Agreement</Text>
                  <Text style={styles.previewSubtitle}>Powered by True Joy Birthing</Text>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Parties</Text>
                    <Text style={styles.previewText}>Client: {selectedContract.client_name}</Text>
                    <Text style={styles.previewText}>Doula: {selectedContract.doula_name}</Text>
                    <Text style={styles.previewText}>Due Date: {selectedContract.estimated_due_date}</Text>
                  </View>

                  <View style={styles.previewSection}>
                    <Text style={styles.previewSectionTitle}>Payment</Text>
                    <Text style={styles.previewText}>Total Fee: ${selectedContract.total_fee?.toFixed(2)}</Text>
                    <Text style={styles.previewText}>Retainer: ${selectedContract.retainer_amount?.toFixed(2)}</Text>
                    <Text style={styles.previewText}>Balance: ${selectedContract.remaining_balance?.toFixed(2)}</Text>
                    <Text style={styles.previewText}>Due: {selectedContract.final_payment_due_description}</Text>
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
                    {selectedContract.doula_signature ? (
                      <Text style={styles.previewText}>
                        ✓ Doula: {selectedContract.doula_signature.signer_name} 
                        ({selectedContract.doula_signature.signed_at?.substring(0, 10)})
                      </Text>
                    ) : (
                      <Text style={styles.previewTextPending}>○ Doula: Pending</Text>
                    )}
                    {selectedContract.client_signature ? (
                      <Text style={styles.previewText}>
                        ✓ Client: {selectedContract.client_signature.signer_name}
                        ({selectedContract.client_signature.signed_at?.substring(0, 10)})
                      </Text>
                    ) : (
                      <Text style={styles.previewTextPending}>○ Client: Pending</Text>
                    )}
                  </View>

                  {/* Edit button for Draft contracts */}
                  {selectedContract.status === 'Draft' && (
                    <TouchableOpacity style={styles.quickEditButton} onPress={startQuickEdit}>
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.quickEditButtonText}>Quick Edit</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* Quick Edit Form */}
              {isQuickEditMode && (
                <>
                  <View style={styles.quickEditSection}>
                    <Text style={styles.quickEditSectionTitle}>Client Details</Text>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Client Name</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.client_name}
                        onChangeText={(text) => updateQuickEditField('client_name', text)}
                        placeholder="Client name"
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Due Date</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.estimated_due_date}
                        onChangeText={(text) => updateQuickEditField('estimated_due_date', text)}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.quickEditSection}>
                    <Text style={styles.quickEditSectionTitle}>Payment Details</Text>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Total Fee ($)</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.total_fee}
                        onChangeText={(text) => updateQuickEditField('total_fee', text)}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Retainer Amount ($)</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.retainer_amount}
                        onChangeText={(text) => updateQuickEditField('retainer_amount', text)}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Remaining Balance</Text>
                      <Text style={styles.calculatedField}>
                        ${((parseFloat(quickEditData.total_fee) || 0) - (parseFloat(quickEditData.retainer_amount) || 0)).toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Final Payment Due</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.final_payment_due_description}
                        onChangeText={(text) => updateQuickEditField('final_payment_due_description', text)}
                        placeholder="e.g., Day after birth"
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>
                  </View>

                  <View style={styles.quickEditSection}>
                    <Text style={styles.quickEditSectionTitle}>Services</Text>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Prenatal Visits</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.prenatal_visit_description}
                        onChangeText={(text) => updateQuickEditField('prenatal_visit_description', text)}
                        placeholder="Description of prenatal visits"
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>On-Call Window</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.on_call_window_description}
                        onChangeText={(text) => updateQuickEditField('on_call_window_description', text)}
                        placeholder="e.g., 38-42 weeks"
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Postpartum Visits</Text>
                      <TextInput
                        style={styles.input}
                        value={quickEditData.postpartum_visit_description}
                        onChangeText={(text) => updateQuickEditField('postpartum_visit_description', text)}
                        placeholder="Description of postpartum visits"
                        placeholderTextColor={COLORS.textSecondary}
                      />
                    </View>
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Special Arrangements</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={quickEditData.special_arrangements}
                        onChangeText={(text) => updateQuickEditField('special_arrangements', text)}
                        placeholder="Any additional terms or arrangements"
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        numberOfLines={3}
                      />
                    </View>
                  </View>

                  {/* Action buttons */}
                  <View style={styles.quickEditActions}>
                    <TouchableOpacity style={styles.cancelButton} onPress={cancelQuickEdit}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.saveButton, submitting && styles.saveButtonDisabled]} 
                      onPress={saveQuickEdit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={20} color="#fff" />
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </>
                      )}
                    </TouchableOpacity>
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
  safeHeader: {
    backgroundColor: COLORS.white,
  },
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
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templatesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.roleDoula + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.roleDoula,
  },
  templatesButtonText: { color: COLORS.roleDoula, fontWeight: '500', marginLeft: 4, fontSize: 13 },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
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
  actionText: { fontSize: 13, color: COLORS.primary, marginLeft: 4 },
  sendButton: { backgroundColor: COLORS.primary },
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
  progressDotActive: { backgroundColor: COLORS.primary },
  progressNumber: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '600' },
  progressNumberActive: { color: '#fff' },
  progressLine: {
    width: 20,
    height: 2,
    backgroundColor: COLORS.border,
  },
  progressLineActive: { backgroundColor: COLORS.primary },
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
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  templateGrid: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  templateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 8,
  },
  templateOptionSelected: {
    backgroundColor: COLORS.primary + '15',
    borderColor: COLORS.primary,
  },
  templateOptionText: { fontSize: 14, color: COLORS.text, flex: 1 },
  templateOptionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  defaultLabel: {
    backgroundColor: COLORS.roleDoula + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultLabelText: { fontSize: 10, fontWeight: '600', color: COLORS.roleDoula },
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
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  clientOptionText: { fontSize: 14, color: COLORS.text },
  clientOptionTextSelected: { color: COLORS.primary, fontWeight: '600' },
  clientDueDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
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
  navButtonText: { fontSize: 16, color: COLORS.primary, fontWeight: '500' },
  navButtonTextDisabled: { color: '#ccc' },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
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
    color: COLORS.primary,
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
    color: COLORS.primary,
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
  // Quick Edit Styles
  quickEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderRadius: 8,
    marginTop: SIZES.lg,
  },
  quickEditButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  quickEditSection: {
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quickEditSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.md,
  },
  calculatedField: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    paddingVertical: SIZES.sm,
  },
  quickEditActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SIZES.md,
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
