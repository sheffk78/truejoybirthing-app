import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../src/components/Icon';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import Input from '../src/components/Input';
import { apiRequest } from '../src/utils/api';
import { API_ENDPOINTS, API_BASE_URL } from '../src/constants/api';
import { COLORS, SIZES, FONTS } from '../src/constants/theme';

interface MidwifeContractData {
  contract: {
    contract_id: string;
    client_name: string;
    partner_name: string | null;
    estimated_due_date: string;
    planned_birth_place: string;
    on_call_start_week: string;
    on_call_end_week: string;
    total_fee: number;
    deposit: number;
    remaining_balance: number;
    balance_due_week: string;
    practice_name: string | null;
    agreement_date: string;
    sections: Array<{
      id: string;
      title: string;
      content: string;
      custom_content?: string;
    }>;
    additional_terms: string | null;
    status: string;
    midwife_signature: any | null;
    client_signature: any | null;
    signed_at: string | null;
  };
  client: {
    name: string;
    email: string | null;
  };
  midwife: {
    full_name: string;
    email: string;
    practice_name: string | null;
  };
}

export default function SignMidwifeContractScreen() {
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<MidwifeContractData | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signing, setSigning] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    fetchContract();
  }, [contractId]);
  
  const fetchContract = async () => {
    if (!contractId) {
      setError('No contract ID provided');
      setLoading(false);
      return;
    }
    
    try {
      const data = await apiRequest<MidwifeContractData>(`${API_ENDPOINTS.MIDWIFE_CONTRACT_BY_ID}/${contractId}`);
      setContractData(data);
      // Pre-fill with client info if available
      if (data.contract?.client_name) {
        setSignerName(data.contract.client_name);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load contract');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSign = async () => {
    if (!signerName.trim()) {
      Alert.alert('Error', 'Please enter your full name to sign');
      return;
    }
    
    if (!agreed) {
      Alert.alert('Error', 'Please agree to the terms before signing');
      return;
    }
    
    setSigning(true);
    try {
      await apiRequest(`${API_ENDPOINTS.MIDWIFE_CONTRACT_BY_ID}/${contractId}/sign`, {
        method: 'POST',
        body: {
          signer_name: signerName.trim(),
          signature_data: signerName.trim(),
        },
      });
      
      Alert.alert(
        'Contract Signed!',
        'Thank you for signing the Midwifery Services Agreement. Your midwife has been notified.',
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to sign contract');
    } finally {
      setSigning(false);
    }
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
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading contract...</Text>
      </SafeAreaView>
    );
  }
  
  if (error || !contractData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{error || 'Contract not found'}</Text>
        <Button title="Go Home" onPress={() => router.replace('/')} variant="outline" />
      </SafeAreaView>
    );
  }
  
  const { contract, midwife } = contractData;
  const isAlreadySigned = contract.status === 'Signed';
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} data-testid="sign-midwife-contract-screen">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Midwifery Services Agreement</Text>
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Contract Header */}
        <Card style={styles.contractCard}>
          <Text style={styles.contractTitle}>Midwifery Services Agreement</Text>
          {contract.practice_name && (
            <Text style={styles.practiceName}>{contract.practice_name}</Text>
          )}
          
          <View style={styles.partiesSection}>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Midwife</Text>
              <Text style={styles.partyName}>{midwife.full_name}</Text>
            </View>
            <View style={styles.partySeparator}>
              <Icon name="swap-horizontal" size={24} color={COLORS.textLight} />
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Client</Text>
              <Text style={styles.partyName}>{contract.client_name}</Text>
              {contract.partner_name && (
                <Text style={styles.partyDetail}>Partner: {contract.partner_name}</Text>
              )}
            </View>
          </View>
        </Card>
        
        {/* Care Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Care Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Estimated Due Date:</Text>
            <Text style={styles.detailValue}>{formatDate(contract.estimated_due_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Birth Location:</Text>
            <Text style={styles.detailValue}>{contract.planned_birth_place}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>On-Call Period:</Text>
            <Text style={styles.detailValue}>{contract.on_call_start_week} - {contract.on_call_end_week} weeks</Text>
          </View>
        </Card>
        
        {/* Payment Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Fee:</Text>
            <Text style={styles.feeAmount}>{formatCurrency(contract.total_fee)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Non-Refundable Deposit:</Text>
            <Text style={styles.detailValue}>{formatCurrency(contract.deposit)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Remaining Balance:</Text>
            <Text style={styles.detailValue}>{formatCurrency(contract.remaining_balance)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Balance Due By:</Text>
            <Text style={styles.detailValue}>{contract.balance_due_week} weeks</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Agreement Date:</Text>
            <Text style={styles.detailValue}>{formatDate(contract.agreement_date)}</Text>
          </View>
        </Card>
        
        {/* Contract Sections */}
        {contract.sections?.map((section) => (
          <Card key={section.id} style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionContent}>{section.custom_content || section.content}</Text>
          </Card>
        ))}
        
        {/* Additional Terms */}
        {contract.additional_terms && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Additional Terms</Text>
            <Text style={styles.sectionContent}>{contract.additional_terms}</Text>
          </Card>
        )}
        
        {/* Signature Section */}
        {isAlreadySigned ? (
          <Card style={styles.signedCard}>
            <View style={styles.signedHeader}>
              <Icon name="checkmark-circle" size={32} color={COLORS.success} />
              <Text style={styles.signedTitle}>Contract Signed</Text>
            </View>
            <Text style={styles.signedInfo}>
              This agreement has been signed by both parties. A copy has been sent to your email.
            </Text>
            
            <View style={styles.signatureDisplay}>
              {contract.midwife_signature && (
                <View style={styles.signatureItem}>
                  <Text style={styles.signatureLabel}>Midwife</Text>
                  <Text style={styles.signatureName}>{contract.midwife_signature.signer_name}</Text>
                  <Text style={styles.signatureDate}>{formatDate(contract.midwife_signature.signed_at)}</Text>
                </View>
              )}
              {contract.client_signature && (
                <View style={styles.signatureItem}>
                  <Text style={styles.signatureLabel}>Client</Text>
                  <Text style={styles.signatureName}>{contract.client_signature.signer_name}</Text>
                  <Text style={styles.signatureDate}>{formatDate(contract.client_signature.signed_at)}</Text>
                </View>
              )}
            </View>
            
            {/* Download PDF Button */}
            <TouchableOpacity 
              style={styles.downloadButton}
              onPress={() => {
                const pdfUrl = `${API_BASE_URL}/api/midwife-contracts/${contractId}/pdf`;
                if (Platform.OS === 'web') {
                  window.open(pdfUrl, '_blank');
                } else {
                  Linking.openURL(pdfUrl);
                }
              }}
              data-testid="download-pdf-btn"
            >
              <Icon name="download-outline" size={20} color={COLORS.white} />
              <Text style={styles.downloadButtonText}>Download Signed PDF</Text>
            </TouchableOpacity>
          </Card>
        ) : contract.status === 'Sent' ? (
          <Card style={styles.signatureCard}>
            <Text style={styles.sectionTitle}>Sign Agreement</Text>
            <Text style={styles.signatureInstructions}>
              Please review the agreement above carefully. By signing below, you acknowledge that you 
              have read, understood, and agree to all terms of this Midwifery Services Agreement.
            </Text>
            
            {contract.midwife_signature && (
              <View style={styles.midwifeSignedBadge}>
                <Icon name="checkmark-circle" size={18} color={COLORS.success} />
                <Text style={styles.midwifeSignedText}>
                  Signed by {contract.midwife_signature.signer_name} on {formatDate(contract.midwife_signature.signed_at)}
                </Text>
              </View>
            )}
            
            <Input
              label="Your Full Legal Name *"
              placeholder="Enter your full name"
              value={signerName}
              onChangeText={setSignerName}
              leftIcon="person-outline"
              testID="signer-name-input"
            />
            
            {/* Agreement Checkbox */}
            <TouchableOpacity 
              style={styles.agreementRow} 
              onPress={() => setAgreed(!agreed)}
              data-testid="agreement-checkbox"
            >
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Icon name="checkmark" size={16} color={COLORS.white} />}
              </View>
              <Text style={styles.agreementText}>
                I have read and agree to the terms of this Midwifery Services Agreement. By typing my name 
                and clicking "Sign Agreement", I understand this constitutes a legally binding electronic signature.
              </Text>
            </TouchableOpacity>
            
            <Button
              title={signing ? "Signing..." : "Sign Agreement"}
              onPress={handleSign}
              disabled={!signerName.trim() || !agreed || signing}
              fullWidth
              style={styles.signButton}
              testID="sign-contract-btn"
            />
          </Card>
        ) : (
          <Card style={styles.pendingCard}>
            <Icon name="time-outline" size={32} color={COLORS.textLight} />
            <Text style={styles.pendingText}>
              This contract is still being prepared. You will be notified when it's ready for signing.
            </Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SIZES.xl,
  },
  errorText: {
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.error,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.md,
    backgroundColor: COLORS.accent,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  contractCard: {
    marginBottom: SIZES.md,
  },
  contractTitle: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.accent,
    marginBottom: SIZES.xs,
    textAlign: 'center',
  },
  practiceName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.lg,
  },
  partiesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  partyInfo: {
    flex: 1,
    alignItems: 'center',
  },
  partyLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  partyName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  partyDetail: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  partySeparator: {
    paddingHorizontal: SIZES.md,
  },
  detailsCard: {
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.accent,
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.sm,
  },
  detailLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    flex: 1,
    textAlign: 'right',
  },
  feeAmount: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.accent,
  },
  sectionCard: {
    marginBottom: SIZES.md,
  },
  sectionContent: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  signedCard: {
    backgroundColor: COLORS.success + '10',
    borderColor: COLORS.success,
    borderWidth: 1,
  },
  signedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  signedTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.success,
    marginLeft: SIZES.sm,
  },
  signedInfo: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  signatureDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.success + '30',
  },
  signatureItem: {
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  signatureName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  signatureDate: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  pendingCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  pendingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  signatureCard: {
    marginBottom: SIZES.md,
  },
  signatureInstructions: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.lg,
    lineHeight: 20,
  },
  midwifeSignedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '10',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.lg,
  },
  midwifeSignedText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.success,
    marginLeft: SIZES.xs,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.lg,
    marginTop: SIZES.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  agreementText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  signButton: {
    marginTop: SIZES.sm,
  },
});
