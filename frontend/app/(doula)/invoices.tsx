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
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Draft': '#9E9E9E',
  'Sent': '#FF9800',
  'Paid': '#4CAF50',
  'Cancelled': '#f44336',
};

const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Paid', 'Cancelled'];

export default function DoulaInvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [paymentTemplates, setPaymentTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  
  // Invoice Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [notesForClient, setNotesForClient] = useState('');
  
  // Payment Instructions Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [templateLabel, setTemplateLabel] = useState('');
  const [templateText, setTemplateText] = useState('');
  const [templateIsDefault, setTemplateIsDefault] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchData = async () => {
    try {
      const [invoicesData, clientsData, templatesData] = await Promise.all([
        apiRequest(API_ENDPOINTS.DOULA_INVOICES),
        apiRequest(API_ENDPOINTS.DOULA_CLIENTS),
        apiRequest(API_ENDPOINTS.PAYMENT_INSTRUCTIONS),
      ]);
      setInvoices(invoicesData);
      setClients(clientsData);
      setPaymentTemplates(templatesData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

  const resetInvoiceForm = () => {
    setSelectedClientId('');
    setDescription('');
    setAmount('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setPaymentInstructions('');
    setNotesForClient('');
    setEditingInvoice(null);
  };

  const openCreateInvoice = () => {
    resetInvoiceForm();
    // Set default payment instructions
    const defaultTemplate = paymentTemplates.find(t => t.is_default);
    if (defaultTemplate) {
      setPaymentInstructions(defaultTemplate.instructions_text);
    }
    setIssueDate(new Date().toISOString().split('T')[0]);
    setShowInvoiceModal(true);
  };

  const openEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setSelectedClientId(invoice.client_id);
    setDescription(invoice.description || '');
    setAmount(invoice.amount?.toString() || '');
    setIssueDate(invoice.issue_date || '');
    setDueDate(invoice.due_date || '');
    setPaymentInstructions(invoice.payment_instructions_text || '');
    setNotesForClient(invoice.notes_for_client || '');
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async () => {
    if (!selectedClientId || !description.trim() || !amount) {
      Alert.alert('Error', 'Please fill in Client, Description, and Amount');
      return;
    }

    setSaving(true);
    try {
      const invoiceData = {
        client_id: selectedClientId,
        description: description.trim(),
        amount: parseFloat(amount),
        issue_date: issueDate || undefined,
        due_date: dueDate || undefined,
        payment_instructions_text: paymentInstructions || undefined,
        notes_for_client: notesForClient || undefined,
      };

      if (editingInvoice) {
        await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${editingInvoice.invoice_id}`, {
          method: 'PUT',
          body: invoiceData,
        });
        Alert.alert('Success', 'Invoice updated');
      } else {
        await apiRequest(API_ENDPOINTS.DOULA_INVOICES, {
          method: 'POST',
          body: invoiceData,
        });
        Alert.alert('Success', 'Invoice created');
      }

      await fetchData();
      setShowInvoiceModal(false);
      resetInvoiceForm();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    Alert.alert(
      'Send Invoice',
      'This will send the invoice to the client via email and in-app notification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${invoiceId}/send`, {
                method: 'POST',
              });
              await fetchData();
              Alert.alert('Sent', 'Invoice has been sent to client');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send invoice');
            }
          },
        },
      ]
    );
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

  const handleCancelInvoice = async (invoiceId: string) => {
    Alert.alert(
      'Cancel Invoice',
      'Are you sure you want to cancel this invoice?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${invoiceId}/cancel`, {
                method: 'POST',
              });
              await fetchData();
              Alert.alert('Cancelled', 'Invoice has been cancelled');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel invoice');
            }
          },
        },
      ]
    );
  };

  const handleSendReminder = async (invoiceId: string) => {
    Alert.alert(
      'Send Payment Reminder',
      'This will send a payment reminder email and in-app notification to the client.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Reminder',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${invoiceId}/send-reminder`, {
                method: 'POST',
              });
              await fetchData();
              Alert.alert('Reminder Sent', 'Payment reminder has been sent to the client');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send reminder');
            }
          },
        },
      ]
    );
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    Alert.alert(
      'Delete Invoice',
      'Are you sure you want to delete this draft invoice?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.DOULA_INVOICES}/${invoiceId}`, {
                method: 'DELETE',
              });
              await fetchData();
              Alert.alert('Deleted', 'Invoice has been deleted');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete invoice');
            }
          },
        },
      ]
    );
  };

  // Payment Templates handlers
  const openCreateTemplate = () => {
    setEditingTemplate(null);
    setTemplateLabel('');
    setTemplateText('');
    setTemplateIsDefault(paymentTemplates.length === 0);
    setShowPaymentModal(true);
  };

  const openEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setTemplateLabel(template.label);
    setTemplateText(template.instructions_text);
    setTemplateIsDefault(template.is_default);
    setShowPaymentModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateLabel.trim() || !templateText.trim()) {
      Alert.alert('Error', 'Please fill in both Label and Instructions');
      return;
    }

    setSavingTemplate(true);
    try {
      const templateData = {
        label: templateLabel.trim(),
        instructions_text: templateText.trim(),
        is_default: templateIsDefault,
      };

      if (editingTemplate) {
        await apiRequest(`${API_ENDPOINTS.PAYMENT_INSTRUCTIONS}/${editingTemplate.template_id}`, {
          method: 'PUT',
          body: templateData,
        });
      } else {
        await apiRequest(API_ENDPOINTS.PAYMENT_INSTRUCTIONS, {
          method: 'POST',
          body: templateData,
        });
      }

      await fetchData();
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment instructions template saved');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    Alert.alert(
      'Delete Template',
      'Are you sure you want to delete this payment instructions template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`${API_ENDPOINTS.PAYMENT_INSTRUCTIONS}/${templateId}`, {
                method: 'DELETE',
              });
              await fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete template');
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

  const filteredInvoices = statusFilter === 'All' 
    ? invoices 
    : invoices.filter(inv => inv.status === statusFilter);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.roleDoula} />
      </View>
    );
  }

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
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={openCreateTemplate}
            >
              <Ionicons name="settings-outline" size={22} color={COLORS.roleDoula} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addButton}
              onPress={openCreateInvoice}
              data-testid="new-invoice-btn"
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Templates Section */}
        {paymentTemplates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Instructions Templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {paymentTemplates.map((template) => (
                <TouchableOpacity
                  key={template.template_id}
                  style={styles.templateCard}
                  onPress={() => openEditTemplate(template)}
                >
                  <View style={styles.templateHeader}>
                    <Text style={styles.templateLabel}>{template.label}</Text>
                    {template.is_default && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.templatePreview} numberOfLines={2}>
                    {template.instructions_text}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addTemplateCard} onPress={openCreateTemplate}>
                <Ionicons name="add-circle-outline" size={24} color={COLORS.roleDoula} />
                <Text style={styles.addTemplateText}>Add New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, statusFilter === status && styles.filterButtonActive]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Invoice List */}
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>
              {statusFilter === 'All' 
                ? 'No invoices yet. Create your first invoice to get started.'
                : `No ${statusFilter.toLowerCase()} invoices.`}
            </Text>
          </View>
        ) : (
          filteredInvoices.map((invoice) => (
            <TouchableOpacity 
              key={invoice.invoice_id} 
              style={styles.invoiceCard}
              onPress={() => invoice.status === 'Draft' && openEditInvoice(invoice)}
              disabled={invoice.status !== 'Draft'}
            >
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                  <Text style={styles.clientName}>{invoice.client_name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[invoice.status] || '#9E9E9E') + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[invoice.status] || '#9E9E9E' }]}>
                    {invoice.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.description} numberOfLines={2}>{invoice.description}</Text>

              <View style={styles.invoiceDetails}>
                <Text style={styles.amountText}>{formatCurrency(invoice.amount)}</Text>
                <View style={styles.dateInfo}>
                  <Text style={styles.dateLabel}>Issue: {invoice.issue_date}</Text>
                  {invoice.due_date && (
                    <Text style={styles.dateLabel}>Due: {invoice.due_date}</Text>
                  )}
                </View>
              </View>

              <View style={styles.invoiceActions}>
                {invoice.status === 'Draft' && (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openEditInvoice(invoice)}>
                      <Ionicons name="create-outline" size={18} color={COLORS.roleDoula} />
                      <Text style={styles.actionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.sendButton]} onPress={() => handleSendInvoice(invoice.invoice_id)}>
                      <Ionicons name="send-outline" size={18} color="#fff" />
                      <Text style={[styles.actionText, { color: '#fff' }]}>Send</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleDeleteInvoice(invoice.invoice_id)}>
                      <Ionicons name="trash-outline" size={18} color="#f44336" />
                    </TouchableOpacity>
                  </>
                )}
                {invoice.status === 'Sent' && (
                  <>
                    <TouchableOpacity style={[styles.actionButton, styles.reminderButton]} onPress={() => handleSendReminder(invoice.invoice_id)}>
                      <Ionicons name="notifications-outline" size={18} color="#FF9800" />
                      <Text style={[styles.actionText, { color: '#FF9800' }]}>Remind</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, styles.paidButton]} onPress={() => handleMarkPaid(invoice.invoice_id)}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={[styles.actionText, { color: '#fff' }]}>Mark Paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelInvoice(invoice.invoice_id)}>
                      <Ionicons name="close-circle-outline" size={18} color="#f44336" />
                      <Text style={[styles.actionText, { color: '#f44336' }]}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
                {invoice.status === 'Paid' && (
                  <View style={styles.paidBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                    <Text style={styles.paidText}>Paid {invoice.paid_at?.substring(0, 10)}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Invoice Modal */}
      <Modal visible={showInvoiceModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingInvoice ? 'Edit Invoice' : 'New Invoice'}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Select Client *</Text>
              {clients.filter(c => c.linked_mom_id).length === 0 ? (
                <View style={styles.noClientsMessage}>
                  <Ionicons name="alert-circle-outline" size={24} color={COLORS.textLight} />
                  <Text style={styles.noClientsText}>
                    No active clients. Clients will appear here when Moms connect with you from the Marketplace.
                  </Text>
                </View>
              ) : (
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
                        // Auto-fill due date based on client's EDD if available
                        if (client.edd && !dueDate) {
                          setDueDate(client.edd);
                        }
                      }}
                      activeOpacity={0.7}
                      data-testid={`client-option-${client.client_id}`}
                    >
                      <Text 
                        style={[
                          styles.clientOptionText, 
                          selectedClientId === client.client_id && styles.clientOptionTextSelected
                        ]}
                      >
                        {client.name}
                      </Text>
                      {client.edd && (
                        <Text style={[
                          styles.clientOptionEdd,
                          selectedClientId === client.client_id && styles.clientOptionTextSelected
                        ]}>
                          EDD: {client.edd}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Birth Doula Services - Deposit"
                placeholderTextColor={COLORS.textSecondary}
                value={description}
                onChangeText={setDescription}
              />

              <Text style={styles.fieldLabel}>Amount ($) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 750"
                placeholderTextColor={COLORS.textSecondary}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Issue Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        fontSize: 16,
                        width: '100%',
                        backgroundColor: COLORS.background,
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textSecondary}
                      value={issueDate}
                      onChangeText={setIssueDate}
                    />
                  )}
                </View>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Due Date</Text>
                  {Platform.OS === 'web' ? (
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      style={{
                        padding: 12,
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 8,
                        fontSize: 16,
                        width: '100%',
                        backgroundColor: COLORS.background,
                      }}
                    />
                  ) : (
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={COLORS.textSecondary}
                      value={dueDate}
                      onChangeText={setDueDate}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.fieldLabel}>Payment Instructions</Text>
              {paymentTemplates.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatePicker}>
                  {paymentTemplates.map((t) => (
                    <TouchableOpacity
                      key={t.template_id}
                      style={styles.templatePickerItem}
                      onPress={() => setPaymentInstructions(t.instructions_text)}
                    >
                      <Text style={styles.templatePickerText}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Payment instructions for client..."
                placeholderTextColor={COLORS.textSecondary}
                value={paymentInstructions}
                onChangeText={setPaymentInstructions}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.fieldLabel}>Notes for Client</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any additional notes..."
                placeholderTextColor={COLORS.textSecondary}
                value={notesForClient}
                onChangeText={setNotesForClient}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveInvoice}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingInvoice ? 'Save Changes' : 'Create Invoice'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Instructions Template Modal */}
      <Modal visible={showPaymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingTemplate ? 'Edit Payment Instructions' : 'New Payment Instructions'}
              </Text>
              {editingTemplate && (
                <TouchableOpacity onPress={() => handleDeleteTemplate(editingTemplate.template_id)}>
                  <Ionicons name="trash-outline" size={24} color="#f44336" />
                </TouchableOpacity>
              )}
              {!editingTemplate && <View style={{ width: 24 }} />}
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.fieldLabel}>Template Label *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Venmo, Zelle, Check"
                placeholderTextColor={COLORS.textSecondary}
                value={templateLabel}
                onChangeText={setTemplateLabel}
              />

              <Text style={styles.fieldLabel}>Payment Instructions *</Text>
              <TextInput
                style={[styles.input, styles.textAreaLarge]}
                placeholder="Enter your payment instructions here. For example: 'Please send payment via Venmo to @YourName or Zelle to your-email@example.com'"
                placeholderTextColor={COLORS.textSecondary}
                value={templateText}
                onChangeText={setTemplateText}
                multiline
                numberOfLines={6}
              />

              <TouchableOpacity
                style={styles.defaultToggle}
                onPress={() => setTemplateIsDefault(!templateIsDefault)}
              >
                <Ionicons
                  name={templateIsDefault ? 'checkbox' : 'square-outline'}
                  size={24}
                  color={COLORS.roleDoula}
                />
                <Text style={styles.defaultToggleText}>Set as default for new invoices</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.saveButton, savingTemplate && styles.saveButtonDisabled]}
                onPress={handleSaveTemplate}
                disabled={savingTemplate}
              >
                {savingTemplate ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Template</Text>
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
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  headerButtons: { flexDirection: 'row', gap: 12 },
  settingsButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.roleDoula + '20', alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.roleDoula, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  templateCard: { backgroundColor: '#fff', borderRadius: 12, padding: SIZES.md, marginRight: SIZES.sm, width: 180, borderWidth: 1, borderColor: COLORS.border },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  templateLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  defaultBadge: { backgroundColor: COLORS.roleDoula + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultBadgeText: { fontSize: 10, color: COLORS.roleDoula, fontWeight: '600' },
  templatePreview: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 16 },
  addTemplateCard: { width: 100, backgroundColor: COLORS.roleDoula + '10', borderRadius: 12, padding: SIZES.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.roleDoula + '30', borderStyle: 'dashed' },
  addTemplateText: { fontSize: 12, color: COLORS.roleDoula, marginTop: 4 },
  filterContainer: { marginBottom: SIZES.md },
  filterButton: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: 20, backgroundColor: '#fff', marginRight: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  filterButtonActive: { backgroundColor: COLORS.roleDoula, borderColor: COLORS.roleDoula },
  filterText: { fontSize: 14, color: COLORS.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: SIZES.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.md },
  invoiceCard: { backgroundColor: '#fff', borderRadius: 12, padding: SIZES.md, marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.xs },
  invoiceInfo: { flex: 1 },
  invoiceNumber: { fontSize: 12, fontWeight: '600', color: COLORS.roleDoula, marginBottom: 2 },
  clientName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  description: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SIZES.sm },
  invoiceDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  amountText: { fontSize: 20, fontWeight: '700', color: COLORS.success },
  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: 12, color: COLORS.textSecondary },
  invoiceActions: { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.sm, gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: COLORS.roleDoula + '10', gap: 4 },
  actionText: { fontSize: 13, color: COLORS.roleDoula, fontWeight: '500' },
  sendButton: { backgroundColor: COLORS.roleDoula },
  reminderButton: { backgroundColor: '#FF9800' + '15', borderWidth: 1, borderColor: '#FF9800' },
  paidButton: { backgroundColor: '#4CAF50' },
  paidBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  paidText: { fontSize: 13, color: '#4CAF50' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  modalBody: { padding: SIZES.md },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.xs, marginTop: SIZES.sm },
  input: { backgroundColor: COLORS.background, borderRadius: 8, padding: SIZES.md, fontSize: 16, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { height: 80, textAlignVertical: 'top' },
  textAreaLarge: { height: 120, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: SIZES.md },
  dateField: { flex: 1 },
  clientSelector: { marginBottom: SIZES.sm },
  clientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SIZES.sm },
  noClientsMessage: { backgroundColor: COLORS.warning + '10', padding: SIZES.md, borderRadius: 8, alignItems: 'center', marginBottom: SIZES.md },
  noClientsText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginTop: 8 },
  clientOption: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.border, minWidth: 100 },
  clientOptionSelected: { backgroundColor: COLORS.roleDoula, borderColor: COLORS.roleDoula },
  clientOptionText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500' },
  clientOptionEdd: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  clientOptionTextSelected: { color: '#fff' },
  templatePicker: { marginBottom: SIZES.xs },
  templatePickerItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.roleDoula + '10', marginRight: 8 },
  templatePickerText: { fontSize: 12, color: COLORS.roleDoula },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.md, gap: 8 },
  defaultToggleText: { fontSize: 14, color: COLORS.textPrimary },
  saveButton: { backgroundColor: COLORS.roleDoula, borderRadius: 8, padding: SIZES.md, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
