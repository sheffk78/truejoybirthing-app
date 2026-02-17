import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Draft': COLORS.textLight,
  'Sent': COLORS.warning,
  'Pending Signature': COLORS.warning,
  'Signed': COLORS.success,
};

const BIRTH_PLACE_OPTIONS = [
  'Home Birth',
  'Birth Center',
  'Hospital',
  'Not yet decided',
];

interface ContractTemplate {
  title: string;
  sections: Array<{
    id: string;
    title: string;
    content?: string;
    editable?: boolean;
  }>;
}

export default function MidwifeContractsScreen() {
  const router = useRouter();
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Form state for new contract
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [plannedBirthPlace, setPlannedBirthPlace] = useState('');
  const [onCallStartWeek, setOnCallStartWeek] = useState('37');
  const [onCallEndWeek, setOnCallEndWeek] = useState('42');
  const [totalFee, setTotalFee] = useState('');
  const [deposit, setDeposit] = useState('');
  const [balanceDueWeek, setBalanceDueWeek] = useState('36');
  const [practiceName, setPracticeName] = useState('');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [showBirthPlacePicker, setShowBirthPlacePicker] = useState(false);
  
  const fetchData = useCallback(async () => {
    try {
      const [contractsData, clientsData, templateData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MIDWIFE_CONTRACTS),
        apiRequest(API_ENDPOINTS.MIDWIFE_CLIENTS),
        apiRequest('/api/midwife/contract-template'),
      ]);
      setContracts(contractsData || []);
      setClients(clientsData || []);
      setTemplate(templateData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setSelectedClientId('');
    setClientName('');
    setPartnerName('');
    setEstimatedDueDate('');
    setPlannedBirthPlace('');
    setOnCallStartWeek('37');
    setOnCallEndWeek('42');
    setTotalFee('');
    setDeposit('');
    setBalanceDueWeek('36');
    setPracticeName('');
    setAdditionalTerms('');
    setShowClientPicker(false);
    setShowBirthPlacePicker(false);
  };
  
  const handleCreateContract = async () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    if (!clientName.trim()) {
      Alert.alert('Error', 'Please enter client name');
      return;
    }
    if (!plannedBirthPlace) {
      Alert.alert('Error', 'Please select planned birth place');
      return;
    }
    if (!totalFee || isNaN(parseFloat(totalFee))) {
      Alert.alert('Error', 'Please enter a valid total fee');
      return;
    }
    if (!deposit || isNaN(parseFloat(deposit))) {
      Alert.alert('Error', 'Please enter a valid deposit amount');
      return;
    }
    
    setSaving(true);
    try {
      const newContract = await apiRequest(API_ENDPOINTS.MIDWIFE_CONTRACTS, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          client_name: clientName.trim(),
          partner_name: partnerName.trim() || null,
          estimated_due_date: estimatedDueDate,
          planned_birth_place: plannedBirthPlace,
          on_call_start_week: onCallStartWeek,
          on_call_end_week: onCallEndWeek,
          total_fee: parseFloat(totalFee),
          deposit: parseFloat(deposit),
          balance_due_week: balanceDueWeek,
          practice_name: practiceName.trim() || null,
          additional_terms: additionalTerms.trim() || null,
        },
      });
      
      setContracts([newContract, ...contracts]);
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Contract created! You can now review and send it to your client.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSendContract = async (contract: any) => {
    Alert.alert(
      'Send Contract',
      `Send this Midwifery Services Agreement to ${contract.client_name}? They will receive an email with a link to review and sign.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const result = await apiRequest(`/api/midwife/contracts/${contract.contract_id}/send`, {
                method: 'POST',
              });
              
              setContracts(contracts.map(c =>
                c.contract_id === contract.contract_id
                  ? { ...c, status: 'Sent' }
                  : c
              ));
              
              Alert.alert(
                'Contract Sent',
                result.email_sent
                  ? 'The contract has been sent to the client via email.'
                  : 'The contract is ready for signing. Share the signing link with your client.'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send contract');
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const selectedClient = clients.find(c => c.client_id === selectedClientId);
  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contracts</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          data-testid="create-contract-btn"
        >
          <Icon name="add-circle" size={28} color={COLORS.accent} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {contracts.length === 0 ? (
          <View style={styles.emptyState} data-testid="empty-contracts-state">
            <Icon name="document-text-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Contracts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first Midwifery Services Agreement
            </Text>
            <Button
              title="Create Contract"
              onPress={() => setModalVisible(true)}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.contract_id} style={styles.contractCard} data-testid={`contract-card-${contract.contract_id}`}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedContract(contract);
                  setViewModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.contractHeader}>
                  <View style={styles.contractInfo}>
                    <Text style={styles.contractTitle}>Midwifery Services Agreement</Text>
                    <Text style={styles.clientName}>{contract.client_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[contract.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[contract.status] }]}>
                      {contract.status}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.contractDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(contract.estimated_due_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Birth Place:</Text>
                    <Text style={styles.detailValue}>{contract.planned_birth_place}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Fee:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(contract.total_fee || 0)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Deposit:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(contract.deposit || 0)}</Text>
                  </View>
                </View>
                
                {contract.status === 'Signed' && contract.client_signature && (
                  <View style={styles.signedInfo}>
                    <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.signedText}>
                      Signed by {contract.client_signature.signer_name} on {formatDate(contract.client_signature.signed_at)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
              
              {contract.status === 'Draft' && (
                <View style={styles.actionButtons}>
                  <Button
                    title="Send to Client"
                    onPress={() => handleSendContract(contract)}
                    loading={sending}
                    fullWidth
                    data-testid={`send-contract-btn-${contract.contract_id}`}
                  />
                </View>
              )}
            </Card>
          ))
        )}
      </ScrollView>
      
      {/* Create Contract Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Service Agreement</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.templateInfo}>
              This contract uses the Midwifery Services Agreement template with all standard terms and conditions for midwifery care.
            </Text>
            
            {/* Client Selection */}
            <Text style={styles.inputLabel}>Select Client *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowClientPicker(!showClientPicker)}
              data-testid="select-client-dropdown"
            >
              <Text style={selectedClient ? styles.selectText : styles.selectPlaceholder}>
                {selectedClient?.name || 'Choose a client'}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            {showClientPicker && (
              <View style={styles.pickerContainer}>
                {clients.length === 0 ? (
                  <Text style={styles.noClientsText}>No clients available. Add a client first.</Text>
                ) : (
                  clients.map(client => (
                    <TouchableOpacity
                      key={client.client_id}
                      style={[
                        styles.pickerItem,
                        selectedClientId === client.client_id && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setSelectedClientId(client.client_id);
                        setClientName(client.name);
                        if (client.edd) setEstimatedDueDate(client.edd);
                        if (client.planned_birth_setting) setPlannedBirthPlace(client.planned_birth_setting);
                        setShowClientPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{client.name}</Text>
                      {selectedClientId === client.client_id && (
                        <Icon name="checkmark" size={20} color={COLORS.accent} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            
            <Text style={styles.sectionTitle}>Client & Care Details</Text>
            
            <Input
              label="Client Name *"
              placeholder="Full name as it appears on the agreement"
              value={clientName}
              onChangeText={setClientName}
              leftIcon="person"
            />
            
            <Input
              label="Partner/Support Person Name"
              placeholder="Optional"
              value={partnerName}
              onChangeText={setPartnerName}
              leftIcon="people"
            />
            
            <Input
              label="Estimated Due Date"
              placeholder="YYYY-MM-DD"
              value={estimatedDueDate}
              onChangeText={setEstimatedDueDate}
              leftIcon="calendar"
            />
            
            {/* Birth Place Selection */}
            <Text style={styles.inputLabel}>Planned Birth Location *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBirthPlacePicker(!showBirthPlacePicker)}
              data-testid="select-birth-place-dropdown"
            >
              <Text style={plannedBirthPlace ? styles.selectText : styles.selectPlaceholder}>
                {plannedBirthPlace || 'Select birth location'}
              </Text>
              <Icon name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
            
            {showBirthPlacePicker && (
              <View style={styles.pickerContainer}>
                {BIRTH_PLACE_OPTIONS.map(place => (
                  <TouchableOpacity
                    key={place}
                    style={[
                      styles.pickerItem,
                      plannedBirthPlace === place && styles.pickerItemSelected,
                    ]}
                    onPress={() => {
                      setPlannedBirthPlace(place);
                      setShowBirthPlacePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{place}</Text>
                    {plannedBirthPlace === place && (
                      <Icon name="checkmark" size={20} color={COLORS.accent} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            <Text style={styles.sectionTitle}>On-Call Period</Text>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Input
                  label="Start Week"
                  placeholder="37"
                  value={onCallStartWeek}
                  onChangeText={setOnCallStartWeek}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.halfInput}>
                <Input
                  label="End Week"
                  placeholder="42"
                  value={onCallEndWeek}
                  onChangeText={setOnCallEndWeek}
                  keyboardType="number-pad"
                />
              </View>
            </View>
            
            <Text style={styles.sectionTitle}>Payment Details</Text>
            
            <Input
              label="Total Fee *"
              placeholder="e.g., 5000"
              value={totalFee}
              onChangeText={setTotalFee}
              keyboardType="decimal-pad"
              leftIcon="cash"
            />
            
            <Input
              label="Non-Refundable Deposit *"
              placeholder="e.g., 1500"
              value={deposit}
              onChangeText={setDeposit}
              keyboardType="decimal-pad"
              leftIcon="wallet"
            />
            
            {totalFee && deposit && (
              <View style={styles.calculatedField}>
                <Text style={styles.calculatedLabel}>Remaining Balance:</Text>
                <Text style={styles.calculatedValue}>
                  {formatCurrency(parseFloat(totalFee || '0') - parseFloat(deposit || '0'))}
                </Text>
              </View>
            )}
            
            <Input
              label="Balance Due By (Week)"
              placeholder="36"
              value={balanceDueWeek}
              onChangeText={setBalanceDueWeek}
              keyboardType="number-pad"
              leftIcon="time"
            />
            
            <Text style={styles.sectionTitle}>Practice Information</Text>
            
            <Input
              label="Practice Name (Optional)"
              placeholder="Your practice or business name"
              value={practiceName}
              onChangeText={setPracticeName}
              leftIcon="business"
            />
            
            <Text style={styles.sectionTitle}>Additional Terms (Optional)</Text>
            <Text style={styles.helperText}>
              Add any special arrangements, notes, or additional terms specific to this client.
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Enter any additional terms or special arrangements..."
              placeholderTextColor={COLORS.textLight}
              value={additionalTerms}
              onChangeText={setAdditionalTerms}
              multiline
              numberOfLines={4}
            />
            
            <View style={styles.templatePreview}>
              <Text style={styles.templatePreviewTitle}>Contract Includes:</Text>
              {template?.sections.map(section => (
                <View key={section.id} style={styles.templateSection}>
                  <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                  <Text style={styles.templateSectionText}>{section.title}</Text>
                </View>
              ))}
            </View>
            
            <Button
              title="Create Contract"
              onPress={handleCreateContract}
              loading={saving}
              fullWidth
              style={styles.createButton}
              data-testid="submit-create-contract-btn"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* View Contract Modal */}
      <Modal
        visible={viewModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setViewModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Contract Details</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {selectedContract && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.viewHeader}>
                <Text style={styles.viewTitle}>Midwifery Services Agreement</Text>
                {selectedContract.practice_name && (
                  <Text style={styles.viewSubtitle}>{selectedContract.practice_name}</Text>
                )}
                <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[selectedContract.status] + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: STATUS_COLORS[selectedContract.status] }]}>
                    {selectedContract.status}
                  </Text>
                </View>
              </View>
              
              <Card style={styles.viewCard}>
                <Text style={styles.viewSectionTitle}>Client & Care Details</Text>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Client Name:</Text>
                  <Text style={styles.viewValue}>{selectedContract.client_name}</Text>
                </View>
                {selectedContract.partner_name && (
                  <View style={styles.viewRow}>
                    <Text style={styles.viewLabel}>Partner:</Text>
                    <Text style={styles.viewValue}>{selectedContract.partner_name}</Text>
                  </View>
                )}
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Estimated Due Date:</Text>
                  <Text style={styles.viewValue}>{formatDate(selectedContract.estimated_due_date)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Birth Location:</Text>
                  <Text style={styles.viewValue}>{selectedContract.planned_birth_place}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>On-Call Period:</Text>
                  <Text style={styles.viewValue}>{selectedContract.on_call_start_week} - {selectedContract.on_call_end_week} weeks</Text>
                </View>
              </Card>
              
              <Card style={styles.viewCard}>
                <Text style={styles.viewSectionTitle}>Payment Details</Text>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Total Fee:</Text>
                  <Text style={styles.viewValue}>{formatCurrency(selectedContract.total_fee)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Deposit:</Text>
                  <Text style={styles.viewValue}>{formatCurrency(selectedContract.deposit)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Remaining Balance:</Text>
                  <Text style={styles.viewValue}>{formatCurrency(selectedContract.remaining_balance)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Balance Due By:</Text>
                  <Text style={styles.viewValue}>{selectedContract.balance_due_week} weeks</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Agreement Date:</Text>
                  <Text style={styles.viewValue}>{formatDate(selectedContract.agreement_date)}</Text>
                </View>
              </Card>
              
              {selectedContract.sections?.map((section: any) => (
                <Card key={section.id} style={styles.viewCard}>
                  <Text style={styles.viewSectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionContent}>{section.custom_content || section.content}</Text>
                </Card>
              ))}
              
              {selectedContract.additional_terms && (
                <Card style={styles.viewCard}>
                  <Text style={styles.viewSectionTitle}>Additional Terms</Text>
                  <Text style={styles.sectionContent}>{selectedContract.additional_terms}</Text>
                </Card>
              )}
              
              {/* Signatures */}
              <Card style={styles.viewCard}>
                <Text style={styles.viewSectionTitle}>Signatures</Text>
                
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Midwife:</Text>
                  {selectedContract.midwife_signature ? (
                    <View style={styles.signatureInfo}>
                      <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={styles.signatureName}>{selectedContract.midwife_signature.signer_name}</Text>
                      <Text style={styles.signatureDate}>{formatDate(selectedContract.midwife_signature.signed_at)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.signaturePending}>Pending</Text>
                  )}
                </View>
                
                <View style={styles.signatureRow}>
                  <Text style={styles.signatureLabel}>Client:</Text>
                  {selectedContract.client_signature ? (
                    <View style={styles.signatureInfo}>
                      <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={styles.signatureName}>{selectedContract.client_signature.signer_name}</Text>
                      <Text style={styles.signatureDate}>{formatDate(selectedContract.client_signature.signed_at)}</Text>
                    </View>
                  ) : (
                    <Text style={styles.signaturePending}>Awaiting signature</Text>
                  )}
                </View>
              </Card>
              
              {selectedContract.status === 'Draft' && (
                <Button
                  title="Send to Client for Signature"
                  onPress={() => {
                    setViewModalVisible(false);
                    handleSendContract(selectedContract);
                  }}
                  fullWidth
                  style={styles.sendButton}
                />
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  addButton: {
    padding: SIZES.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl * 2,
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
  emptySubtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.xl,
    marginBottom: SIZES.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
  contractCard: {
    marginBottom: SIZES.md,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  contractInfo: {
    flex: 1,
  },
  contractTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  clientName: {
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
  contractDetails: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  detailLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  signedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  signedText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.success,
    marginLeft: SIZES.xs,
  },
  actionButtons: {
    marginTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SIZES.md,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
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
  modalContent: {
    flex: 1,
    padding: SIZES.lg,
  },
  templateInfo: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    backgroundColor: COLORS.accent + '20',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
  },
  selectText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  selectPlaceholder: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SIZES.xs,
    maxHeight: 200,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemSelected: {
    backgroundColor: COLORS.accent + '20',
  },
  pickerItemText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  noClientsText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    padding: SIZES.md,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginTop: SIZES.xl,
    marginBottom: SIZES.sm,
  },
  helperText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SIZES.sm,
  },
  halfInput: {
    flex: 1,
    marginRight: SIZES.sm,
  },
  calculatedField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.success + '10',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.sm,
  },
  calculatedLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  calculatedValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.success,
  },
  templatePreview: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.lg,
  },
  templatePreviewTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  templateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  templateSectionText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SIZES.sm,
  },
  createButton: {
    marginTop: SIZES.xl,
    marginBottom: SIZES.xl,
  },
  // View modal styles
  viewHeader: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  viewTitle: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.accent,
  },
  viewSubtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  statusBadgeLarge: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.md,
  },
  statusTextLarge: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
  },
  viewCard: {
    marginBottom: SIZES.md,
  },
  viewSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
    marginBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: SIZES.sm,
  },
  viewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  viewLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  viewValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  sectionContent: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  signatureLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  signatureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signatureName: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.xs,
  },
  signatureDate: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SIZES.sm,
  },
  signaturePending: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  sendButton: {
    marginTop: SIZES.lg,
    marginBottom: SIZES.xl,
  },
});
