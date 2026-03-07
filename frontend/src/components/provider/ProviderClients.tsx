// Shared Clients Screen for Doula and Midwife
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
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { useColors } from '../../hooks/useThemedStyles';
import { ProviderConfig } from './config/providerConfig';
import { useSubscriptionGate } from '../../utils/subscriptionGate';

interface ShareRequest {
  request_id: string;
  mom_user_id: string;
  mom_name: string;
  mom_email?: string;
  mom_picture?: string;
  due_date?: string;
  status: string;
  created_at: string;
  // New fields - from mom profile & birth plan
  edd?: string;
  planned_birth_setting?: string;
  number_of_children?: number;
  birth_plan_completion?: number;
  birth_plan_due_date?: string;
  birth_plan_location?: string;
  birth_plan_hospital_name?: string;
  previous_birth_experience?: string;
}

interface ConnectedClient {
  client_id: string;
  linked_mom_id: string | null;
  name: string;
  email?: string;
  picture?: string;
  edd?: string;
  due_date?: string;
  status: string;
  planned_birth_setting?: string;
  created_at: string;
  is_active?: boolean;
}

const DOULA_STATUS_COLORS: Record<string, string> = {
  'Lead': COLORS.info || COLORS.primary,
  'Contract Sent': COLORS.warning,
  'Contract Signed': COLORS.success,
  'Active': COLORS.roleDoula,
  'Postpartum': COLORS.accent,
  'Completed': COLORS.textLight,
};

const MIDWIFE_STATUS_COLORS: Record<string, string> = {
  'Prenatal': COLORS.roleMidwife,
  'Contract Sent': COLORS.warning,
  'Contract Signed': COLORS.success,
  'In Labor': COLORS.error,
  'Postpartum': COLORS.accent,
  'Completed': COLORS.textLight,
};

type ClientFilter = 'active' | 'inactive';

interface ProviderClientsProps {
  config: ProviderConfig;
}

export default function ProviderClients({ config }: ProviderClientsProps) {
  const router = useRouter();
  const colors = useColors();
  const [pendingRequests, setPendingRequests] = useState<ShareRequest[]>([]);
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  const [clientAppointments, setClientAppointments] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ShareRequest | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<ClientFilter>('active');

  const primaryColor = config.primaryColor;
  const isMidwife = config.role === 'MIDWIFE';
  const STATUS_COLORS = isMidwife ? MIDWIFE_STATUS_COLORS : DOULA_STATUS_COLORS;
  
  // Subscription gatekeeping
  const { checkAndAlert, isSubscribed, refreshStatus } = useSubscriptionGate();
  const subscriptionRoute = isMidwife ? '/(midwife)/subscription' : '/(doula)/subscription';
  
  const navigateToSubscription = () => {
    router.push(subscriptionRoute as any);
  };
  
  const fetchData = async () => {
    try {
      // Fetch pending share requests
      const requestsData = await apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS);
      const pending = (requestsData.requests || []).filter((r: ShareRequest) => r.status === 'pending');
      setPendingRequests(pending);
      
      // Use unified endpoint with include_inactive param
      const includeInactive = clientFilter !== 'active';
      const clientsData = await apiRequest(`${config.endpoints.unifiedClients}?include_inactive=${includeInactive}`);
      setConnectedClients(clientsData || []);
      
      // Fetch appointments to check which clients have upcoming appointments
      try {
        const appointmentsData = await apiRequest(config.endpoints.unifiedAppointments || '/provider/appointments');
        const apptMap: Record<string, boolean> = {};
        const now = new Date();
        for (const apt of (appointmentsData || [])) {
          // Check if appointment is upcoming (accepted/pending and in the future)
          if (['pending', 'accepted', 'scheduled', 'confirmed'].includes(apt.status)) {
            const aptDate = new Date(apt.appointment_date);
            if (aptDate >= now || apt.status === 'pending') {
              const clientId = apt.client_id || apt.mom_id || apt.mom_user_id;
              if (clientId) apptMap[clientId] = true;
            }
          }
        }
        setClientAppointments(apptMap);
      } catch (e) {
        console.log('Could not fetch appointments for badges');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to legacy endpoint if unified fails
      try {
        const clientsData = await apiRequest(config.endpoints.clients);
        if (isMidwife) {
          setConnectedClients(clientsData || []);
        } else {
          const linkedClients = (clientsData || []).filter((c: any) => c.linked_mom_id);
          setConnectedClients(linkedClients);
        }
      } catch (e) {
        console.error('Fallback failed:', e);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [clientFilter]);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };
  
  const handleAcceptRequest = async (request: ShareRequest) => {
    // Check subscription before accepting
    if (!checkAndAlert('accept_client', navigateToSubscription)) {
      return;
    }
    
    setProcessingRequest(request.request_id);
    try {
      await apiRequest(`${API_ENDPOINTS.PROVIDER_SHARE_REQUESTS}/${request.request_id}/respond`, {
        method: 'PUT',
        body: { action: 'accept' },
      });
      Alert.alert('Welcome!', `${request.mom_name} is now connected with you. You can view their birth plan and communicate with them.`);
      setSelectedRequest(null);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineRequest = async (request: ShareRequest) => {
    Alert.alert(
      'Decline Request',
      `Are you sure you want to decline ${request.mom_name}'s request to connect?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingRequest(request.request_id);
            try {
              await apiRequest(`${API_ENDPOINTS.PROVIDER_SHARE_REQUESTS}/${request.request_id}/respond`, {
                method: 'PUT',
                body: { action: 'decline' },
              });
              setSelectedRequest(null);
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to decline request');
            } finally {
              setProcessingRequest(null);
            }
          },
        },
      ]
    );
  };

  const handleClientPress = (client: ConnectedClient) => {
    // Navigate to unified client detail page for both roles
    const baseRoute = isMidwife ? '/(midwife)' : '/(doula)';
    router.push(`${baseRoute}/client-detail?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}`);
  };
  
  const filteredClients = connectedClients.filter(client => {
    if (clientFilter === 'active') return client.is_active !== false && client.status !== 'Lead';
    if (clientFilter === 'inactive') return client.is_active === false;
    return true;
  });
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']} data-testid={`${config.role.toLowerCase()}-clients-screen`}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>My Clients</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Manage your client relationships</Text>
        </View>
        
        {/* Active/Inactive Filter Toggle */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface }, clientFilter === 'active' && { backgroundColor: primaryColor }]}
            onPress={() => setClientFilter('active')}
            data-testid="filter-active"
          >
            <Text style={[styles.filterText, { color: colors.text }, clientFilter === 'active' && { color: colors.white }]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface }, clientFilter === 'inactive' && { backgroundColor: primaryColor }]}
            onPress={() => setClientFilter('inactive')}
            data-testid="filter-inactive"
          >
            <Text style={[styles.filterText, { color: colors.text }, clientFilter === 'inactive' && { color: colors.white }]}>Inactive</Text>
          </TouchableOpacity>
        </View>
        
        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              <Icon name="heart" size={18} color={primaryColor} /> Pending Requests ({pendingRequests.length})
            </Text>
            {pendingRequests.map((request) => (
              <TouchableOpacity
                key={request.request_id}
                onPress={() => setSelectedRequest(request)}
                data-testid={`pending-request-${request.request_id}`}
              >
                <Card style={[styles.requestCard, { borderLeftColor: primaryColor }]}>
                  <View style={styles.requestRow}>
                    <View style={[styles.requestAvatar, { backgroundColor: COLORS.primary + '20' }]}>
                      {request.mom_picture ? (
                        <Image source={{ uri: request.mom_picture }} style={styles.avatarImage} />
                      ) : (
                        <Icon name="person" size={24} color={COLORS.primary} />
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.mom_name}</Text>
                      <Text style={styles.requestSubtext}>Wants to share their birth plan</Text>
                      {(request.birth_plan_due_date || request.edd || request.due_date) && (
                        <Text style={styles.requestDate}>Due: {formatDate(request.birth_plan_due_date || request.edd || request.due_date || '')}</Text>
                      )}
                    </View>
                    <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
                  </View>
                  
                  {/* Key Details Preview */}
                  {(request.number_of_children !== undefined || request.birth_plan_location || request.birth_plan_hospital_name || request.previous_birth_experience) && (
                    <View style={styles.requestKeyDetails}>
                      <View style={styles.requestDetailsGrid}>
                        {request.number_of_children !== undefined && (
                          <View style={styles.requestDetailChip}>
                            <Icon name="people-outline" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.requestDetailText}>{request.number_of_children} {request.number_of_children === 1 ? 'child' : 'children'}</Text>
                          </View>
                        )}
                        {request.birth_plan_location && (
                          <View style={styles.requestDetailChip}>
                            <Icon name="home-outline" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.requestDetailText}>{request.birth_plan_location}</Text>
                          </View>
                        )}
                        {request.birth_plan_hospital_name && (
                          <View style={styles.requestDetailChip}>
                            <Icon name="business-outline" size={12} color={COLORS.textSecondary} />
                            <Text style={styles.requestDetailText}>{request.birth_plan_hospital_name}</Text>
                          </View>
                        )}
                      </View>
                      {request.previous_birth_experience && (
                        <Text style={styles.requestPreviousExp} numberOfLines={2}>
                          Previous: {request.previous_birth_experience}
                        </Text>
                      )}
                      {request.birth_plan_completion !== undefined && (
                        <View style={styles.requestCompletionRow}>
                          <Text style={styles.requestCompletionLabel}>Birth Plan:</Text>
                          <View style={[styles.requestCompletionBadge, { backgroundColor: request.birth_plan_completion >= 80 ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                            <Text style={[styles.requestCompletionText, { color: request.birth_plan_completion >= 80 ? COLORS.success : COLORS.warning }]}>
                              {request.birth_plan_completion}%
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
        
        {/* Connected Clients Section */}
        <Text style={styles.sectionTitle}>
          <Icon name="people" size={18} color={primaryColor} /> {clientFilter === 'active' ? 'Active' : clientFilter === 'inactive' ? 'Inactive' : 'All'} Clients ({filteredClients.length})
        </Text>
        
        {filteredClients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyText}>
              {clientFilter === 'inactive' ? 'No inactive clients' : 'No clients yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {clientFilter === 'active' 
                ? 'When moms share their birth plan with you, they\'ll appear here.'
                : clientFilter === 'inactive'
                ? 'Clients become inactive 6 weeks after their due date.'
                : 'Use the filters above to view active or inactive clients.'}
            </Text>
          </Card>
        ) : (
          filteredClients.map((client) => (
            <TouchableOpacity
              key={client.client_id}
              onPress={() => handleClientPress(client)}
              data-testid={`client-${client.client_id}`}
            >
              <Card style={[styles.clientCard, !client.is_active && { opacity: 0.7 }]}>
                <View style={styles.clientRow}>
                  <View style={[styles.clientAvatar, { backgroundColor: primaryColor + '20' }]}>
                    {client.picture ? (
                      <Image source={{ uri: client.picture }} style={styles.clientAvatarImage} />
                    ) : (
                      <Icon name="person" size={28} color={primaryColor} />
                    )}
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    {client.edd && (
                      <Text style={styles.clientDueDate}>Due: {formatDate(client.edd)}</Text>
                    )}
                    {isMidwife && client.planned_birth_setting && (
                      <Text style={styles.clientSetting}>{client.planned_birth_setting}</Text>
                    )}
                  </View>
                  <View style={styles.clientMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[client.status] || COLORS.textLight) + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[client.status] || COLORS.textLight }]}>
                        {client.status}
                      </Text>
                    </View>
                    {isMidwife && (
                      <Icon name="chevron-forward" size={20} color={COLORS.textLight} style={{ marginTop: 8 }} />
                    )}
                  </View>
                </View>
                
                {/* Action buttons */}
                <View style={styles.clientActions}>
                  {client.linked_mom_id && (
                    <TouchableOpacity 
                      style={styles.actionButton} 
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push(`${config.routes.messages}?userId=${client.linked_mom_id}&userName=${encodeURIComponent(client.name)}` as any);
                      }}
                      data-testid={`message-btn-${client.client_id}`}
                    >
                      <Icon name="chatbubble-outline" size={16} color={primaryColor} />
                      <Text style={[styles.actionText, { color: primaryColor }]}>Message</Text>
                    </TouchableOpacity>
                  )}
                  {client.linked_mom_id && (
                    <View style={[styles.actionButton, { backgroundColor: COLORS.success + '10' }]}>
                      <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                      <Text style={[styles.actionText, { color: COLORS.success }]}>Plan Shared</Text>
                    </View>
                  )}
                  {(clientAppointments[client.client_id] || clientAppointments[client.linked_mom_id]) && (
                    <View style={[styles.actionButton, { backgroundColor: COLORS.primary + '10' }]}>
                      <Icon name="calendar" size={16} color={COLORS.primary} />
                      <Text style={[styles.actionText, { color: COLORS.primary }]}>Appt</Text>
                    </View>
                  )}
                  {isMidwife && (
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: primaryColor + '10' }]}
                      onPress={() => handleClientPress(client)}
                    >
                      <Icon name="clipboard-outline" size={16} color={primaryColor} />
                      <Text style={[styles.actionText, { color: primaryColor }]}>Prenatal Visits</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Request Detail Modal */}
      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedRequest(null)}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Connection Request</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {selectedRequest && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalProfile}>
                <View style={[styles.modalAvatar, { backgroundColor: COLORS.primary + '20' }]}>
                  {selectedRequest.mom_picture ? (
                    <Image source={{ uri: selectedRequest.mom_picture }} style={styles.modalAvatarImage} />
                  ) : (
                    <Icon name="person" size={48} color={COLORS.primary} />
                  )}
                </View>
                <Text style={styles.modalName}>{selectedRequest.mom_name}</Text>
                {selectedRequest.mom_email && (
                  <Text style={styles.modalEmail}>{selectedRequest.mom_email}</Text>
                )}
              </View>
              
              <Card style={styles.modalInfoCard}>
                <View style={styles.modalInfoRow}>
                  <Icon name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.modalInfoText}>
                    <Text style={styles.modalInfoLabel}>Due Date</Text>
                    <Text style={styles.modalInfoValue}>
                      {selectedRequest.due_date ? formatDate(selectedRequest.due_date) : 'Not specified'}
                    </Text>
                  </View>
                </View>
                <View style={styles.modalInfoRow}>
                  <Icon name="time-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.modalInfoText}>
                    <Text style={styles.modalInfoLabel}>Request Sent</Text>
                    <Text style={styles.modalInfoValue}>{formatDate(selectedRequest.created_at)}</Text>
                  </View>
                </View>
              </Card>
              
              <Text style={styles.modalDescription}>
                {selectedRequest.mom_name} would like to share their birth plan with you. 
                By accepting, you'll be able to view their birth preferences and communicate with them directly.
              </Text>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <Button
              title="Decline"
              variant="outline"
              onPress={() => selectedRequest && handleDeclineRequest(selectedRequest)}
              disabled={!!processingRequest}
              style={styles.declineBtn}
            />
            <Button
              title={processingRequest ? 'Accepting...' : 'Accept'}
              onPress={() => selectedRequest && handleAcceptRequest(selectedRequest)}
              disabled={!!processingRequest}
              style={[styles.acceptBtn, { backgroundColor: primaryColor }]}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { marginBottom: SIZES.sm },
  title: { fontSize: SIZES.fontXxl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 4 },
  
  // Filter toggle
  filterContainer: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: 4, marginBottom: SIZES.md },
  filterButton: { flex: 1, paddingVertical: SIZES.sm, alignItems: 'center', borderRadius: SIZES.radiusSm },
  filterText: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textSecondary },
  
  sectionTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.subheading, color: COLORS.textPrimary, marginBottom: SIZES.md, marginTop: SIZES.md },
  
  // Request cards
  requestCard: { marginBottom: SIZES.sm, borderLeftWidth: 3 },
  requestRow: { flexDirection: 'row', alignItems: 'center' },
  requestAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  requestInfo: { flex: 1, marginLeft: SIZES.md },
  requestName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  requestSubtext: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 2 },
  requestDate: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textLight, marginTop: 4 },
  // Request key details
  requestKeyDetails: { marginTop: SIZES.sm, paddingTop: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.border },
  requestDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  requestDetailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  requestDetailText: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textSecondary },
  requestPreviousExp: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: SIZES.xs },
  requestCompletionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SIZES.xs },
  requestCompletionLabel: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textLight },
  requestCompletionBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusFull },
  requestCompletionText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium },
  
  // Client cards
  clientCard: { marginBottom: SIZES.sm },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  clientAvatarImage: { width: 56, height: 56, borderRadius: 28 },
  clientInfo: { flex: 1, marginLeft: SIZES.md },
  clientName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  clientDueDate: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 2 },
  clientSetting: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textLight, marginTop: 2 },
  clientMeta: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium },
  clientActions: { flexDirection: 'row', marginTop: SIZES.md, paddingTop: SIZES.sm, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SIZES.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusSm },
  actionText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium, marginLeft: 4 },
  
  // Empty state
  emptyCard: { alignItems: 'center', paddingVertical: SIZES.xl },
  emptyText: { fontSize: SIZES.fontLg, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: SIZES.lg, marginTop: SIZES.xs },
  
  // Modal styles
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  modalTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.subheading, color: COLORS.textPrimary },
  modalContent: { flex: 1, padding: SIZES.md },
  modalProfile: { alignItems: 'center', marginBottom: SIZES.lg },
  modalAvatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.md },
  modalAvatarImage: { width: 100, height: 100, borderRadius: 50 },
  modalName: { fontSize: SIZES.fontXl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  modalEmail: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textSecondary, marginTop: 4 },
  modalInfoCard: { marginBottom: SIZES.md },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm },
  modalInfoText: { marginLeft: SIZES.md },
  modalInfoLabel: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, color: COLORS.textLight },
  modalInfoValue: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyMedium, color: COLORS.textPrimary },
  modalDescription: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textSecondary, lineHeight: 22 },
  modalFooter: { flexDirection: 'row', padding: SIZES.md, gap: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.white },
  declineBtn: { flex: 1 },
  acceptBtn: { flex: 1 },
});
