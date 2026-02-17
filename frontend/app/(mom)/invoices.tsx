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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Sent': '#FF9800',
  'Paid': '#4CAF50',
  'Cancelled': '#9E9E9E',
};

export default function MomInvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getProviderTypeLabel = (type: string) => {
    if (type === 'DOULA') return 'Doula';
    if (type === 'MIDWIFE') return 'Midwife';
    return type;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Invoices</Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimerCard}>
          <Ionicons name="information-circle" size={20} color={COLORS.primary} />
          <Text style={styles.disclaimerText}>
            Payments are made directly to your provider using the instructions they provide. 
            True Joy Birthing does not process or guarantee payments between you and your provider.
          </Text>
        </View>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.textLight} />
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
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[invoice.status] || '#9E9E9E') + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[invoice.status] || '#9E9E9E' }]}>
                    {invoice.status}
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
                  <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
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
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
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
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[selectedInvoice.status] || '#9E9E9E') + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[selectedInvoice.status] || '#9E9E9E' }]}>
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
                      <Ionicons name="card-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.paymentInstructionsText}>
                        {selectedInvoice.payment_instructions_text}
                      </Text>
                    </View>
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
                  <Ionicons name="shield-checkmark-outline" size={16} color={COLORS.textSecondary} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { marginBottom: SIZES.md },
  title: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  disclaimerCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '10',
    borderRadius: 12,
    padding: SIZES.md,
    marginBottom: SIZES.lg,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.xs,
  },
  providerInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  providerType: { fontSize: 12, color: COLORS.textSecondary },
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
  invoiceNumber: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  dueDate: { fontSize: 12, color: COLORS.textSecondary },
  description: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SIZES.sm },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  amountText: { fontSize: 20, fontWeight: '700', color: COLORS.success },
  viewButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewButtonText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textPrimary },
  modalBody: { padding: SIZES.md },
  detailSection: {
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
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
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '500', color: COLORS.textPrimary },
  detailSubtext: { fontSize: 13, color: COLORS.textSecondary },
  descriptionFull: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  amountBox: {
    backgroundColor: COLORS.success + '10',
    borderRadius: 12,
    padding: SIZES.md,
    alignItems: 'center',
  },
  amountLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  amountLarge: { fontSize: 28, fontWeight: '700', color: COLORS.success },
  paymentInstructionsBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary + '08',
    borderRadius: 12,
    padding: SIZES.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  paymentInstructionsText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  notesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  modalDisclaimerCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: SIZES.sm,
    marginTop: SIZES.md,
    gap: 8,
  },
  modalDisclaimerText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});
