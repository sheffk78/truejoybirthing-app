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
  planned_birth_setting?: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  'Prenatal': COLORS.roleMidwife,
  'Contract Sent': COLORS.warning,
  'Contract Signed': COLORS.success,
  'In Labor': COLORS.error,
  'Postpartum': COLORS.accent,
  'Completed': COLORS.textLight,
};

export default function MidwifeClientsScreen() {
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
      
      // Fetch all clients (both manually added and from share requests)
      const clientsData = await apiRequest(API_ENDPOINTS.MIDWIFE_CLIENTS);
      setConnectedClients(clientsData || []);
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
          <ActivityIndicator size="large" color={COLORS.roleMidwife} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Clients</Text>
        </View>

        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="time-outline" size={20} color={COLORS.warning} />
              <Text style={styles.sectionTitle}>Pending Requests ({pendingRequests.length})</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Moms who want to connect with you from the Marketplace
            </Text>
            
            {pendingRequests.map((request) => (
              <TouchableOpacity
                key={request.request_id}
                activeOpacity={0.8}
                onPress={() => setSelectedRequest(request)}
              >
                <Card style={styles.requestCard}>
                  <View style={styles.requestRow}>
                    {request.mom_picture ? (
                      <Image source={{ uri: request.mom_picture }} style={styles.requestAvatar} />
                    ) : (
                      <View style={styles.requestAvatarPlaceholder}>
                        <Text style={styles.requestInitial}>
                          {request.mom_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.requestInfo}>
                      <Text style={styles.requestName}>{request.mom_name}</Text>
                      {request.due_date && (
                        <Text style={styles.requestDate}>Due: {formatDate(request.due_date)}</Text>
                      )}
                    </View>
                    <View style={styles.requestActions}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleAcceptRequest(request)}
                        disabled={processingRequest === request.request_id}
                      >
                        {processingRequest === request.request_id ? (
                          <ActivityIndicator size="small" color={COLORS.white} />
                        ) : (
                          <Icon name="checkmark" size={18} color={COLORS.white} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleDeclineRequest(request)}
                        disabled={processingRequest === request.request_id}
                      >
                        <Icon name="close" size={18} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Connected Clients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="people-outline" size={20} color={COLORS.roleMidwife} />
            <Text style={styles.sectionTitle}>Active Clients ({connectedClients.length})</Text>
          </View>
          
          {connectedClients.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Icon name="people-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No active clients yet</Text>
              <Text style={styles.emptyText}>
                When Moms find you in the Marketplace and request to connect, they'll appear here for you to accept.
              </Text>
            </Card>
          ) : (
            connectedClients.map((client) => (
              <TouchableOpacity
                key={client.client_id}
                activeOpacity={0.8}
                data-testid={`client-card-${client.client_id}`}
                onPress={() => router.push(`/(midwife)/client-detail?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}`)}
              >
                <Card style={styles.clientCard}>
                  <View style={styles.clientHeader}>
                    {client.picture ? (
                      <Image source={{ uri: client.picture }} style={styles.clientAvatar} />
                    ) : (
                      <View style={styles.clientAvatarPlaceholder}>
                        <Text style={styles.clientInitial}>
                          {client.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.clientInfo}>
                      <Text style={styles.clientName}>{client.name}</Text>
                      <View style={styles.statusRow}>
                        <View
                          style={[
                            styles.statusDot,
                            { backgroundColor: STATUS_COLORS[client.status] || COLORS.textLight },
                          ]}
                        />
                        <Text style={styles.statusText}>{client.status}</Text>
                      </View>
                    </View>
                    <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
                  </View>
                  
                  {(client.edd || client.planned_birth_setting) && (
                    <View style={styles.clientDetails}>
                      {client.edd && (
                        <View style={styles.detailItem}>
                          <Icon name="calendar-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.detailText}>EDD: {formatDate(client.edd)}</Text>
                        </View>
                      )}
                      {client.planned_birth_setting && (
                        <View style={styles.detailItem}>
                          <Icon name="location-outline" size={14} color={COLORS.textSecondary} />
                          <Text style={styles.detailText}>{client.planned_birth_setting}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  
                  {/* View Birth Plan button for linked moms */}
                  {client.linked_mom_id && (
                    <TouchableOpacity
                      style={styles.viewBirthPlanButton}
                      onPress={() => router.push(`/view-birth-plan?momId=${client.linked_mom_id}&clientName=${encodeURIComponent(client.name)}`)}
                      data-testid={`view-birth-plan-${client.client_id}`}
                    >
                      <Icon name="document-text-outline" size={16} color={COLORS.roleMidwife} />
                      <Text style={styles.viewBirthPlanText}>View Birth Plan</Text>
                    </TouchableOpacity>
                  )}
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
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
                {selectedRequest.mom_picture ? (
                  <Image source={{ uri: selectedRequest.mom_picture }} style={styles.modalAvatar} />
                ) : (
                  <View style={styles.modalAvatarPlaceholder}>
                    <Text style={styles.modalInitial}>
                      {selectedRequest.mom_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.modalName}>{selectedRequest.mom_name}</Text>
                {selectedRequest.mom_email && (
                  <Text style={styles.modalEmail}>{selectedRequest.mom_email}</Text>
                )}
                {selectedRequest.due_date && (
                  <View style={styles.modalDueDate}>
                    <Icon name="calendar-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.modalDueDateText}>
                      Due: {formatDate(selectedRequest.due_date)}
                    </Text>
                  </View>
                )}
              </View>
              
              <Card style={styles.modalInfoCard}>
                <Text style={styles.modalInfoTitle}>What this means</Text>
                <Text style={styles.modalInfoText}>
                  By accepting this request, you'll be able to:
                </Text>
                <View style={styles.modalInfoList}>
                  <View style={styles.modalInfoItem}>
                    <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.modalInfoItemText}>View their birth plan</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.modalInfoItemText}>Send and receive messages</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.modalInfoItemText}>Create contracts and invoices</Text>
                  </View>
                  <View style={styles.modalInfoItem}>
                    <Icon name="checkmark-circle" size={16} color={COLORS.success} />
                    <Text style={styles.modalInfoItemText}>Track their care journey</Text>
                  </View>
                </View>
              </Card>
            </ScrollView>
          )}
          
          <View style={styles.modalFooter}>
            <Button
              title="Decline"
              variant="outline"
              onPress={() => selectedRequest && handleDeclineRequest(selectedRequest)}
              style={styles.declineButton}
              loading={processingRequest === selectedRequest?.request_id}
            />
            <Button
              title="Accept"
              onPress={() => selectedRequest && handleAcceptRequest(selectedRequest)}
              style={styles.acceptButton}
              loading={processingRequest === selectedRequest?.request_id}
            />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  sectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
    marginLeft: 28,
  },
  requestCard: {
    marginBottom: SIZES.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warning,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  requestAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.roleMidwife + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestInitial: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.roleMidwife,
  },
  requestInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  requestName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  requestDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.error + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginTop: SIZES.md,
    marginBottom: SIZES.xs,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.md,
  },
  clientCard: {
    marginBottom: SIZES.sm,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  clientAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleMidwife + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitial: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.roleMidwife,
  },
  clientInfo: {
    flex: 1,
    marginLeft: SIZES.md,
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
  viewBirthPlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SIZES.sm,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.md,
    backgroundColor: COLORS.roleMidwife + '10',
    borderRadius: SIZES.radiusSm,
    borderWidth: 1,
    borderColor: COLORS.roleMidwife + '30',
  },
  viewBirthPlanText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.roleMidwife,
    marginLeft: 6,
  },
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
    marginBottom: SIZES.md,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.roleMidwife + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.md,
  },
  modalInitial: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    color: COLORS.roleMidwife,
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
    marginTop: SIZES.xs,
  },
  modalDueDate: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    backgroundColor: COLORS.roleMidwife + '15',
    borderRadius: SIZES.radiusFull,
  },
  modalDueDateText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.roleMidwife,
    marginLeft: SIZES.xs,
  },
  modalInfoCard: {
    marginBottom: SIZES.md,
  },
  modalInfoTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  modalInfoText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  modalInfoList: {
    gap: SIZES.sm,
  },
  modalInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalInfoItemText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SIZES.md,
    gap: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  declineButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
  },
});
