// Unified Client Detail Screen - Used by both Doula and Midwife
// Midwife gets additional clinical sections (Prenatal Visits, Labor, Birth Record)

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { COLORS, SIZES, FONTS, SHADOWS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';
import { LaborSection, BirthRecordSection, PrenatalVisitSection } from '../midwife';

// ============== TYPES ==============
interface Client {
  client_id: string;
  name: string;
  email?: string;
  phone?: string;
  due_date?: string;
  birth_date?: string;
  edd?: string;
  status: string;
  planned_birth_setting?: string;
  picture?: string;
  linked_mom_id?: string;
  is_active?: boolean;
  _counts?: {
    appointments: number;
    notes: number;
    contracts: number;
    invoices: number;
    visits: number;
  };
}

// PrenatalVisit and BirthRecord are now handled by dedicated section components

interface ClientDetailProps {
  config: ProviderConfig;
}

// ============== CONSTANTS ==============
// Constants for prenatal visits are now in PrenatalVisitSection component

// ============== MAIN COMPONENT ==============
export default function ProviderClientDetail({ config }: ClientDetailProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const clientId = params.clientId as string;
  const clientName = params.clientName as string;
  
  const primaryColor = config.primaryColor;
  const isMidwife = config.role === 'MIDWIFE';
  
  // Core state
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Prenatal visits state is now handled by PrenatalVisitSection component

  // ============== DATA FETCHING ==============
  const fetchData = useCallback(async () => {
    if (!clientId) return;
    
    try {
      // Fetch client details
      const clientData = await apiRequest(`${config.endpoints.clients}/${clientId}`);
      setClient(clientData);
      
      // Prenatal visits and birth records are now fetched by their respective section components
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load client details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId, config.endpoints.clients]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  // ============== HELPERS ==============
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getDaysUntilDue = () => {
    const dueDate = client?.due_date || client?.edd;
    if (!dueDate) return null;
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)} days past due`;
    if (diffDays === 0) return 'Due today!';
    return `${diffDays} days until due`;
  };

  // ============== PRENATAL VISIT HANDLERS ==============
  // Prenatal visit handlers are now in PrenatalVisitSection component

  // ============== BIRTH RECORD HANDLERS ==============
  // Birth record is now handled by the BirthRecordSection component

  // ============== LOADING STATE ==============
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  if (!client) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>Client not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  // ============== MAIN RENDER ==============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Breadcrumb Navigation */}
      <View style={styles.breadcrumbHeader}>
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={() => router.replace(config.routes.clients as any)}
            style={styles.breadcrumbItem}
          >
            <Text style={[styles.breadcrumbLink, { color: primaryColor }]}>Clients</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>{client?.name || clientName}</Text>
        </View>
      </View>
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Client Profile Header */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {client.picture ? (
              <Image source={{ uri: client.picture }} style={[styles.avatarImage, { borderColor: primaryColor }]} />
            ) : (
              <View style={[styles.avatarContainer, { backgroundColor: primaryColor }]}>
                <Text style={styles.avatarText}>{(client?.name || clientName || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{client?.name || clientName}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: primaryColor + '20' }]}>
                  <Text style={[styles.statusText, { color: primaryColor }]}>{client?.status || 'Active'}</Text>
                </View>
                {(client?.edd || client?.due_date) && (
                  <Text style={styles.eddText}>EDD: {formatDate(client.edd || client.due_date || '')}</Text>
                )}
              </View>
              {getDaysUntilDue() && (
                <Text style={[styles.daysUntilText, { color: primaryColor }]}>{getDaysUntilDue()}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.profileDetails}>
            <View style={styles.detailRow}>
              <Icon name="mail-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.detailText}>{client?.email || 'No email'}</Text>
            </View>
            {client?.phone && (
              <View style={styles.detailRow}>
                <Icon name="call-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{client.phone}</Text>
              </View>
            )}
            {client?.planned_birth_setting && (
              <View style={styles.detailRow}>
                <Icon name="location-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailText}>{client.planned_birth_setting}</Text>
              </View>
            )}
          </View>
        </Card>
        
        {/* Quick Actions - Same for both roles */}
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.contracts as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-contract"
          >
            <View style={[styles.actionIcon, { backgroundColor: primaryColor + '15' }]}>
              <Icon name="document-text-outline" size={20} color={primaryColor} />
            </View>
            <Text style={styles.actionLabel}>Contract</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.invoices as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-invoice"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.success + '15' }]}>
              <Icon name="cash-outline" size={20} color={COLORS.success} />
            </View>
            <Text style={styles.actionLabel}>Invoice</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.appointments as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-schedule"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '15' }]}>
              <Icon name="calendar-outline" size={20} color={COLORS.warning} />
            </View>
            <Text style={styles.actionLabel}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push({ pathname: config.routes.notes as any, params: { clientId, clientName: client?.name || clientName } })}
            data-testid="action-notes"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}>
              <Icon name="create-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.actionLabel}>Notes</Text>
          </TouchableOpacity>
        </View>

        {/* Second row of actions */}
        <View style={styles.actionsRow}>
          {/* Birth Plan - Both roles */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (client.linked_mom_id) {
                router.push({ 
                  pathname: (config.routes.clientBirthPlans || config.routes.clients) as any, 
                  params: { momUserId: client.linked_mom_id, clientName: client?.name || clientName } 
                });
              } else {
                Alert.alert('Not Available', 'This client is not linked to a registered user yet.');
              }
            }}
            data-testid="action-birthplan"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.roleDoula + '15' }]}>
              <Icon name="heart-outline" size={20} color={COLORS.roleDoula} />
            </View>
            <Text style={styles.actionLabel}>Birth Plan</Text>
          </TouchableOpacity>
          
          {/* Messages */}
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              if (client.linked_mom_id) {
                router.push({ pathname: config.routes.messages as any, params: { userId: client.linked_mom_id } });
              } else {
                Alert.alert('Not Available', 'This client is not linked to a registered user yet.');
              }
            }}
            data-testid="action-messages"
          >
            <View style={[styles.actionIcon, { backgroundColor: COLORS.accent + '15' }]}>
              <Icon name="chatbubbles-outline" size={20} color={COLORS.accent} />
            </View>
            <Text style={styles.actionLabel}>Messages</Text>
          </TouchableOpacity>

          {/* Prenatal Visits - Midwife only */}
          {isMidwife && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // Scroll to Prenatal Visits section - the PrenatalVisitSection component handles add modal
              }}
              data-testid="action-visit"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.roleMidwife + '15' }]}>
                <Icon name="clipboard-outline" size={20} color={COLORS.roleMidwife} />
              </View>
              <Text style={styles.actionLabel}>Prenatal</Text>
            </TouchableOpacity>
          )}

          {/* Birth Day Record - Midwife only */}
          {isMidwife && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // Scroll to Birth Record section
              }}
              data-testid="action-birth"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.primary + '15' }]}>
                <Icon name="heart-outline" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.actionLabel}>Birth Record</Text>
            </TouchableOpacity>
          )}
          
          {/* Placeholder for alignment - only for non-midwife */}
          {!isMidwife && <View style={styles.actionButton} />}
          {!isMidwife && <View style={styles.actionButton} />}
        </View>

        {/* Third row of actions - Midwife only for Labor tracking */}
        {isMidwife && (
          <View style={[styles.actionsRow, { justifyContent: 'flex-start' }]}>
            {/* Labor Records Quick Access */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => {
                // Scroll to Labor section - the LaborSection component handles add modal
              }}
              data-testid="action-labor"
            >
              <View style={[styles.actionIcon, { backgroundColor: COLORS.warning + '15' }]}>
                <Icon name="pulse-outline" size={20} color={COLORS.warning} />
              </View>
              <Text style={styles.actionLabel}>Labor Log</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Prenatal Visits Section - Midwife Only */}
        {isMidwife && (
          <PrenatalVisitSection
            clientId={clientId}
            primaryColor={primaryColor}
            onRefresh={fetchData}
          />
        )}

        {/* Labor Records Section - Midwife Only */}
        {isMidwife && (
          <LaborSection
            clientId={clientId}
            primaryColor={primaryColor}
            onRefresh={fetchData}
          />
        )}

        {/* Birth Record Section - Midwife Only */}
        {isMidwife && (
          <BirthRecordSection
            clientId={clientId}
            primaryColor={primaryColor}
            onRefresh={fetchData}
          />
        )}
      </ScrollView>
      
      {/* Prenatal visit modals are now in PrenatalVisitSection component */}
    </SafeAreaView>
  );
}

// ============== STYLES ==============
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SIZES.md,
  },
  errorText: {
    fontSize: SIZES.fontLg,
    color: COLORS.error,
  },
  breadcrumbHeader: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    paddingVertical: SIZES.xs,
  },
  breadcrumbLink: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
  },
  breadcrumbSeparator: {
    marginHorizontal: SIZES.xs,
    fontSize: SIZES.fontMd,
    color: COLORS.textLight,
  },
  breadcrumbCurrent: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  profileCard: {
    marginBottom: SIZES.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    marginRight: SIZES.md,
  },
  avatarText: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  statusText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  eddText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  daysUntilText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    fontStyle: 'italic',
    marginTop: SIZES.xs,
  },
  profileDetails: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SIZES.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    ...SHADOWS.sm,
  },
  actionButton: {
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    minWidth: 70,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xs,
  },
  actionLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  section: {
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  visitCount: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    marginLeft: SIZES.xs,
  },
  addVisitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
    paddingHorizontal: SIZES.lg,
  },
  visitCard: {
    marginBottom: SIZES.sm,
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  visitDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  visitDateText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    marginLeft: 4,
  },
  visitSummary: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  vitalsPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  vitalLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textLight,
    marginRight: 4,
  },
  vitalValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  modalFooter: {
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // Form styles
  formSection: {
    marginBottom: SIZES.lg,
  },
  formSectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  formSectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  urinalysisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  urinalysisOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  urinalysisOptionSelected: {
    borderColor: COLORS.primary,
  },
  urinalysisOptionText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  urinalysisOptionTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  unitToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
  },
  unitOptionSelected: {
    backgroundColor: COLORS.primary,
  },
  unitText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  unitTextSelected: {
    color: COLORS.white,
    fontFamily: FONTS.bodyMedium,
  },
  wellbeingItem: {
    marginBottom: SIZES.md,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wellbeingLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  scoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scoreButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  scoreButtonTextSelected: {
    color: COLORS.white,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  // Detail modal styles
  detailDateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
    paddingVertical: SIZES.sm,
  },
  detailDate: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    marginLeft: SIZES.sm,
  },
  detailCard: {
    marginBottom: SIZES.md,
  },
  detailCardTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.xs,
  },
  detailLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
  },
  noDataText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: SIZES.md,
  },
  wellbeingDetailRow: {
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  wellbeingDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  scoreBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  wellbeingNote: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
    fontStyle: 'italic',
  },
  generalNotesText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    marginTop: SIZES.lg,
  },
  deleteButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.error,
    marginLeft: SIZES.xs,
  },
});
