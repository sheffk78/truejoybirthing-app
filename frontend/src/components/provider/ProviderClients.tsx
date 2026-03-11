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
import { SIZES, FONTS } from '../../constants/theme';
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

// Status colors as functions that use theme colors
const getDoulaStatusColors = (colors: ReturnType<typeof useColors>) => ({
  'Lead': colors.info || colors.primary,
  'Contract Sent': colors.warning,
  'Contract Signed': colors.success,
  'Active': colors.roleDoula,
  'Postpartum': colors.accent,
  'Completed': colors.textLight,
});

const getMidwifeStatusColors = (colors: ReturnType<typeof useColors>) => ({
  'Prenatal': colors.roleMidwife,
  'Contract Sent': colors.warning,
  'Contract Signed': colors.success,
  'In Labor': colors.error,
  'Postpartum': colors.accent,
  'Completed': colors.textLight,
});

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
  const STATUS_COLORS = isMidwife ? getMidwifeStatusColors(colors) : getDoulaStatusColors(colors);
  
  const { checkAndAlert, isSubscribed, refreshStatus } = useSubscriptionGate();
  const subscriptionRoute = isMidwife ? '/(midwife)/subscription' : '/(doula)/subscription';
  
  const navigateToSubscription = () => {
    router.push(subscriptionRoute as any);
  };
  
  const fetchData = async () => {
    try {
      const requestsData = await apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS);
      const pending = (requestsData.requests || []).filter((r: ShareRequest) => r.status === 'pending');
      setPendingRequests(pending);
      
      const includeInactive = clientFilter !== 'active';
      const clientsData = await apiRequest(`${config.endpoints.unifiedClients}?include_inactive=${includeInactive}`);
      setConnectedClients(clientsData || []);
      
      try {
        const appointmentsData = await apiRequest(config.endpoints.unifiedAppointments || '/provider/appointments');
        const apptMap: Record<string, boolean> = {};
        const now = new Date();
        for (const apt of (appointmentsData || [])) {
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
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
        <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.filterButton, clientFilter === 'active' && { backgroundColor: primaryColor }]}
            onPress={() => setClientFilter('active')}
            data-testid="filter-active"
          >
            <Text style={[styles.filterText, { color: colors.text }, clientFilter === 'active' && { color: colors.white }]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, clientFilter === 'inactive' && { backgroundColor: primaryColor }]}
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
                    <View style={[styles.requestAvatar, { backgroundColor: colors.primary + '20' }]}>
                      {request.mom_picture ? (
                        <Image source={{ uri: request.mom_picture }} style={styles.avatarImage} />
                      ) : (
                        <Icon name="person" size={24} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={[styles.requestName, { color: colors.text }]}>{request.mom_name}</Text>
                      <Text style={[styles.requestSubtext, { color: colors.textSecondary }]}>Wants to share their birth plan</Text>
                      {(request.birth_plan_due_date || request.edd || request.due_date) && (
                        <Text style={[styles.requestDate, { color: colors.textLight }]}>Due: {formatDate(request.birth_plan_due_date || request.edd || request.due_date || '')}</Text>
                      )}
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textLight} />
                  </View>
                  
                  {/* Key Details Preview */}
                  {(request.number_of_children !== undefined || request.birth_plan_location || request.birth_plan_hospital_name || request.previous_birth_experience) && (
                    <View style={[styles.requestKeyDetails, { borderTopColor: colors.border }]}>
                      <View style={styles.requestDetailsGrid}>
                        {request.number_of_children !== undefined && (
                          <View style={[styles.requestDetailChip, { backgroundColor: colors.background }]}>
                            <Icon name="people-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.requestDetailText, { color: colors.textSecondary }]}>{request.number_of_children} {request.number_of_children === 1 ? 'child' : 'children'}</Text>
                          </View>
                        )}
                        {request.birth_plan_location && (
                          <View style={[styles.requestDetailChip, { backgroundColor: colors.background }]}>
                            <Icon name="home-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.requestDetailText, { color: colors.textSecondary }]}>{request.birth_plan_location}</Text>
                          </View>
                        )}
                        {request.birth_plan_hospital_name && (
                          <View style={[styles.requestDetailChip, { backgroundColor: colors.background }]}>
                            <Icon name="business-outline" size={12} color={colors.textSecondary} />
                            <Text style={[styles.requestDetailText, { color: colors.textSecondary }]}>{request.birth_plan_hospital_name}</Text>
                          </View>
                        )}
                      </View>
                      {request.previous_birth_experience && (
                        <Text style={[styles.requestPreviousExp, { color: colors.textSecondary }]} numberOfLines={2}>
                          Previous: {request.previous_birth_experience}
                        </Text>
                      )}
                      {request.birth_plan_completion !== undefined && (
                        <View style={styles.requestCompletionRow}>
                          <Text style={[styles.requestCompletionLabel, { color: colors.textLight }]}>Birth Plan:</Text>
                          <View style={[styles.requestCompletionBadge, { backgroundColor: request.birth_plan_completion >= 80 ? colors.success + '20' : colors.warning + '20' }]}>
                            <Text style={[styles.requestCompletionText, { color: request.birth_plan_completion >= 80 ? colors.success : colors.warning }]}>
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          <Icon name="people" size={18} color={primaryColor} /> {clientFilter === 'active' ? 'Active' : 'Inactive'} Clients ({filteredClients.length})
        </Text>
        
        {filteredClients.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name={clientFilter === 'active' ? 'people-outline' : 'archive-outline'} size={48} color={colors.textLight} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {clientFilter === 'active' ? 'No Active Clients Yet' : 'No Inactive Clients'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {clientFilter === 'active' 
                ? 'When moms share their birth plans with you and you accept, they\'ll appear here.'
                : 'Clients you mark as inactive will appear here.'}
            </Text>
          </Card>
        ) : (
          filteredClients.map((client) => {
            const statusColor = STATUS_COLORS[client.status as keyof typeof STATUS_COLORS] || colors.textSecondary;
            const hasUpcomingAppt = clientAppointments[client.client_id];
            
            return (
              <TouchableOpacity
                key={client.client_id}
                onPress={() => handleClientPress(client)}
                data-testid={`client-card-${client.client_id}`}
              >
                <Card style={styles.clientCard}>
                  <View style={styles.clientRow}>
                    <View style={[styles.clientAvatar, { backgroundColor: primaryColor + '20' }]}>
                      {client.picture ? (
                        <Image source={{ uri: client.picture }} style={styles.clientAvatarImage} />
                      ) : (
                        <Icon name="person" size={28} color={primaryColor} />
                      )}
                    </View>
                    <View style={styles.clientInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.clientName, { color: colors.text }]}>{client.name}</Text>
                        {hasUpcomingAppt && (
                          <View style={[styles.appointmentBadge, { backgroundColor: colors.accent + '20' }]}>
                            <Icon name="calendar" size={10} color={colors.accent} />
                          </View>
                        )}
                      </View>
                      <Text style={[styles.clientDueDate, { color: colors.textSecondary }]}>
                        Due: {formatDate(client.edd || client.due_date || '')}
                      </Text>
                      {client.planned_birth_setting && (
                        <Text style={[styles.clientSetting, { color: colors.textLight }]}>{client.planned_birth_setting}</Text>
                      )}
                    </View>
                    <View style={styles.clientMeta}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                        <Text style={[styles.statusText, { color: statusColor }]}>{client.status}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={[styles.clientActions, { borderTopColor: colors.border }]}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.primary + '10' }]}
                      onPress={() => {
                        // Navigate directly to birth plan view
                        if (client.linked_mom_id) {
                          router.push(`/view-birth-plan?momId=${client.linked_mom_id}&clientName=${encodeURIComponent(client.name)}`);
                        } else {
                          // Fallback to client detail if no linked mom
                          const baseRoute = isMidwife ? '/(midwife)' : '/(doula)';
                          router.push(`${baseRoute}/client-detail?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}&tab=birthplan`);
                        }
                      }}
                    >
                      <Icon name="clipboard-outline" size={14} color={colors.primary} />
                      <Text style={[styles.actionText, { color: colors.primary }]}>Birth Plan</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: colors.accent + '10' }]}
                      onPress={() => {
                        // Navigate directly to messages for this client
                        // ProviderMessages expects clientUserId (the linked mom's user ID) to auto-open conversation
                        const baseRoute = isMidwife ? '/(midwife)' : '/(doula)';
                        if (client.linked_mom_id) {
                          router.push(`${baseRoute}/messages?clientUserId=${client.linked_mom_id}&clientName=${encodeURIComponent(client.name)}`);
                        } else {
                          router.push(`${baseRoute}/messages?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}`);
                        }
                      }}
                    >
                      <Icon name="chatbubble-outline" size={14} color={colors.accent} />
                      <Text style={[styles.actionText, { color: colors.accent }]}>Message</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      
      {/* Request Detail Modal */}
      <Modal
        visible={!!selectedRequest}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedRequest(null)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Connection Request</Text>
            <TouchableOpacity onPress={() => setSelectedRequest(null)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {selectedRequest && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.modalProfile}>
                <View style={[styles.modalAvatar, { backgroundColor: colors.primary + '20' }]}>
                  {selectedRequest.mom_picture ? (
                    <Image source={{ uri: selectedRequest.mom_picture }} style={styles.modalAvatarImage} />
                  ) : (
                    <Icon name="person" size={48} color={colors.primary} />
                  )}
                </View>
                <Text style={[styles.modalName, { color: colors.text }]}>{selectedRequest.mom_name}</Text>
                {selectedRequest.mom_email && (
                  <Text style={[styles.modalEmail, { color: colors.textSecondary }]}>{selectedRequest.mom_email}</Text>
                )}
              </View>
              
              <Card style={styles.modalInfoCard}>
                {(selectedRequest.birth_plan_due_date || selectedRequest.edd || selectedRequest.due_date) && (
                  <View style={styles.modalInfoRow}>
                    <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.modalInfoText}>
                      <Text style={[styles.modalInfoLabel, { color: colors.textLight }]}>Due Date</Text>
                      <Text style={[styles.modalInfoValue, { color: colors.text }]}>{formatDate(selectedRequest.birth_plan_due_date || selectedRequest.edd || selectedRequest.due_date || '')}</Text>
                    </View>
                  </View>
                )}
                {selectedRequest.birth_plan_location && (
                  <View style={styles.modalInfoRow}>
                    <Icon name="home-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.modalInfoText}>
                      <Text style={[styles.modalInfoLabel, { color: colors.textLight }]}>Planned Setting</Text>
                      <Text style={[styles.modalInfoValue, { color: colors.text }]}>{selectedRequest.birth_plan_location}</Text>
                    </View>
                  </View>
                )}
                {selectedRequest.birth_plan_hospital_name && (
                  <View style={styles.modalInfoRow}>
                    <Icon name="business-outline" size={20} color={colors.textSecondary} />
                    <View style={styles.modalInfoText}>
                      <Text style={[styles.modalInfoLabel, { color: colors.textLight }]}>Facility</Text>
                      <Text style={[styles.modalInfoValue, { color: colors.text }]}>{selectedRequest.birth_plan_hospital_name}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.modalInfoRow}>
                  <Icon name="time-outline" size={20} color={colors.textSecondary} />
                  <View style={styles.modalInfoText}>
                    <Text style={[styles.modalInfoLabel, { color: colors.textLight }]}>Request Sent</Text>
                    <Text style={[styles.modalInfoValue, { color: colors.text }]}>{formatDate(selectedRequest.created_at)}</Text>
                  </View>
                </View>
              </Card>
              
              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                {selectedRequest.mom_name} would like to share their birth plan with you. 
                By accepting, you'll be able to view their birth preferences and communicate with them directly.
              </Text>
            </ScrollView>
          )}
          
          <View style={[styles.modalFooter, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
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
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { marginBottom: SIZES.sm },
  title: { fontSize: SIZES.fontXxl, fontFamily: FONTS.heading },
  subtitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, marginTop: 4 },
  
  filterContainer: { flexDirection: 'row', borderRadius: SIZES.radiusMd, padding: 4, marginBottom: SIZES.md },
  filterButton: { flex: 1, paddingVertical: SIZES.sm, alignItems: 'center', borderRadius: SIZES.radiusSm },
  filterText: { fontSize: SIZES.fontSm, fontWeight: '600' },
  
  sectionTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.subheading, marginBottom: SIZES.md, marginTop: SIZES.md },
  
  requestCard: { marginBottom: SIZES.sm, borderLeftWidth: 3 },
  requestRow: { flexDirection: 'row', alignItems: 'center' },
  requestAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 48, height: 48, borderRadius: 24 },
  requestInfo: { flex: 1, marginLeft: SIZES.md },
  requestName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold },
  requestSubtext: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, marginTop: 2 },
  requestDate: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, marginTop: 4 },
  requestKeyDetails: { marginTop: SIZES.sm, paddingTop: SIZES.sm, borderTopWidth: 1 },
  requestDetailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  requestDetailChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusFull },
  requestDetailText: { fontSize: SIZES.fontXs, fontFamily: FONTS.body },
  requestPreviousExp: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, fontStyle: 'italic', marginTop: SIZES.xs },
  requestCompletionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: SIZES.xs },
  requestCompletionLabel: { fontSize: SIZES.fontXs, fontFamily: FONTS.body },
  requestCompletionBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusFull },
  requestCompletionText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium },
  
  clientCard: { marginBottom: SIZES.sm },
  clientRow: { flexDirection: 'row', alignItems: 'center' },
  clientAvatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  clientAvatarImage: { width: 56, height: 56, borderRadius: 28 },
  clientInfo: { flex: 1, marginLeft: SIZES.md },
  clientName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold },
  clientDueDate: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, marginTop: 2 },
  clientSetting: { fontSize: SIZES.fontXs, fontFamily: FONTS.body, marginTop: 2 },
  clientMeta: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium },
  appointmentBadge: { padding: 4, borderRadius: 10 },
  clientActions: { flexDirection: 'row', marginTop: SIZES.md, paddingTop: SIZES.sm, borderTopWidth: 1, gap: SIZES.sm },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.sm, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusSm },
  actionText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyMedium, marginLeft: 4 },
  
  emptyCard: { alignItems: 'center', paddingVertical: SIZES.xl },
  emptyText: { fontSize: SIZES.fontLg, fontFamily: FONTS.bodyBold, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, textAlign: 'center', paddingHorizontal: SIZES.lg, marginTop: SIZES.xs },
  
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1 },
  modalTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.subheading },
  modalContent: { flex: 1, padding: SIZES.md },
  modalProfile: { alignItems: 'center', marginBottom: SIZES.lg },
  modalAvatar: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: SIZES.md },
  modalAvatarImage: { width: 100, height: 100, borderRadius: 50 },
  modalName: { fontSize: SIZES.fontXl, fontFamily: FONTS.heading },
  modalEmail: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, marginTop: 4 },
  modalInfoCard: { marginBottom: SIZES.md },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SIZES.sm },
  modalInfoText: { marginLeft: SIZES.md },
  modalInfoLabel: { fontSize: SIZES.fontXs, fontFamily: FONTS.body },
  modalInfoValue: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyMedium },
  modalDescription: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, lineHeight: 22 },
  modalFooter: { flexDirection: 'row', padding: SIZES.md, gap: SIZES.md, borderTopWidth: 1 },
  declineBtn: { flex: 1 },
  acceptBtn: { flex: 1 },
});
