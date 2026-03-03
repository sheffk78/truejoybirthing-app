// Shared Invoices Screen for Doula and Midwife
// Supports client-scoped access when clientId param is provided
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ProviderConfig } from '../config/providerConfig';

const STATUS_COLORS: Record<string, string> = {
  'Draft': '#9E9E9E',
  'Sent': '#FF9800',
  'Paid': '#4CAF50',
  'Cancelled': '#f44336',
};

const STATUS_FILTERS = ['All', 'Draft', 'Sent', 'Paid', 'Cancelled'];

interface ProviderInvoicesProps {
  config: ProviderConfig;
}

export default function ProviderInvoices({ config }: ProviderInvoicesProps) {
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; clientName?: string }>();
  
  // Client-scoped mode
  const isClientScoped = !!params.clientId;
  const clientName = params.clientName || '';
  
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
  const [selectedClientId, setSelectedClientId] = useState(params.clientId || '');
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

  const primaryColor = config.primaryColor;
  const invoicesEndpoint = config.endpoints.invoices;
  const clientsEndpoint = config.endpoints.clients;

  const fetchData = async () => {
    try {
      const [invoicesData, clientsData, templatesData] = await Promise.all([
        apiRequest(invoicesEndpoint),
        apiRequest(clientsEndpoint),
        apiRequest(API_ENDPOINTS.PAYMENT_INSTRUCTIONS),
      ]);
      
      // Filter invoices by client if client-scoped
      let filteredInvoices = invoicesData || [];
      if (isClientScoped && params.clientId) {
        filteredInvoices = filteredInvoices.filter((inv: any) => inv.client_id === params.clientId);
      }
      
      setInvoices(filteredInvoices);
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

  // Helper for web-compatible alerts
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${message}`)) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: onConfirm },
      ]);
    }
  };

  const handleSaveInvoice = async () => {
    if (!selectedClientId || !description.trim() || !amount) {
      showAlert('Error', 'Please fill in Client, Description, and Amount');
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
        await apiRequest(`${invoicesEndpoint}/${editingInvoice.invoice_id}`, {
          method: 'PUT',
          body: invoiceData,
        });
        showAlert('Success', 'Invoice updated');
      } else {
        await apiRequest(invoicesEndpoint, {
          method: 'POST',
          body: invoiceData,
        });
        showAlert('Success', 'Invoice created');
      }

      await fetchData();
      setShowInvoiceModal(false);
      resetInvoiceForm();
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    showConfirm(
      'Send Invoice',
      'This will send the invoice to the client via email and in-app notification.',
      async () => {
        try {
          await apiRequest(`${invoicesEndpoint}/${invoiceId}/send`, { method: 'POST' });
          await fetchData();
          showAlert('Sent', 'Invoice has been sent to client');
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to send invoice');
        }
      }
    );
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await apiRequest(`${invoicesEndpoint}/${invoiceId}/mark-paid`, { method: 'POST' });
      await fetchData();
      showAlert('Success', 'Invoice marked as paid');
    } catch (error: any) {
      showAlert('Error', error.message || 'Failed to mark invoice as paid');
    }
  };

  const handleMarkUnpaid = async (invoiceId: string) => {
    showConfirm(
      'Mark as Unpaid',
      'Are you sure you want to mark this invoice as unpaid? This will change the status back to "Sent".',
      async () => {
        try {
          await apiRequest(`${invoicesEndpoint}/${invoiceId}`, { 
            method: 'PUT',
            body: { status: 'Sent' }
          });
          await fetchData();
          showAlert('Success', 'Invoice status changed to Sent');
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to update invoice status');
        }
      }
    );
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    showConfirm(
      'Cancel Invoice',
      'Are you sure you want to cancel this invoice?',
      async () => {
        try {
          await apiRequest(`${invoicesEndpoint}/${invoiceId}/cancel`, { method: 'POST' });
          await fetchData();
          showAlert('Cancelled', 'Invoice has been cancelled');
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to cancel invoice');
        }
      }
    );
  };

  const handleSendReminder = async (invoiceId: string) => {
    showConfirm(
      'Send Payment Reminder',
      'This will send a payment reminder email and in-app notification to the client.',
      async () => {
        try {
          await apiRequest(`${invoicesEndpoint}/${invoiceId}/send-reminder`, { method: 'POST' });
          await fetchData();
          showAlert('Reminder Sent', 'Payment reminder has been sent to the client');
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to send reminder');
        }
      }
    );
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    showConfirm(
      'Delete Invoice',
      'Are you sure you want to delete this draft invoice?',
      async () => {
        try {
          await apiRequest(`${invoicesEndpoint}/${invoiceId}`, { method: 'DELETE' });
          await fetchData();
          showAlert('Deleted', 'Invoice has been deleted');
        } catch (error: any) {
          showAlert('Error', error.message || 'Failed to delete invoice');
        }
      }
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
              await apiRequest(`${API_ENDPOINTS.PAYMENT_INSTRUCTIONS}/${templateId}`, { method: 'DELETE' });
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
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const filteredInvoices = statusFilter === 'All' 
    ? invoices 
    : invoices.filter(inv => inv.status === statusFilter);

  // Filter to active clients (those with linked_mom_id)
  const activeClients = clients.filter(c => c.linked_mom_id);

  // Auto-fill due date when client is selected
  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find(c => c.client_id === clientId);
    if (client?.edd && !dueDate) {
      setDueDate(client.edd);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={primaryColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbHeader}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={() => router.replace(config.routes.clients as any)}
            style={styles.breadcrumbItem}
          >
            <Text style={styles.breadcrumbLink}>Clients</Text>
          </TouchableOpacity>
          {isClientScoped && (
            <>
              <Text style={styles.breadcrumbSeparator}>›</Text>
              <TouchableOpacity 
                onPress={() => router.push({ 
                  pathname: config.routes.clientDetail as any, 
                  params: { clientId: params.clientId, clientName: clientName } 
                })}
                style={styles.breadcrumbItem}
              >
                <Text style={styles.breadcrumbLink}>{clientName}</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>Invoices</Text>
        </View>
        <View style={styles.headerButtons}>
          {!isClientScoped && (
            <TouchableOpacity style={styles.settingsButton} onPress={openCreateTemplate}>
              <Ionicons name="settings-outline" size={22} color={primaryColor} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: primaryColor }]}
            onPress={openCreateInvoice}
            data-testid="new-invoice-btn"
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Templates Section - only show when not client-scoped */}
        {!isClientScoped && paymentTemplates.length > 0 && (
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
                      <View style={[styles.defaultBadge, { backgroundColor: primaryColor + '20' }]}>
                        <Text style={[styles.defaultBadgeText, { color: primaryColor }]}>Default</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.templatePreview} numberOfLines={2}>
                    {template.instructions_text}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addTemplateCard} onPress={openCreateTemplate}>
                <Ionicons name="add-circle-outline" size={24} color={primaryColor} />
                <Text style={[styles.addTemplateText, { color: primaryColor }]}>Add New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {STATUS_FILTERS.map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterButton, statusFilter === status && { backgroundColor: primaryColor }]}
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
              onPress={() => openEditInvoice(invoice)}
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
                  {invoice.due_date && <Text style={styles.dateLabel}>Due: {invoice.due_date}</Text>}
                </View>
              </View>

              <View style={styles.invoiceActions}>
                {invoice.status === 'Draft' && (
                  <>
                    <TouchableOpacity style={styles.actionButton} onPress={() => openEditInvoice(invoice)}>
                      <Ionicons name="create-outline" size={18} color={primaryColor} />
                      <Text style={[styles.actionText, { color: primaryColor }]}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: primaryColor }]} onPress={() => handleSendInvoice(invoice.invoice_id)}>
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
                    <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} onPress={() => handleMarkPaid(invoice.invoice_id)}>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={[styles.actionText, { color: '#fff' }]}>Mark Paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleSendReminder(invoice.invoice_id)}>
                      <Ionicons name="notifications-outline" size={18} color={primaryColor} />
                      <Text style={[styles.actionText, { color: primaryColor }]}>Remind</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => handleCancelInvoice(invoice.invoice_id)}>
                      <Ionicons name="close-circle-outline" size={18} color="#f44336" />
                    </TouchableOpacity>
                  </>
                )}
                {invoice.status === 'Paid' && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkUnpaid(invoice.invoice_id)}>
                    <Ionicons name="refresh-outline" size={18} color={COLORS.warning} />
                    <Text style={[styles.actionText, { color: COLORS.warning }]}>Mark Unpaid</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Invoice Modal */}
      <Modal
        visible={showInvoiceModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowInvoiceModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>
                {editingInvoice ? 'Edit Invoice' : 'New Invoice'}
              </Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView 
              style={styles.modalContent}
              contentContainerStyle={{ paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <Text style={styles.fieldLabel}>Client *</Text>
            {isClientScoped && params.clientId ? (
              <View style={[styles.clientDropdown, { borderColor: primaryColor, backgroundColor: primaryColor + '10' }]}>
                <Ionicons name="person" size={18} color={primaryColor} />
                <Text style={[styles.clientDropdownText, { color: primaryColor, fontWeight: '600' }]}>
                  {clientName || activeClients.find(c => c.client_id === params.clientId)?.name || 'Selected Client'}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={primaryColor} />
              </View>
            ) : (
              <View style={styles.clientDropdownContainer}>
                <TouchableOpacity
                  style={[styles.clientDropdown, selectedClientId && { borderColor: primaryColor }]}
                  onPress={() => {
                    // Simple dropdown logic - show options
                  }}
                >
                  <Ionicons name="person-outline" size={18} color={selectedClientId ? primaryColor : COLORS.textLight} />
                  <Text style={[styles.clientDropdownText, selectedClientId ? { color: COLORS.textPrimary } : { color: COLORS.textLight }]}>
                    {selectedClientId 
                      ? activeClients.find(c => c.client_id === selectedClientId)?.name || 'Select Client'
                      : 'Select a client'}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color={COLORS.textLight} />
                </TouchableOpacity>
                <View style={styles.clientOptions}>
                  {activeClients.map((client) => (
                    <TouchableOpacity
                      key={client.client_id}
                      style={[styles.clientOption, selectedClientId === client.client_id && { borderColor: primaryColor, backgroundColor: primaryColor + '10' }]}
                      onPress={() => handleClientSelect(client.client_id)}
                    >
                      <Text style={[styles.clientOptionText, selectedClientId === client.client_id && { color: primaryColor, fontWeight: '600' }]}>
                        {client.name}
                      </Text>
                      {selectedClientId === client.client_id && (
                        <Ionicons name="checkmark" size={18} color={primaryColor} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            {activeClients.length === 0 && (
              <Text style={styles.noClientsText}>No active clients. Connect with clients in the Marketplace first.</Text>
            )}

            <Text style={styles.fieldLabel}>Description *</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g., Birth Doula Services - Final Payment"
              placeholderTextColor={COLORS.textLight}
              multiline
            />

            <Text style={styles.fieldLabel}>Amount ($) *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.textLight}
              keyboardType="decimal-pad"
            />

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Issue Date</Text>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    style={{ padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, fontSize: 16 }}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    value={issueDate}
                    onChangeText={setIssueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textLight}
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
                    style={{ padding: 12, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, fontSize: 16 }}
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    value={dueDate}
                    onChangeText={setDueDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.textLight}
                  />
                )}
              </View>
            </View>

            <Text style={styles.fieldLabel}>Payment Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={paymentInstructions}
              onChangeText={setPaymentInstructions}
              placeholder="How should the client pay? (Venmo, Zelle, check, etc.)"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.fieldLabel}>Notes for Client</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notesForClient}
              onChangeText={setNotesForClient}
              placeholder="Any additional notes..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveInvoice}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Payment Template Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingTemplate ? 'Edit Template' : 'New Payment Template'}
            </Text>
            {editingTemplate ? (
              <TouchableOpacity onPress={() => handleDeleteTemplate(editingTemplate.template_id)}>
                <Ionicons name="trash-outline" size={24} color="#f44336" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.fieldLabel}>Label *</Text>
            <TextInput
              style={styles.input}
              value={templateLabel}
              onChangeText={setTemplateLabel}
              placeholder="e.g., Venmo Payment"
              placeholderTextColor={COLORS.textLight}
            />

            <Text style={styles.fieldLabel}>Instructions *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={templateText}
              onChangeText={setTemplateText}
              placeholder="Payment instructions that will appear on invoices..."
              placeholderTextColor={COLORS.textLight}
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
                color={templateIsDefault ? primaryColor : COLORS.textLight}
              />
              <Text style={styles.defaultToggleText}>Set as default for new invoices</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: primaryColor }]}
              onPress={handleSaveTemplate}
              disabled={savingTemplate}
            >
              {savingTemplate ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Template</Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  // Breadcrumb styles
  breadcrumbHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breadcrumb: { 
    flexDirection: 'row', 
    alignItems: 'center',
    flex: 1,
  },
  breadcrumbItem: { paddingVertical: 4 },
  breadcrumbLink: { 
    fontSize: SIZES.fontMd, 
    color: COLORS.primary, 
    fontWeight: '500' 
  },
  breadcrumbSeparator: { 
    fontSize: SIZES.fontMd, 
    color: COLORS.textLight, 
    marginHorizontal: SIZES.sm 
  },
  breadcrumbCurrent: { 
    fontSize: SIZES.fontMd, 
    color: COLORS.textPrimary, 
    fontWeight: '600' 
  },
  mainHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.md, 
    backgroundColor: COLORS.white, 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border 
  },
  backButton: { padding: SIZES.xs, marginRight: SIZES.sm },
  mainTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  mainSubtitle: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.md },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.textPrimary },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  settingsButton: { padding: SIZES.sm },
  addButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  section: { marginBottom: SIZES.md },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  templateCard: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginRight: SIZES.sm, width: 200, borderWidth: 1, borderColor: COLORS.border },
  templateHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.xs },
  templateLabel: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textPrimary },
  defaultBadge: { paddingHorizontal: SIZES.xs, paddingVertical: 2, borderRadius: 4 },
  defaultBadgeText: { fontSize: 10, fontWeight: '600' },
  templatePreview: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  addTemplateCard: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, width: 100, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  addTemplateText: { fontSize: SIZES.fontXs, marginTop: SIZES.xs },
  filterContainer: { marginBottom: SIZES.md },
  filterButton: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.white, marginRight: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  filterText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.white, fontWeight: '600' },
  emptyCard: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.xl, alignItems: 'center' },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.md },
  invoiceCard: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.sm, borderWidth: 1, borderColor: COLORS.border },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.sm },
  invoiceInfo: { flex: 1 },
  invoiceNumber: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textPrimary },
  clientName: { fontSize: SIZES.fontMd, fontWeight: '500', color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  description: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginBottom: SIZES.sm },
  invoiceDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  amountText: { fontSize: SIZES.fontLg, fontWeight: '700', color: COLORS.textPrimary },
  dateInfo: { alignItems: 'flex-end' },
  dateLabel: { fontSize: SIZES.fontXs, color: COLORS.textLight },
  invoiceActions: { flexDirection: 'row', gap: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SIZES.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusSm, borderWidth: 1, borderColor: COLORS.border },
  actionText: { fontSize: SIZES.fontSm, marginLeft: 4 },
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary },
  modalContent: { flex: 1, padding: SIZES.md },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.white },
  fieldLabel: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs, marginTop: SIZES.md },
  input: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radiusSm, padding: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  clientDropdownContainer: { marginBottom: SIZES.sm },
  clientDropdown: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.white, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    borderRadius: SIZES.radiusSm, 
    padding: SIZES.md,
    gap: SIZES.sm,
  },
  clientDropdownText: { flex: 1, fontSize: SIZES.fontMd },
  clientOptions: { marginTop: SIZES.sm, gap: SIZES.xs },
  clientGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  clientOption: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.sm, 
    borderRadius: SIZES.radiusSm, 
    borderWidth: 1, 
    borderColor: COLORS.border, 
    backgroundColor: COLORS.white 
  },
  clientOptionText: { fontSize: SIZES.fontSm, color: COLORS.textPrimary },
  noClientsText: { fontSize: SIZES.fontSm, color: COLORS.textLight, fontStyle: 'italic' },
  dateRow: { flexDirection: 'row', gap: SIZES.md },
  dateField: { flex: 1 },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', marginTop: SIZES.md },
  defaultToggleText: { fontSize: SIZES.fontMd, color: COLORS.textPrimary, marginLeft: SIZES.sm },
  saveButton: { paddingVertical: SIZES.md, borderRadius: SIZES.radiusMd, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: SIZES.fontMd, fontWeight: '600' },
});
