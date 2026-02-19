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
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

interface ShareRequest {
  request_id: string;
  mom_user_id: string;
  mom_name: string;
  mom_email?: string;
  mom_picture?: string;
  due_date?: string;
  status: string;
  created_at: string;
}

interface ConnectedClient {
  client_id: string;
  linked_mom_id: string | null;
  name: string;
  email?: string;
  picture?: string;
  edd?: string;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Lead': COLORS.info,
  'Contract Sent': COLORS.warning,
  'Contract Signed': COLORS.success,
  'Active': COLORS.roleDoula,
  'Postpartum': COLORS.accent,
  'Completed': COLORS.textLight,
};

export default function DoulaClientsScreen() {
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<ShareRequest[]>([]);
  const [connectedClients, setConnectedClients] = useState<ConnectedClient[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ShareRequest | null>(null);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  
  const fetchData = async () => {
    try {
      // Fetch pending share requests
      const requestsData = await apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS);
      const pending = (requestsData.requests || []).filter((r: ShareRequest) => r.status === 'pending');
      setPendingRequests(pending);
      
      // Fetch connected clients (accepted share requests become clients)
      const clientsData = await apiRequest(API_ENDPOINTS.DOULA_CLIENTS);
      // Filter to show only linked clients (from share requests)
      const linkedClients = (clientsData || []).filter((c: any) => c.linked_mom_id);
      setConnectedClients(linkedClients);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };
  
  const handleAcceptRequest = async (request: ShareRequest) => {
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
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.roleDoula} />
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleDoula} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Clients</Text>
          <Text style={styles.subtitle}>Moms connected with you</Text>
        </View>
        
        {/* Pending Connection Requests */}
        {pendingRequests.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationCount}>{pendingRequests.length}</Text>
              </View>
              <Text style={styles.sectionTitle}>Pending Requests</Text>
            </View>
            
            {pendingRequests.map((request) => (
              <TouchableOpacity 
                key={request.request_id} 
                activeOpacity={0.8}
                onPress={() => setSelectedRequest(request)}
                data-testid={`pending-request-${request.request_id}`}
              >
                <Card style={styles.requestCard}>
                  <View style={styles.requestHeader}>
                    <View style={styles.requestAvatar}>
                      {request.mom_picture ? (
                        <Image source={{ uri: request.mom_picture }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarInitial}>
                          {request.mom_name?.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.mom_name}</Text>
                      <Text style={styles.requestSubtext}>
                        Wants to add you to their birth team
                      </Text>
                      {request.due_date && (
                        <View style={styles.dueDateRow}>
                          <Icon name="calendar-outline" size={12} color={COLORS.textSecondary} />
                          <Text style={styles.dueDateText}>Due: {formatDate(request.due_date)}</Text>
                        </View>
                      )}
                    </View>
                    <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={styles.declineBtn}
                      onPress={() => handleDeclineRequest(request)}
                      disabled={processingRequest === request.request_id}
                    >
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptRequest(request)}
                      disabled={processingRequest === request.request_id}
                    >
                      {processingRequest === request.request_id ? (
                        <ActivityIndicator size="small" color={COLORS.white} />
                      ) : (
                        <>
                          <Icon name="checkmark" size={16} color={COLORS.white} />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
        
        {/* Connected Clients Section */}
        <Text style={[styles.sectionTitle, pendingRequests.length > 0 && { marginTop: SIZES.lg }]}>
          Active Clients
        </Text>
        
        {connectedClients.filter((c) => c.status !== 'Completed').length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>No Connected Clients</Text>
            <Text style={styles.emptyText}>
              When Moms add you to their birth team from the Marketplace, they'll appear here.
            </Text>
          </Card>
        ) : (
          connectedClients.filter((c) => c.status !== 'Completed').map((client) => (
            <TouchableOpacity 
              key={client.client_id} 
              activeOpacity={0.8}
              onPress={() => router.push(`/view-birth-plan?momId=${client.linked_mom_id}&clientName=${encodeURIComponent(client.name)}`)}
              data-testid={`client-${client.client_id}`}
            >
              <Card style={styles.clientCard}>
                <View style={styles.clientHeader}>
                  <View style={styles.clientAvatar}>
                    {client.picture ? (
                      <Image source={{ uri: client.picture }} style={styles.avatarImage} />
                    ) : (
                      <Text style={styles.clientInitial}>
                        {client.name?.charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: STATUS_COLORS[client.status] || COLORS.textLight },
                        ]}
                      />
                      <Text style={styles.statusText}>{client.status || 'Active'}</Text>
                    </View>
                  </View>
                  <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
                </View>
                
                <View style={styles.clientDetails}>
                  {client.edd && (
                    <View style={styles.detailItem}>
                      <Icon name="calendar-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.detailText}>Due: {formatDate(client.edd)}</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Icon name="document-text-outline" size={14} color={COLORS.primary} />
                    <Text style={[styles.detailText, { color: COLORS.primary }]}>View Birth Plan</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Past Clients Section */}
        {connectedClients.filter((c) => c.status === 'Completed').length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: SIZES.lg }]}>Past Clients</Text>
            {connectedClients.filter((c) => c.status === 'Completed').map((client) => (
              <Card key={client.client_id + '_past'} style={[styles.clientCard, styles.pastClientCard]}>
                <View style={styles.clientHeader}>
                  <View style={[styles.clientAvatar, { backgroundColor: COLORS.textLight + '30' }]}>
                    <Text style={[styles.clientInitial, { color: COLORS.textLight }]}>
                      {client.name?.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.clientInfo}>
                    <Text style={styles.clientName}>{client.name}</Text>
                    <View style={styles.statusRow}>
                      <View style={[styles.statusDot, { backgroundColor: COLORS.textLight }]} />
                      <Text style={styles.statusText}>Completed</Text>
                    </View>
                  </View>
                </View>
              </Card>
            ))}
          </>
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
                <View style={styles.modalAvatar}>
                  {selectedRequest.mom_picture ? (
                    <Image source={{ uri: selectedRequest.mom_picture }} style={styles.modalAvatarImage} />
                  ) : (
                    <Text style={styles.modalAvatarInitial}>
                      {selectedRequest.mom_name?.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <Text style={styles.modalName}>{selectedRequest.mom_name}</Text>
                {selectedRequest.mom_email && (
                  <Text style={styles.modalEmail}>{selectedRequest.mom_email}</Text>
                )}
              </View>
              
              <Card style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Request Details</Text>
                
                <View style={styles.detailRow}>
                  <Icon name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Expected Due Date</Text>
                    <Text style={styles.detailValue}>
                      {selectedRequest.due_date ? formatDate(selectedRequest.due_date) : 'Not provided'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Icon name="time-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Request Sent</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedRequest.created_at)}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <Icon name="document-text-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.detailInfo}>
                    <Text style={styles.detailLabel}>Birth Plan</Text>
                    <Text style={styles.detailValue}>Available after accepting</Text>
                  </View>
                </View>
              </Card>
              
              <Text style={styles.infoText}>
                By accepting this request, {selectedRequest.mom_name} will be added to your client list and you'll have access to their birth plan.
              </Text>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalDeclineBtn}
              onPress={() => selectedRequest && handleDeclineRequest(selectedRequest)}
              disabled={!!processingRequest}
            >
              <Text style={styles.modalDeclineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalAcceptBtn}
              onPress={() => selectedRequest && handleAcceptRequest(selectedRequest)}
              disabled={!!processingRequest}
            >
              {processingRequest ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.modalAcceptBtnText}>Accept & Connect</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  header: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  notificationBadge: {
    backgroundColor: COLORS.error,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  notificationCount: {
    color: COLORS.white,
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: SIZES.sm,
  },
  // Request Card Styles
  requestCard: {
    marginBottom: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  requestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  avatarInitial: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  requestSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dueDateText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.sm,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  declineBtn: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  declineBtnText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.roleDoula,
    gap: 4,
  },
  acceptBtnText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.white,
  },
  // Empty State
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.lg,
  },
  // Client Card Styles
  clientCard: {
    marginBottom: SIZES.sm,
  },
  pastClientCard: {
    opacity: 0.7,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleDoula + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  clientInitial: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.roleDoula,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  clientDetails: {
    flexDirection: 'row',
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.md,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
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
  modalProfile: {
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  modalAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalAvatarInitial: {
    fontSize: SIZES.fontHero,
    fontFamily: FONTS.heading,
    color: COLORS.primary,
  },
  modalName: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  modalEmail: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  detailCard: {
    marginBottom: SIZES.md,
  },
  detailCardTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailInfo: {
    marginLeft: SIZES.md,
    flex: 1,
  },
  detailLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  infoText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.md,
    marginTop: SIZES.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SIZES.md,
    gap: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalDeclineBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalDeclineBtnText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  modalAcceptBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.roleDoula,
    gap: SIZES.sm,
  },
  modalAcceptBtnText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.white,
  },
});
