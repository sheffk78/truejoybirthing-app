/**
 * Provider Leads Component
 * 
 * Displays leads (potential clients who requested consultations) for Doulas and Midwives.
 * Allows providers to manage leads through the consultation process.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';
import { useSubscriptionGate } from '../../utils/subscriptionGate';

interface Lead {
  lead_id: string;
  mom_user_id: string;
  mom_name: string;
  mom_email?: string;
  mom_picture?: string;
  provider_id: string;
  status: string;
  message?: string;
  edd?: string;
  planned_birth_setting?: string;
  number_of_children?: number;
  // Birth plan details
  birth_plan_completion?: number;
  birth_plan_due_date?: string;
  birth_plan_location?: string;
  birth_plan_hospital_name?: string;
  previous_birth_experience?: string;
  // Consultation info
  consultation_date?: string;
  consultation_time?: string;
  consultation_appointment_id?: string;
  created_at: string;
  updated_at: string;
}

interface LeadStats {
  total: number;
  active_leads: number;
  consultation_requested: number;
  consultation_scheduled: number;
  consultation_completed: number;
  converted_to_client: number;
}

const LEAD_STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  'consultation_requested': { label: 'Consultation Requested', color: COLORS.warning, icon: 'time-outline' },
  'consultation_scheduled': { label: 'Consultation Scheduled', color: COLORS.info, icon: 'calendar-outline' },
  'consultation_completed': { label: 'Consultation Completed', color: COLORS.success, icon: 'checkmark-circle-outline' },
  'converted_to_client': { label: 'Converted to Client', color: COLORS.primary, icon: 'person-add-outline' },
  'declined': { label: 'Declined', color: COLORS.textLight, icon: 'close-circle-outline' },
  'not_a_fit': { label: 'Not a Fit', color: COLORS.textLight, icon: 'remove-circle-outline' },
};

interface ProviderLeadsProps {
  config: ProviderConfig;
}

export default function ProviderLeads({ config }: ProviderLeadsProps) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingLead, setProcessingLead] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const primaryColor = config.primaryColor;
  const appointmentsRoute = config.role === 'MIDWIFE' ? '/(midwife)/appointments' : '/(doula)/appointments';
  const messagesRoute = config.role === 'MIDWIFE' ? '/(midwife)/messages' : '/(doula)/messages';
  
  // Subscription gatekeeping
  const { checkAndAlert, isSubscribed } = useSubscriptionGate();
  const subscriptionRoute = config.role === 'MIDWIFE' ? '/(midwife)/subscription' : '/(doula)/subscription';
  
  const navigateToSubscription = () => {
    router.push(subscriptionRoute as any);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const [leadsData, statsData] = await Promise.all([
        apiRequest('/leads'),
        apiRequest('/leads/stats'),
      ]);
      setLeads(leadsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeads();
  };

  const getFilteredLeads = () => {
    if (statusFilter === 'active') {
      return leads.filter(l => ['consultation_requested', 'consultation_scheduled', 'consultation_completed'].includes(l.status));
    } else if (statusFilter === 'converted') {
      return leads.filter(l => l.status === 'converted_to_client');
    } else if (statusFilter === 'closed') {
      return leads.filter(l => ['declined', 'not_a_fit'].includes(l.status));
    }
    return leads;
  };

  const handleScheduleConsultation = (lead: Lead) => {
    // Navigate to appointments with the lead pre-selected
    router.push({
      pathname: appointmentsRoute as any,
      params: {
        newAppointment: 'true',
        clientId: lead.mom_user_id,
        clientName: lead.mom_name,
        appointmentType: 'consultation',
        leadId: lead.lead_id,
      }
    });
  };

  const handleMessage = (lead: Lead) => {
    router.push({
      pathname: messagesRoute as any,
      params: { openConversation: lead.mom_user_id }
    });
  };

  const handleDecline = async (lead: Lead) => {
    const performDecline = async () => {
      setProcessingLead(lead.lead_id);
      try {
        await apiRequest(`/leads/${lead.lead_id}/status`, {
          method: 'PUT',
          body: { status: 'declined' }
        });
        fetchLeads();
      } catch (error: any) {
        if (Platform.OS === 'web') {
          window.alert(error.message || 'Failed to decline lead');
        } else {
          Alert.alert('Error', error.message || 'Failed to decline lead');
        }
      } finally {
        setProcessingLead(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Are you sure you want to decline the consultation request from ${lead.mom_name}?`
      );
      if (confirmed) {
        await performDecline();
      }
    } else {
      Alert.alert(
        'Decline Lead',
        `Are you sure you want to decline the consultation request from ${lead.mom_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Decline', style: 'destructive', onPress: performDecline }
        ]
      );
    }
  };

  const handleMarkNotAFit = async (lead: Lead) => {
    const performMarkNotAFit = async () => {
      setProcessingLead(lead.lead_id);
      try {
        await apiRequest(`/leads/${lead.lead_id}/status`, {
          method: 'PUT',
          body: { status: 'not_a_fit' }
        });
        fetchLeads();
      } catch (error: any) {
        if (Platform.OS === 'web') {
          window.alert(error.message || 'Failed to update lead');
        } else {
          Alert.alert('Error', error.message || 'Failed to update lead');
        }
      } finally {
        setProcessingLead(null);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `This will indicate that after consultation, you've decided not to work with ${lead.mom_name}. Continue?`
      );
      if (confirmed) {
        await performMarkNotAFit();
      }
    } else {
      Alert.alert(
        'Mark as Not a Fit',
        `This will indicate that after consultation, you've decided not to work with ${lead.mom_name}. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: performMarkNotAFit }
        ]
      );
    }
  };

  const handleMarkConsultationCompleted = async (lead: Lead) => {
    setProcessingLead(lead.lead_id);
    try {
      await apiRequest(`/leads/${lead.lead_id}/status`, {
        method: 'PUT',
        body: { status: 'consultation_completed' }
      });
      fetchLeads();
      if (Platform.OS === 'web') {
        window.alert('Consultation marked as completed');
      } else {
        Alert.alert('Success', 'Consultation marked as completed');
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(error.message || 'Failed to update lead');
      } else {
        Alert.alert('Error', error.message || 'Failed to update lead');
      }
    } finally {
      setProcessingLead(null);
    }
  };

  const handleConvertToClient = async (lead: Lead) => {
    // Check subscription before converting lead to client
    if (!checkAndAlert('approve_lead', navigateToSubscription)) {
      return;
    }
    
    const confirmConvert = async () => {
      setProcessingLead(lead.lead_id);
      try {
        await apiRequest(`/leads/${lead.lead_id}/convert-to-client`, {
          method: 'POST',
          body: { initial_status: config.role === 'DOULA' ? 'Active' : 'Prenatal' }
        });
        fetchLeads();
        if (Platform.OS === 'web') {
          window.alert(`${lead.mom_name} is now a client!`);
        } else {
          Alert.alert('Success', `${lead.mom_name} is now a client!`);
        }
      } catch (error: any) {
        if (Platform.OS === 'web') {
          window.alert(error.message || 'Failed to convert lead');
        } else {
          Alert.alert('Error', error.message || 'Failed to convert lead');
        }
      } finally {
        setProcessingLead(null);
      }
    };
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Would you like to add ${lead.mom_name} as a client? This will give them full access to your services.`
      );
      if (confirmed) {
        await confirmConvert();
      }
    } else {
      Alert.alert(
        'Add as Client',
        `Would you like to add ${lead.mom_name} as a client? This will give them full access to your services.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add as Client', onPress: confirmConvert }
        ]
      );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const renderLeadCard = (lead: Lead) => {
    const statusConfig = LEAD_STATUS_CONFIG[lead.status] || { label: lead.status, color: COLORS.textLight, icon: 'help-outline' };
    const isProcessing = processingLead === lead.lead_id;
    const momInitial = lead.mom_name?.charAt(0).toUpperCase() || 'M';

    return (
      <Card key={lead.lead_id} style={styles.leadCard}>
        {/* Header */}
        <View style={styles.leadHeader}>
          <View style={styles.momInfo}>
            {lead.mom_picture ? (
              <Image source={{ uri: lead.mom_picture }} style={styles.momAvatar} />
            ) : (
              <View style={[styles.momAvatarPlaceholder, { backgroundColor: primaryColor }]}>
                <Text style={styles.momAvatarText}>{momInitial}</Text>
              </View>
            )}
            <View style={styles.momDetails}>
              <Text style={styles.momName}>{lead.mom_name}</Text>
              {lead.edd && (
                <Text style={styles.momEdd}>EDD: {formatDate(lead.edd)}</Text>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label.split(' ')[0]}
            </Text>
          </View>
        </View>

        {/* Message if present */}
        {lead.message && lead.status === 'consultation_requested' && (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>Message from {lead.mom_name}:</Text>
            <Text style={styles.messageText}>"{lead.message}"</Text>
          </View>
        )}

        {/* Key Details Section - from Mom Profile & Birth Plan */}
        {(lead.number_of_children !== undefined || lead.birth_plan_location || lead.birth_plan_due_date || lead.birth_plan_hospital_name || lead.previous_birth_experience) && (
          <View style={styles.keyDetailsSection}>
            <Text style={styles.keyDetailsTitle}>Key Details</Text>
            <View style={styles.keyDetailsGrid}>
              {lead.number_of_children !== undefined && (
                <View style={styles.keyDetailItem}>
                  <Icon name="people-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.keyDetailLabel}>Children:</Text>
                  <Text style={styles.keyDetailValue}>{lead.number_of_children}</Text>
                </View>
              )}
              {(lead.birth_plan_due_date || lead.edd) && (
                <View style={styles.keyDetailItem}>
                  <Icon name="calendar-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.keyDetailLabel}>Due Date:</Text>
                  <Text style={styles.keyDetailValue}>{formatDate(lead.birth_plan_due_date || lead.edd || '')}</Text>
                </View>
              )}
              {lead.birth_plan_location && (
                <View style={[styles.keyDetailItem, styles.keyDetailItemColumn]}>
                  <View style={styles.keyDetailLabelRow}>
                    <Icon name="home-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.keyDetailLabel}>Birth Location:</Text>
                  </View>
                  <Text style={styles.keyDetailValueBlock}>{lead.birth_plan_location}</Text>
                </View>
              )}
              {lead.birth_plan_hospital_name && (
                <View style={styles.keyDetailItem}>
                  <Icon name="business-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.keyDetailLabel}>Facility:</Text>
                  <Text style={styles.keyDetailValue}>{lead.birth_plan_hospital_name}</Text>
                </View>
              )}
            </View>
            {lead.previous_birth_experience && (
              <View style={styles.previousExperienceBox}>
                <Text style={styles.previousExperienceLabel}>Previous Birth Experience:</Text>
                <Text style={styles.previousExperienceText} numberOfLines={3}>
                  {lead.previous_birth_experience}
                </Text>
              </View>
            )}
            {lead.birth_plan_completion !== undefined && (
              <View style={styles.planCompletionRow}>
                <Text style={styles.planCompletionLabel}>Birth Plan:</Text>
                <View style={[styles.planCompletionBadge, { backgroundColor: lead.birth_plan_completion >= 80 ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                  <Text style={[styles.planCompletionText, { color: lead.birth_plan_completion >= 80 ? COLORS.success : COLORS.warning }]}>
                    {lead.birth_plan_completion}% Complete
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Consultation Info */}
        {lead.consultation_date && (
          <View style={styles.consultationInfo}>
            <Icon name="calendar" size={16} color={COLORS.info} />
            <Text style={styles.consultationText}>
              Consultation: {formatDate(lead.consultation_date)} at {lead.consultation_time}
            </Text>
          </View>
        )}

        {/* Additional Info */}
        <View style={styles.infoRow}>
          {lead.planned_birth_setting && (
            <View style={styles.infoChip}>
              <Icon name="location-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.infoChipText}>{lead.planned_birth_setting}</Text>
            </View>
          )}
          <Text style={styles.dateText}>Requested: {formatDate(lead.created_at)}</Text>
        </View>

        {/* Actions */}
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color={primaryColor} />
          </View>
        ) : (
          <View style={styles.actionsRow}>
            {lead.status === 'consultation_requested' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: primaryColor }]}
                  onPress={() => handleScheduleConsultation(lead)}
                >
                  <Icon name="calendar-outline" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                  onPress={() => handleConvertToClient(lead)}
                >
                  <Icon name="checkmark" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonGhost]}
                  onPress={() => handleDecline(lead)}
                >
                  <Icon name="close" size={16} color={COLORS.error} />
                </TouchableOpacity>
              </>
            )}
            
            {lead.status === 'consultation_scheduled' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                  onPress={() => handleMarkConsultationCompleted(lead)}
                >
                  <Icon name="checkmark" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Mark Complete</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonOutline]}
                  onPress={() => handleMessage(lead)}
                >
                  <Icon name="chatbubble-outline" size={16} color={primaryColor} />
                  <Text style={[styles.actionButtonText, { color: primaryColor }]}>Message</Text>
                </TouchableOpacity>
              </>
            )}
            
            {lead.status === 'consultation_completed' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: primaryColor }]}
                  onPress={() => handleConvertToClient(lead)}
                >
                  <Icon name="person-add" size={16} color={COLORS.white} />
                  <Text style={styles.actionButtonText}>Add as Client</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.actionButtonOutline]}
                  onPress={() => handleMarkNotAFit(lead)}
                >
                  <Icon name="close-circle-outline" size={16} color={COLORS.textLight} />
                  <Text style={[styles.actionButtonText, { color: COLORS.textLight }]}>Not a Fit</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredLeads = getFilteredLeads();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Leads</Text>
        {stats && (
          <View style={[styles.statsBadge, { backgroundColor: primaryColor + '20' }]}>
            <Text style={[styles.statsText, { color: primaryColor }]}>
              {stats.active_leads} Open
            </Text>
          </View>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity 
          style={[styles.filterTab, statusFilter === 'active' && { backgroundColor: primaryColor }]}
          onPress={() => setStatusFilter('active')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'active' && { color: COLORS.white }]}>
            Open ({stats?.active_leads || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, statusFilter === 'converted' && { backgroundColor: primaryColor }]}
          onPress={() => setStatusFilter('converted')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'converted' && { color: COLORS.white }]}>
            Converted ({stats?.converted_to_client || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterTab, statusFilter === 'closed' && { backgroundColor: primaryColor }]}
          onPress={() => setStatusFilter('closed')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'closed' && { color: COLORS.white }]}>
            Closed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Leads List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />}
      >
        {filteredLeads.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No {statusFilter === 'active' ? 'open' : statusFilter} leads</Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'active' 
                ? "When moms request consultations, they'll appear here."
                : "No leads in this category."}
            </Text>
          </View>
        ) : (
          filteredLeads.map(renderLeadCard)
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: SIZES.fontXl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  statsBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  statsText: { fontSize: SIZES.fontSm, fontFamily: FONTS.bodyMedium },
  filterTabs: { 
    flexDirection: 'row', 
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    gap: SIZES.xs,
  },
  filterTab: { 
    paddingHorizontal: SIZES.md, 
    paddingVertical: SIZES.xs, 
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.background,
  },
  filterTabText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  scrollView: { flex: 1 },
  scrollContent: { padding: SIZES.md },
  leadCard: { marginBottom: SIZES.md, padding: SIZES.md },
  leadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.sm },
  momInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  momAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: SIZES.sm },
  momAvatarPlaceholder: { 
    width: 48, height: 48, borderRadius: 24, marginRight: SIZES.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  momAvatarText: { color: COLORS.white, fontSize: SIZES.fontLg, fontFamily: FONTS.heading },
  momDetails: { flex: 1 },
  momName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  momEdd: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 2 },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusFull,
  },
  statusText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium },
  messageBox: { 
    backgroundColor: COLORS.background, 
    padding: SIZES.sm, 
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
  },
  messageLabel: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium, color: COLORS.textSecondary, marginBottom: 4 },
  messageText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textPrimary, fontStyle: 'italic' },
  consultationInfo: { 
    flexDirection: 'row', alignItems: 'center', gap: SIZES.xs,
    marginBottom: SIZES.sm, 
  },
  consultationText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.info },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.sm },
  infoChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoChipText: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textSecondary },
  dateText: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textLight },
  processingContainer: { paddingVertical: SIZES.md, alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: SIZES.xs, flexWrap: 'wrap' },
  actionButton: { 
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, 
    borderRadius: SIZES.radiusMd,
  },
  actionButtonOutline: { 
    backgroundColor: 'transparent', 
    borderWidth: 1, 
    borderColor: COLORS.border,
  },
  actionButtonGhost: { 
    backgroundColor: 'transparent',
    paddingHorizontal: SIZES.sm,
  },
  actionButtonText: { fontSize: SIZES.fontSm, fontFamily: FONTS.bodyMedium, color: COLORS.white },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: SIZES.xxl },
  emptyTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginTop: SIZES.md },
  emptySubtitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.xs },
  // Key Details Section styles
  keyDetailsSection: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  keyDetailsTitle: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.subheading,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SIZES.xs,
  },
  keyDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.sm,
  },
  keyDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: '45%',
  },
  keyDetailItemColumn: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    minWidth: '100%',
    marginTop: SIZES.xs,
  },
  keyDetailLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  keyDetailValueBlock: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginLeft: 18,
    marginTop: 2,
  },
  keyDetailLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  keyDetailValue: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    flex: 1,
  },
  previousExperienceBox: {
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  previousExperienceLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  previousExperienceText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  planCompletionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  planCompletionLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  planCompletionBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  planCompletionText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
  },
});
