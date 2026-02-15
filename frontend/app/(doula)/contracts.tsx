import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Draft': COLORS.textLight,
  'Sent': COLORS.warning,
  'Signed': COLORS.success,
};

export default function DoulaContractsScreen() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [contractTitle, setContractTitle] = useState('');
  const [servicesDescription, setServicesDescription] = useState('');
  const [totalFee, setTotalFee] = useState('');
  const [paymentSchedule, setPaymentSchedule] = useState('');
  const [cancellationPolicy, setCancellationPolicy] = useState('');
  
  const fetchData = async () => {
    try {
      const [contractsData, clientsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_CONTRACTS),
        apiRequest(API_ENDPOINTS.DOULA_CLIENTS),
      ]);
      setContracts(contractsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setSelectedClientId('');
    setContractTitle('');
    setServicesDescription('');
    setTotalFee('');
    setPaymentSchedule('');
    setCancellationPolicy('');
  };
  
  const handleCreateContract = async () => {
    if (!selectedClientId || !contractTitle.trim()) {
      Alert.alert('Error', 'Please select a client and enter a contract title');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.DOULA_CONTRACTS, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          contract_title: contractTitle,
          services_description: servicesDescription || null,
          total_fee: totalFee ? parseFloat(totalFee) : null,
          payment_schedule_description: paymentSchedule || null,
          cancellation_policy: cancellationPolicy || null,
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Contract created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSendContract = async (contractId: string) => {
    try {
      await apiRequest(`${API_ENDPOINTS.DOULA_CONTRACTS}/${contractId}/send`, {
        method: 'POST',
      });
      await fetchData();
      Alert.alert('Sent', 'Contract has been sent to client (mocked)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send contract');
    }
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleDoula} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Contracts</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Contract List */}
        {contracts.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No contracts yet. Create your first contract to get started.
            </Text>
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.contract_id} style={styles.contractCard}>
              <View style={styles.contractHeader}>
                <View style={styles.contractInfo}>
                  <Text style={styles.contractTitle}>{contract.contract_title}</Text>
                  <Text style={styles.clientName}>{contract.client_name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (STATUS_COLORS[contract.status] || COLORS.textLight) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[contract.status] || COLORS.textLight },
                    ]}
                  >
                    {contract.status}
                  </Text>
                </View>
              </View>
              
              {contract.total_fee && (
                <Text style={styles.feeText}>
                  Total Fee: {formatCurrency(contract.total_fee)}
                </Text>
              )}
              
              {contract.status === 'Draft' && (
                <Button
                  title="Send for Signature"
                  onPress={() => handleSendContract(contract.contract_id)}
                  variant="outline"
                  size="sm"
                  style={styles.sendButton}
                />
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
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Contract</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Client Selector */}
            <Text style={styles.fieldLabel}>Select Client *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.client_id}
                  style={[
                    styles.clientOption,
                    selectedClientId === client.client_id && styles.clientOptionSelected,
                  ]}
                  onPress={() => setSelectedClientId(client.client_id)}
                >
                  <Text
                    style={[
                      styles.clientOptionText,
                      selectedClientId === client.client_id && styles.clientOptionTextSelected,
                    ]}
                  >
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Input
              label="Contract Title *"
              placeholder="e.g., Birth Doula Services Agreement"
              value={contractTitle}
              onChangeText={setContractTitle}
            />
            
            <Text style={styles.fieldLabel}>Services Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={servicesDescription}
              onChangeText={setServicesDescription}
              placeholder="Describe the services included..."
              multiline
              numberOfLines={4}
            />
            
            <Input
              label="Total Fee"
              placeholder="e.g., 1500"
              value={totalFee}
              onChangeText={setTotalFee}
              keyboardType="numeric"
              leftIcon="cash-outline"
            />
            
            <Text style={styles.fieldLabel}>Payment Schedule</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={paymentSchedule}
              onChangeText={setPaymentSchedule}
              placeholder="e.g., 50% deposit, 50% at 36 weeks..."
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.fieldLabel}>Cancellation Policy</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={cancellationPolicy}
              onChangeText={setCancellationPolicy}
              placeholder="Your cancellation policy..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Create Contract"
              onPress={handleCreateContract}
              loading={saving}
              fullWidth
            />
          </View>
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
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleDoula,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  contractCard: {
    marginBottom: SIZES.sm,
  },
  contractHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  contractInfo: {
    flex: 1,
  },
  contractTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  clientName: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  statusText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  feeText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  sendButton: {
    marginTop: SIZES.sm,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  clientSelector: {
    marginBottom: SIZES.md,
  },
  clientOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
  },
  clientOptionSelected: {
    backgroundColor: COLORS.roleDoula,
    borderColor: COLORS.roleDoula,
  },
  clientOptionText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  clientOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
