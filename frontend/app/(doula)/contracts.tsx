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

interface ContractTemplate {
  title: string;
  sections: Array<{
    id: string;
    title: string;
    content?: string;
    editable?: boolean;
    subsections?: Array<{ id: string; title: string; content: string }>;
  }>;
}

export default function DoulaContractsScreen() {
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
  const [clientNames, setClientNames] = useState('');
  const [estimatedDueDate, setEstimatedDueDate] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [retainerFee, setRetainerFee] = useState('');
  const [finalPaymentDue, setFinalPaymentDue] = useState('Day after birth');
  const [additionalTerms, setAdditionalTerms] = useState('');
  const [showClientPicker, setShowClientPicker] = useState(false);
  
  const fetchData = useCallback(async () => {
    try {
      const [contractsData, clientsData, templateData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_CONTRACTS),
        apiRequest(API_ENDPOINTS.DOULA_CLIENTS),
        apiRequest('/api/doula/contract-template'),
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
    setClientNames('');
    setEstimatedDueDate('');
    setTotalAmount('');
    setRetainerFee('');
    setFinalPaymentDue('Day after birth');
    setAdditionalTerms('');
    setShowClientPicker(false);
  };
  
  const handleCreateContract = async () => {
    if (!selectedClientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    if (!clientNames.trim()) {
      Alert.alert('Error', 'Please enter client name(s)');
      return;
    }
    if (!totalAmount || isNaN(parseFloat(totalAmount))) {
      Alert.alert('Error', 'Please enter a valid total payment amount');
      return;
    }
    if (!retainerFee || isNaN(parseFloat(retainerFee))) {
      Alert.alert('Error', 'Please enter a valid retainer fee');
      return;
    }
    
    setSaving(true);
    try {
      const newContract = await apiRequest(API_ENDPOINTS.DOULA_CONTRACTS, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          client_names: clientNames.trim(),
          estimated_due_date: estimatedDueDate,
          total_payment_amount: parseFloat(totalAmount),
          retainer_fee: parseFloat(retainerFee),
          final_payment_due_date: finalPaymentDue.trim() || 'Day after birth',
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
      `Send this Doula Service Agreement to ${contract.client_name}? They will receive an email with a link to review and sign.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setSending(true);
            try {
              const result = await apiRequest(`/api/doula/contracts/${contract.contract_id}/send`, {
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
          <ActivityIndicator size="large" color={COLORS.primary} />
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
        >
          <Icon name="add-circle" size={28} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {contracts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="document-text-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Contracts Yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first True Joy Birthing Doula Service Agreement
            </Text>
            <Button
              title="Create Contract"
              onPress={() => setModalVisible(true)}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.contract_id} style={styles.contractCard}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedContract(contract);
                  setViewModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.contractHeader}>
                  <View style={styles.contractInfo}>
                    <Text style={styles.contractTitle}>Doula Service Agreement</Text>
                    <Text style={styles.clientName}>{contract.client_names || contract.client_name}</Text>
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
                    <Text style={styles.detailLabel}>Total:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(contract.total_payment_amount || 0)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Retainer:</Text>
                    <Text style={styles.detailValue}>{formatCurrency(contract.retainer_fee || 0)}</Text>
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
                  />
                </View>
              )}
              
              {contract.status === 'Signed' && (
                <View style={styles.actionButtons}>
                  <Button
                    title="Download PDF"
                    variant="outline"
                    onPress={() => {
                      const pdfUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/contracts/${contract.contract_id}/pdf`;
                      if (typeof window !== 'undefined') {
                        window.open(pdfUrl, '_blank');
                      }
                    }}
                    leftIcon="download-outline"
                    fullWidth
                    data-testid={`download-pdf-btn-${contract.contract_id}`}
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
              This contract uses the True Joy Birthing Doula Service Agreement template with all standard terms and conditions.
            </Text>
            
            {/* Client Selection */}
            <Text style={styles.inputLabel}>Select Client *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowClientPicker(!showClientPicker)}
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
                        setClientNames(client.name);
                        setShowClientPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{client.name}</Text>
                      {selectedClientId === client.client_id && (
                        <Icon name="checkmark" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
            
            <Text style={styles.sectionTitle}>Client & Payment Details</Text>
            
            <Input
              label="Client Name(s) *"
              placeholder="Full name(s) as they appear on the agreement"
              value={clientNames}
              onChangeText={setClientNames}
              leftIcon="person"
            />
            
            <Input
              label="Estimated Due Date"
              placeholder="YYYY-MM-DD"
              value={estimatedDueDate}
              onChangeText={setEstimatedDueDate}
              leftIcon="calendar"
            />
            
            <Input
              label="Total Payment Amount *"
              placeholder="e.g., 1500"
              value={totalAmount}
              onChangeText={setTotalAmount}
              keyboardType="decimal-pad"
              leftIcon="cash"
            />
            
            <Input
              label="Retainer Fee (Down Payment) *"
              placeholder="e.g., 500"
              value={retainerFee}
              onChangeText={setRetainerFee}
              keyboardType="decimal-pad"
              leftIcon="wallet"
            />
            
            {totalAmount && retainerFee && (
              <View style={styles.calculatedField}>
                <Text style={styles.calculatedLabel}>Remaining Balance:</Text>
                <Text style={styles.calculatedValue}>
                  {formatCurrency(parseFloat(totalAmount || '0') - parseFloat(retainerFee || '0'))}
                </Text>
              </View>
            )}
            
            <Input
              label="Final Payment Due Date"
              placeholder="Day after birth"
              value={finalPaymentDue}
              onChangeText={setFinalPaymentDue}
              leftIcon="time"
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
                <Text style={styles.viewTitle}>True Joy Birthing</Text>
                <Text style={styles.viewSubtitle}>Doula Service Agreement</Text>
                <View style={[styles.statusBadgeLarge, { backgroundColor: STATUS_COLORS[selectedContract.status] + '20' }]}>
                  <Text style={[styles.statusTextLarge, { color: STATUS_COLORS[selectedContract.status] }]}>
                    {selectedContract.status}
                  </Text>
                </View>
              </View>
              
              <Card style={styles.viewCard}>
                <Text style={styles.viewSectionTitle}>Client & Payment Details</Text>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Client Name(s):</Text>
                  <Text style={styles.viewValue}>{selectedContract.client_names}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Estimated Due Date:</Text>
                  <Text style={styles.viewValue}>{formatDate(selectedContract.estimated_due_date)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Total Payment:</Text>
                  <Text style={styles.viewValue}>{formatCurrency(selectedContract.total_payment_amount)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Retainer Fee:</Text>
                  <Text style={styles.viewValue}>{formatCurrency(selectedContract.retainer_fee)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Remaining Balance:</Text>
                  <Text style={styles.viewValue}>{formatCurrency(selectedContract.remaining_payment_amount)}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Final Payment Due:</Text>
                  <Text style={styles.viewValue}>{selectedContract.final_payment_due_date}</Text>
                </View>
                <View style={styles.viewRow}>
                  <Text style={styles.viewLabel}>Agreement Date:</Text>
                  <Text style={styles.viewValue}>{formatDate(selectedContract.agreement_date)}</Text>
                </View>
              </Card>
              
              {selectedContract.sections?.map((section: any) => (
                <Card key={section.id} style={styles.viewCard}>
                  <Text style={styles.viewSectionTitle}>{section.title}</Text>
                  {section.subsections ? (
                    section.subsections.map((sub: any) => (
                      <View key={sub.id} style={styles.subsection}>
                        <Text style={styles.subsectionTitle}>{sub.title}</Text>
                        <Text style={styles.subsectionContent}>{sub.content}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sectionContent}>{section.custom_content || section.content}</Text>
                  )}
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
                  <Text style={styles.signatureLabel}>Doula:</Text>
                  {selectedContract.doula_signature ? (
                    <View style={styles.signatureInfo}>
                      <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                      <Text style={styles.signatureName}>{selectedContract.doula_signature.signer_name}</Text>
                      <Text style={styles.signatureDate}>{formatDate(selectedContract.doula_signature.signed_at)}</Text>
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
    backgroundColor: COLORS.primaryLight + '30',
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
    backgroundColor: COLORS.primaryLight,
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
    color: COLORS.primary,
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
    color: COLORS.primary,
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
  subsection: {
    marginBottom: SIZES.md,
  },
  subsectionTitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  subsectionContent: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
