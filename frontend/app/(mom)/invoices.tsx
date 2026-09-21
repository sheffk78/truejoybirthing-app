import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, kickerStyle, srowBase } from '../../src/constants/designRefresh';
const DF = F;

// Maps invoice status to theme color tokens at render time
const getStatusColor = (status: string): string => {
  if (status === 'Paid') return C.sage;
  if (status === 'Sent') return C.rose;
  if (status === 'Payment Claimed') return C.lavender;
  return C.grayLight;
};

const getStatusLabel = (status: string): string => {
  if (status === 'Payment Claimed') return 'Marked as Paid';
  return status;
};

// Q3 (council 2026-09-11): provider direct-payment handles, copy-to-clipboard only.
// No deep links — Zelle has no public scheme, Venmo pre-fill is unreliable, and
// App Store reviewers flag P2P deep-link buttons. Showing the provider's name
// next to each handle lets the mom verify the recipient before sending.
const buildPaymentMethodRows = (methods: Record<string, any> | undefined | null) => {
  if (!methods) return [];
  const rows: { key: string; label: string; icon: string; value: string; copyValue: string }[] = [];
  if (methods.venmo_handle) {
    rows.push({ key: 'venmo', label: 'Venmo', icon: 'cash-outline', value: `@${methods.venmo_handle}`, copyValue: `@${methods.venmo_handle}` });
  }
  if (methods.cashapp_cashtag) {
    rows.push({ key: 'cashapp', label: 'Cash App', icon: 'logo-usd', value: `$${methods.cashapp_cashtag}`, copyValue: `$${methods.cashapp_cashtag}` });
  }
  if (methods.paypal_link) {
    rows.push({ key: 'paypal', label: 'PayPal', icon: 'globe-outline', value: methods.paypal_link, copyValue: methods.paypal_link });
  }
  if (methods.zelle_contact) {
    rows.push({ key: 'zelle', label: 'Zelle', icon: 'phone-portrait-outline', value: methods.zelle_contact, copyValue: methods.zelle_contact });
  }
  return rows;
};

export default function MomInvoicesScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [ackingInvoiceId, setAckingInvoiceId] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.MOM_INVOICES);
      setInvoices(data);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  const openInvoiceDetail = (invoice: any) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleAcknowledgePayment = async (invoice: any) => {
    try {
      setAckingInvoiceId(invoice.invoice_id);
      await apiRequest(`${API_ENDPOINTS.MOM_INVOICES}/${invoice.invoice_id}/acknowledge-payment`, {
        method: 'POST',
        body: {},
      });
      await fetchInvoices();
      setShowDetailModal(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      console.error('Error acknowledging payment:', error);
    } finally {
      setAckingInvoiceId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const copyPaymentHandle = (label: string, value: string, providerName?: string) => {
    Clipboard.setString(value);
    Alert.alert(
      `${label} handle copied`,
      `Pasted into your payment app, verify you're sending to ${providerName || 'your provider'} before confirming the payment.`,
    );
  };

  const getProviderTypeLabel = (type: string) => {
    if (type === 'DOULA') return 'Doula';
    if (type === 'MIDWIFE') return 'Midwife';
    if (type === 'LACTATION') return 'Lactation Consultant';
    return type;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={C.lavender} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header - S15 mockup: kicker + serif title */}
        <View style={styles.header}>
          <Text style={styles.headerKicker}>Billing</Text>
          <Text style={styles.headerTitle}>Invoices from your team</Text>
        </View>

        {/* Disclaimer - lavender bg */}
        <View style={styles.disclaimerCard}>
          <Icon name="information-circle" size={20} color={C.lavender} />
          <Text style={styles.disclaimerText}>
            Payments are made directly to your provider using the instructions they provide.{' '}
            True Joy Birthing does not process or guarantee payments between you and your provider.
          </Text>
        </View>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Icon name="receipt-outline" size={48} color={C.grayLight} />
            <Text style={styles.emptyTitle}>No Invoices Yet</Text>
            <Text style={styles.emptyText}>
              When your doula or midwife sends you an invoice, it will appear here.
            </Text>
          </View>
        ) : (
          invoices.map((invoice) => (
            <TouchableOpacity
              key={invoice.invoice_id}
              style={styles.invoiceCard}
              onPress={() => openInvoiceDetail(invoice)}
            >
              <View style={styles.invoiceHeader}>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{invoice.provider_name}</Text>
                  <Text style={styles.providerType}>
                    {getProviderTypeLabel(invoice.provider_type)}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                    {getStatusLabel(invoice.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.invoiceMeta}>
                <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                {invoice.due_date && (
                  <Text style={styles.dueDate}>Due: {invoice.due_date}</Text>
                )}
              </View>

              <Text style={styles.description} numberOfLines={2}>{invoice.description}</Text>

              <View style={styles.invoiceFooter}>
                <Text style={styles.amountText}>{formatCurrency(invoice.amount)}</Text>
                <View style={styles.viewButton}>
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <Icon name="chevron-forward" size={16} color={C.lavender} />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Invoice Detail Modal */}
      <Modal visible={showDetailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Invoice Details</Text>
              <View style={{ width: 24 }} />
            </View>

            {selectedInvoice && (
              <ScrollView style={styles.modalBody}>
                {/* Provider Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>From</Text>
                  <Text style={styles.detailValue}>{selectedInvoice.provider_name}</Text>
                  <Text style={styles.detailSubtext}>
                    {getProviderTypeLabel(selectedInvoice.provider_type)}
                  </Text>
                  {selectedInvoice.provider_email && (
                    <Text style={styles.detailSubtext}>{selectedInvoice.provider_email}</Text>
                  )}
                </View>

                {/* Invoice Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Invoice</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice #:</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.invoice_number}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Issue Date:</Text>
                    <Text style={styles.detailValue}>{selectedInvoice.issue_date}</Text>
                  </View>
                  {selectedInvoice.due_date && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Due Date:</Text>
                      <Text style={styles.detailValue}>{selectedInvoice.due_date}</Text>
                    </View>
                  )}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedInvoice.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(selectedInvoice.status) }]}>
                        {selectedInvoice.status}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description & Amount */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Details</Text>
                  <Text style={styles.descriptionFull}>{selectedInvoice.description}</Text>
                  <View style={styles.amountBox}>
                    <Text style={styles.amountLabel}>Amount Due</Text>
                    <Text style={styles.amountLarge}>{formatCurrency(selectedInvoice.amount)}</Text>
                  </View>
                </View>

                {/* Payment Instructions */}
                {selectedInvoice.payment_instructions_text && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Payment Instructions</Text>
                    <View style={styles.paymentInstructionsBox}>
                      <Icon name="card-outline" size={20} color={C.lavender} style={{ marginRight: 8 }} />
                      <Text style={styles.paymentInstructionsText}>
                        {selectedInvoice.payment_instructions_text}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Provider payment methods — copy-to-clipboard (Q3) */}
                {buildPaymentMethodRows(selectedInvoice.provider_payment_methods).length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Pay {selectedInvoice.provider_name || 'Your Provider'} Directly</Text>
                    {buildPaymentMethodRows(selectedInvoice.provider_payment_methods).map((row) => (
                      <View key={row.key} style={styles.paymentMethodRow}>
                        <View style={[styles.paymentMethodIcon, { backgroundColor: C.lavender + '15' }]}>
                          <Icon name={row.icon} size={18} color={C.lavender} />
                        </View>
                        <View style={styles.paymentMethodInfo}>
                          <Text style={styles.paymentMethodLabel}>{row.label}</Text>
                          <Text style={styles.paymentMethodValue}>{row.value}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.paymentMethodCopyButton}
                          onPress={() => copyPaymentHandle(row.label, row.copyValue, selectedInvoice.provider_name)}
                          accessibilityRole="button"
                          accessibilityLabel={`Copy ${row.label} handle`}
                        >
                          <Text style={styles.paymentMethodCopyText}>Copy</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                    <Text style={styles.paymentMethodHint}>
                      Copy the handle, open your payment app, and verify the recipient's name matches {selectedInvoice.provider_name || 'your provider'} before sending.
                    </Text>
                  </View>
                )}

                {/* I've Paid action — for invoices awaiting payment */}
                {(selectedInvoice.status === 'Sent' || selectedInvoice.status === 'Overdue') && (
                  <TouchableOpacity
                    style={styles.ackPaymentButton}
                    onPress={() => handleAcknowledgePayment(selectedInvoice)}
                    disabled={ackingInvoiceId === selectedInvoice.invoice_id}
                  >
                    {ackingInvoiceId === selectedInvoice.invoice_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.ackPaymentButtonText}>I've Paid — Notify My Provider</Text>
                    )}
                  </TouchableOpacity>
                )}
                {selectedInvoice.status === 'Payment Claimed' && (
                  <View style={styles.ackPaymentPendingBox}>
                    <Icon name="time-outline" size={16} color={C.lavender} style={{ marginRight: 6 }} />
                    <Text style={styles.ackPaymentPendingText}>
                      Marked as paid. Your provider will confirm when payment is received.
                    </Text>
                  </View>
                )}

                {/* Notes */}
                {selectedInvoice.notes_for_client && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <Text style={styles.notesText}>{selectedInvoice.notes_for_client}</Text>
                  </View>
                )}

                {/* Disclaimer */}
                <View style={styles.modalDisclaimerCard}>
                  <Icon name="shield-checkmark-outline" size={16} color={C.gray} />
                  <Text style={styles.modalDisclaimerText}>
                    Payments are made directly to your provider. True Joy Birthing does not process 
                    or guarantee payments between you and your provider.
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: C.cream },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { marginBottom: SIZES.md },
  headerKicker: { ...kickerStyle(C.lavender), marginBottom: 4 },
  headerTitle: { fontFamily: DF.serif, fontSize: 26, color: C.ink, marginBottom: 14 },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: C.lavenderBg,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: C.lavender,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: C.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.ink,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: 14,
    color: C.gray,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
  invoiceCard: {
    backgroundColor: C.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: C.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.xs,
  },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '600', color: C.ink },
  providerType: { fontSize: 12, color: C.gray },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  invoiceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  invoiceNumber: { fontSize: 12, color: C.lavender, fontWeight: '500' },
  dueDate: { fontSize: 12, color: C.gray },
  description: { fontSize: 14, color: C.gray, marginBottom: SIZES.sm },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  amountText: { fontSize: 20, fontWeight: '700', color: C.sage },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewButtonText: { fontSize: 14, color: C.lavender, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.white, borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: C.ink },
  modalBody: { padding: SIZES.md },
  detailSection: {
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.lavender,
    marginBottom: SIZES.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailLabel: { fontSize: 14, color: C.gray },
  detailValue: { fontSize: 14, fontWeight: '500', color: C.ink },
  detailSubtext: { fontSize: 13, color: C.gray },
  descriptionFull: {
    fontSize: 15,
    color: C.ink,
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  amountBox: {
    backgroundColor: C.sage + '10',
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 12, color: C.gray, marginBottom: 4 },
  amountLarge: { fontSize: 28, fontWeight: '700', color: C.sage },
  paymentInstructionsBox: {
    flexDirection: 'row',
    backgroundColor: C.lavenderBg,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    borderLeftWidth: 3,
    borderLeftColor: C.lavender,
  },
  paymentInstructionsText: {
    flex: 1,
    fontSize: 14,
    color: C.ink,
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: C.gray,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalDisclaimerCard: {
    flexDirection: 'row',
    backgroundColor: C.cream,
    borderRadius: 8,
    padding: SIZES.sm,
    marginTop: SIZES.md,
    gap: 8,
  },
  ackPaymentButton: {
    backgroundColor: C.lavender,
    borderRadius: SIZES.radiusMd,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SIZES.md,
  },
  ackPaymentButtonText: {
    color: C.white,
    fontSize: 15,
    fontWeight: '600',
  },
  ackPaymentPendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.lavenderBg,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginTop: SIZES.md,
  },
  ackPaymentPendingText: {
    flex: 1,
    fontSize: 13,
    color: C.lavender,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: C.border,
    padding: SIZES.sm,
    marginTop: SIZES.sm,
  },
  paymentMethodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
    backgroundColor: C.lavenderBg,
  },
  paymentMethodInfo: { flex: 1 },
  paymentMethodLabel: { fontSize: 12, color: C.gray },
  paymentMethodValue: { fontSize: 14, fontFamily: DF.ui, color: C.ink },
  paymentMethodCopyButton: {
    backgroundColor: C.lavender,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  paymentMethodCopyText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  paymentMethodHint: {
    fontSize: 11,
    color: C.gray,
    marginTop: SIZES.sm,
    lineHeight: 15,
  },
  modalDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: C.gray,
    lineHeight: 16,
  },
}));
