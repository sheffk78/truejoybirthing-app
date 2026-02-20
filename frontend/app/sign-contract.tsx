import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../src/components/Icon';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import Input from '../src/components/Input';
import { apiRequest } from '../src/utils/api';
import { API_ENDPOINTS } from '../src/constants/api';
import { COLORS, SIZES } from '../src/constants/theme';

interface ContractData {
  contract: {
    contract_id: string;
    doula_name: string;
    client_name: string;
    estimated_due_date: string;
    total_fee: number | null;
    retainer_amount: number | null;
    remaining_balance: number | null;
    contract_text: string | null;
    status: string;
    signed_at: string | null;
    client_signature: any | null;
    doula_signature: any | null;
    // Legacy fields for backwards compatibility
    contract_title?: string;
    services_description?: string | null;
    payment_schedule_description?: string | null;
    cancellation_policy?: string | null;
    signature_data?: any | null;
  };
  client: {
    name: string;
    email: string | null;
  } | null;
  doula: {
    full_name: string;
    email: string;
    practice_name: string | null;
  };
}

export default function SignContractScreen() {
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [contractData, setContractData] = useState<ContractData | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
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
      const data = await apiRequest<ContractData>(`${API_ENDPOINTS.CONTRACT_BY_ID}/${contractId}`);
      setContractData(data);
      // Pre-fill with client info if available
      if (data.client?.name) {
        setSignerName(data.client.name);
      }
      if (data.client?.email) {
        setSignerEmail(data.client.email);
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
      await apiRequest(`/contracts/${contractId}/sign`, {
        method: 'POST',
        body: {
          signer_name: signerName.trim(),
          signature_data: `Electronically signed by ${signerName.trim()} on ${new Date().toISOString()}`,
        },
      });
      
      Alert.alert(
        'Contract Signed!',
        'Thank you for signing the contract. The provider has been notified.',
        [{ text: 'OK', onPress: () => router.back() }]
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
  
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.roleDoula} />
        <Text style={styles.loadingText}>Loading contract...</Text>
      </SafeAreaView>
    );
  }
  
  if (error || !contractData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color={COLORS.error} />
        <Text style={styles.errorText}>{error || 'Contract not found'}</Text>
        <Button title="Go Back" onPress={() => router.back()} variant="outline" />
      </SafeAreaView>
    );
  }
  
  const { contract, client, doula } = contractData;
  const isAlreadySigned = contract.status === 'Signed';
  const contractTitle = contract.contract_title || 'Doula Service Agreement';
  
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']} data-testid="sign-contract-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} data-testid="back-btn">
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review & Sign</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Contract Header Card */}
        <Card style={styles.contractCard}>
          <Text style={styles.contractTitle}>{contractTitle}</Text>
          
          <View style={styles.partiesSection}>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Provider</Text>
              <Text style={styles.partyName}>{doula.full_name}</Text>
              {doula.practice_name && (
                <Text style={styles.partyDetail}>{doula.practice_name}</Text>
              )}
            </View>
            <View style={styles.partySeparator}>
              <Icon name="swap-horizontal" size={24} color={COLORS.textLight} />
            </View>
            <View style={styles.partyInfo}>
              <Text style={styles.partyLabel}>Client</Text>
              <Text style={styles.partyName}>{contract.client_name || client?.name || 'Client'}</Text>
              {contract.estimated_due_date && (
                <Text style={styles.partyDetail}>Due: {new Date(contract.estimated_due_date).toLocaleDateString()}</Text>
              )}
            </View>
          </View>
          
          {/* Fee Summary */}
          {contract.total_fee && (
            <View style={styles.feeSummary}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Total Fee</Text>
                <Text style={styles.feeAmount}>{formatCurrency(contract.total_fee)}</Text>
              </View>
              {contract.retainer_amount && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Retainer (Due Now)</Text>
                  <Text style={styles.feeDetail}>{formatCurrency(contract.retainer_amount)}</Text>
                </View>
              )}
              {contract.remaining_balance && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Remaining Balance</Text>
                  <Text style={styles.feeDetail}>{formatCurrency(contract.remaining_balance)}</Text>
                </View>
              )}
            </View>
          )}
        </Card>
        
        {/* Full Contract Text */}
        {contract.contract_text && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Full Agreement</Text>
            <Text style={styles.contractText}>{contract.contract_text}</Text>
          </Card>
        )}
        
        {/* Legacy format details (if no contract_text) */}
        {!contract.contract_text && (
          <Card style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Contract Details</Text>
            
            {contract.services_description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Services</Text>
                <Text style={styles.detailText}>{contract.services_description}</Text>
              </View>
            )}
            
            {contract.payment_schedule_description && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Payment Schedule</Text>
                <Text style={styles.detailText}>{contract.payment_schedule_description}</Text>
              </View>
            )}
            
            {contract.cancellation_policy && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Cancellation Policy</Text>
                <Text style={styles.detailText}>{contract.cancellation_policy}</Text>
              </View>
            )}
          </Card>
        )}
        
        {/* Provider Signature (if already signed by provider) */}
        {contract.doula_signature && (
          <Card style={styles.providerSignatureCard}>
            <View style={styles.signatureHeader}>
              <Icon name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.signatureLabel}>Provider Signature</Text>
            </View>
            <Text style={styles.signatureText}>
              {contract.doula_signature.signer_name} signed on{' '}
              {new Date(contract.doula_signature.signed_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
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
              Signed by {contract.client_signature?.signer_name || 'Client'} on{' '}
              {new Date(contract.signed_at || '').toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.signedNote}>
              A copy of the signed agreement has been sent to your email.
            </Text>
          </Card>
        ) : (
          <Card style={styles.signatureCard}>
            <Text style={styles.sectionTitle}>Sign Contract</Text>
            <Text style={styles.signatureInstructions}>
              By entering your name below and clicking "Sign Contract", you agree to the terms of this agreement. 
              This constitutes a legally binding electronic signature.
            </Text>
            
            <Input
              label="Your Full Legal Name *"
              placeholder="Enter your full name as it should appear on the contract"
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
                I have read the entire agreement above, understand its terms, and agree to be bound by them.
              </Text>
            </TouchableOpacity>
            
            <Button
              title={signing ? "Signing..." : "Sign Contract"}
              onPress={handleSign}
              disabled={!signerName.trim() || !agreed || signing}
              fullWidth
              style={styles.signButton}
              testID="sign-contract-btn"
            />
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
    color: COLORS.error,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.lg,
    textAlign: 'center',
  },
  partiesSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  partyInfo: {
    flex: 1,
    alignItems: 'center',
  },
  partyLabel: {
    fontSize: SIZES.fontXs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  partyName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  partyDetail: {
    fontSize: SIZES.fontSm,
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
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.lg,
  },
  detailSection: {
    marginBottom: SIZES.lg,
  },
  detailLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  detailText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  feeAmount: {
    fontSize: SIZES.fontXl,
    fontWeight: '700',
    color: COLORS.roleDoula,
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
    fontWeight: '700',
    color: COLORS.success,
    marginLeft: SIZES.sm,
  },
  signedInfo: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  signatureCard: {
    marginBottom: SIZES.md,
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
    backgroundColor: COLORS.roleDoula,
    borderColor: COLORS.roleDoula,
  },
  agreementText: {
    flex: 1,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  signButton: {
    marginTop: SIZES.sm,
  },
});
