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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Draft': COLORS.textLight,
  'Sent': COLORS.warning,
  'Paid': COLORS.success,
  'Overdue': COLORS.error,
};

export default function DoulaInvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const fetchData = async () => {
    try {
      const [invoicesData, clientsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_INVOICES),
        apiRequest(API_ENDPOINTS.DOULA_CLIENTS),
      ]);
      setInvoices(invoicesData);
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
    setInvoiceTitle('');
    setAmount('');
    setDueDate('');
    setNotes('');
  };
  
  const handleCreateInvoice = async () => {
    if (!selectedClientId || !invoiceTitle.trim() || !amount || !dueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.DOULA_INVOICES, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          invoice_title: invoiceTitle,
          amount: parseFloat(amount),
          due_date: dueDate,
          notes: notes || null,
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Invoice created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invoice');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${invoiceId}/send`, {
        method: 'POST',
      });
      await fetchData();
      Alert.alert('Sent', 'Invoice has been sent to client (mocked)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send invoice');
    }
  };
  
  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${invoiceId}/mark-paid`, {
        method: 'POST',
      });
      await fetchData();
      Alert.alert('Success', 'Invoice marked as paid');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark invoice as paid');
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
          <Text style={styles.title}>Invoices</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Invoice List */}
        {invoices.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>
              No invoices yet. Create your first invoice to get started.
            </Text>
          </Card>
        ) : (
          invoices.map((invoice) => (
            <Card key={invoice.invoice_id} style={styles.invoiceCard}>
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceTitle}>{invoice.invoice_title}</Text>
                  <Text style={styles.clientName}>{invoice.client_name}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: (STATUS_COLORS[invoice.status] || COLORS.textLight) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      { color: STATUS_COLORS[invoice.status] || COLORS.textLight },
                    ]}
                  >
                    {invoice.status}
                  </Text>
                </View>
              </View>
              
              <View style={styles.invoiceDetails}>
                <Text style={styles.amountText}>{formatCurrency(invoice.amount)}</Text>
                <Text style={styles.dueDateText}>Due: {invoice.due_date}</Text>
              </View>
              
              <View style={styles.invoiceActions}>
                {invoice.status === 'Draft' && (
                  <Button
                    title="Send"
                    onPress={() => handleSendInvoice(invoice.invoice_id)}
                    variant="outline"
                    size="sm"
                    style={styles.actionButton}
                  />
                )}
                {invoice.status === 'Sent' && (
                  <Button
                    title="Mark Paid"
                    onPress={() => handleMarkPaid(invoice.invoice_id)}
                    variant="outline"
                    size="sm"
                    style={styles.actionButton}
                  />
                )}
              </View>
            </Card>
          ))
        )}
      </ScrollView>
      
      {/* Create Invoice Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Invoice</Text>
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
              label="Invoice Title *"
              placeholder="e.g., Birth Doula Services - Deposit"
              value={invoiceTitle}
              onChangeText={setInvoiceTitle}
            />
            
            <Input
              label="Amount *"
              placeholder="e.g., 750"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              leftIcon="cash-outline"
            />
            
            <Input
              label="Due Date *"
              placeholder="YYYY-MM-DD"
              value={dueDate}
              onChangeText={setDueDate}
              leftIcon="calendar-outline"
            />
            
            <Input
              label="Notes (Optional)"
              placeholder="Payment instructions or notes..."
              value={notes}
              onChangeText={setNotes}
              leftIcon="create-outline"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Create Invoice"
              onPress={handleCreateInvoice}
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
  invoiceCard: {
    marginBottom: SIZES.sm,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceTitle: {
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
  invoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountText: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
    color: COLORS.success,
  },
  dueDateText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  invoiceActions: {
    marginTop: SIZES.sm,
  },
  actionButton: {
    marginTop: SIZES.xs,
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
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
