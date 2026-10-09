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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, kickerStyle, srowBase } from '../../src/constants/corpus';
const DF = F;

// Maps invoice status to theme color tokens at render time
const getStatusColor = (status: string): string => {
  if (status === 'Paid') return C.sage;
  if (status === 'Sent') return C.rose;
  if (status === 'Payment Claimed') return C.lavender;
  return C.grayLight;
};

// Payment plan roll-up badge colors
const getPlanStatusColor = (status: string): string => {
  if (status === 'paid') return C.sage;
  if (status === 'partial') return C.lavender;
  if (status === 'overdue') return C.rose; // 10/07 drift fix: law warn tone (was material red)
  return C.rose;
};

const getPlanStatusLabel = (status: string): string => {
  const labels: Record<string, string> = { due: 'Payments Due', partial: 'Partially Paid', paid: 'Paid in Full', overdue: 'Overdue' };
  return labels[status] || status;
};

const getInstallmentStatusColor = (status: string): string => {
  if (status === 'paid') return C.sage;
  if (status === 'overdue') return C.rose; // 10/07 drift fix: law warn tone (was material red)
  return C.gray;
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
  const [paymentPlan, setPaymentPlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);

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

  const openInvoiceDetail = async (invoice: any) => {
    setSelectedInvoice(invoice);
    setPaymentPlan(invoice.payment_plan || null);
    setShowDetailModal(true);
    // List payload may omit payment_plan; fetch the authoritative schedule
    if (!invoice.payment_plan) {
      setPlanLoading(true);
      try {
        const data = await apiRequest(`${API_ENDPOINTS.MOM_INVOICES}/${invoice.invoice_id}/payment-plan`);
        setPaymentPlan(data?.payment_plan || null);
      } catch (error) {
        console.error('Error fetching payment plan:', error);
      } finally {
        setPlanLoading(false);
      }
    }
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
                  {/* Jeff 10/02 avatar pass: provider photo when present (endpoint now enriches provider_picture) */}
                  {invoice.provider_picture ? (
                    <Image source={{ uri: invoice.provider_picture }} style={styles.invoiceProviderPhoto} />
                  ) : (
                    <View style={styles.invoiceProviderInitialsWrap}>
                      <Text style={styles.invoiceProviderInitials}>
                        {(invoice.provider_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.providerNameCol}>
                    <Text style={styles.providerName}>{invoice.provider_name}</Text>
                    <Text style={styles.providerType}>
                      {getProviderTypeLabel(invoice.provider_type)}
                    </Text>
                  </View>
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

              {!!invoice.payment_plan && (
                <View style={styles.planChip}>
                  <Text style={styles.planChipText}>
                    {invoice.payment_plan.installments.filter((i: any) => i.status === 'paid').length}/{invoice.payment_plan.installment_count} paid
                  </Text>
                </View>
              )}

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

                {/* Payment Plan Schedule */}
                {(paymentPlan || planLoading) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionTitle}>Payment Schedule</Text>
                    {planLoading ? (
                      <ActivityIndicator size="small" color={C.lavender} style={{ marginVertical: 12 }} />
                    ) : paymentPlan ? (
                      <>
                        <View style={[styles.planStatusBadge, { backgroundColor: getPlanStatusColor(paymentPlan.status) + '20' }]}>
                          <Text style={[styles.planStatusBadgeText, { color: getPlanStatusColor(paymentPlan.status) }]}>
                            {getPlanStatusLabel(paymentPlan.status)}
                          </Text>
                        </View>
                        {paymentPlan.plan_description && (
                          <Text style={styles.planDescription}>{paymentPlan.plan_description}</Text>
                        )}
                        {paymentPlan.installments.map((inst: any) => (
                          <View key={inst.installment_no} style={styles.installmentRow}>
                            <View style={[styles.installmentDot, { backgroundColor: getInstallmentStatusColor(inst.status) }]} />
                            <View style={styles.installmentInfo}>
                              <Text style={styles.installmentTitle}>
                                Installment {inst.installment_no} · {formatCurrency(inst.amount)}
                              </Text>
                              <Text style={styles.installmentDue}>Due {inst.due_date}</Text>
                            </View>
                            <Text style={[styles.installmentStatus, { color: getInstallmentStatusColor(inst.status) }]}>
                              {inst.status === 'paid' ? 'Paid' : inst.status === 'overdue' ? 'Overdue' : 'Due'}
                            </Text>
                          </View>
                        ))}
                        <Text style={styles.planHint}>
                          Pay each installment by its due date using your provider's payment instructions below.
                        </Text>
                      </>
                    ) : null}
                  </View>
                )}

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
  // 10/07 r2 (#8): law overline color = rose #A25C86 (s6 .a-overline / s13 .ov) —
  // was lavender, the only off-law overline in (mom)
  headerKicker: { ...kickerStyle(C.rose), marginBottom: 4 },
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
    fontSize: 13.5,
    color: C.lavender,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: C.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyTitle: {
    fontSize: 21,
    fontWeight: '700',
    fontFamily: F.serif,
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
    backgroundColor: C.surface,
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
  providerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  invoiceProviderPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  invoiceProviderInitialsWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.roseBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceProviderInitials: {
    fontSize: 14,
    fontWeight: '600',
    color: C.rose,
  },
  providerNameCol: { flexShrink: 1 },
  providerName: { fontSize: 17, fontWeight: '600', color: C.ink },
  providerType: { fontSize: 11, color: C.gray },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  invoiceMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  invoiceNumber: { fontSize: 11, color: C.lavender, fontWeight: '500' },
  dueDate: { fontSize: 11, color: C.gray },
  description: { fontSize: 14, color: C.gray, marginBottom: SIZES.sm },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  amountText: { fontSize: 15, fontFamily: F.serifSemi, color: C.rose }, // s15 row amount: serif 15 rose
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewButtonText: { fontSize: 14, color: C.lavender, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.surface, borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 21, fontWeight: '700', fontFamily: F.serif, color: C.ink },
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
  detailSubtext: { fontSize: 13.5, color: C.gray },
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
  amountLabel: { fontSize: 11, color: C.gray, marginBottom: 4 },
  amountLarge: { fontSize: 17, fontFamily: F.serifSemi, color: C.rose }, // s15 'Amount Due': serif 16 rose
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
    fontSize: 13.5,
    color: C.lavender,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
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
  paymentMethodLabel: { fontSize: 11, color: C.gray },
  paymentMethodValue: { fontSize: 14, fontFamily: DF.ui, color: C.ink },
  paymentMethodCopyButton: {
    backgroundColor: C.lavender,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  paymentMethodCopyText: {
    color: C.white,
    fontSize: 13.5,
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
  planChip: {
    alignSelf: 'flex-start',
    backgroundColor: C.lavenderBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  planChipText: { fontSize: 11, fontWeight: '600', color: C.lavender },
  planStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  planStatusBadgeText: { fontSize: 11, fontWeight: '700' },
  planDescription: { fontSize: 13.5, color: C.gray, marginBottom: 10 },
  installmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#EFE9E2',
  },
  installmentDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  installmentInfo: { flex: 1 },
  installmentTitle: { fontSize: 14, fontWeight: '600', color: C.ink },
  installmentDue: { fontSize: 11, color: C.gray, marginTop: 2 },
  installmentStatus: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  planHint: { fontSize: 11, color: C.gray, marginTop: 8, fontStyle: 'italic' },
}));
