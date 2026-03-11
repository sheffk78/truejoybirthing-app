import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, SHADOWS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

interface ShareRequest {
  request_id: string;
  mom_user_id: string;
  mom_name: string;
  status: string;
  created_at: string;
}

interface SharedBirthPlan {
  mom_user_id: string;
  mom_name: string;
  due_date: string | null;
  birth_setting: string | null;
  plan: any;
  provider_notes: any[];
  shared_at: string;
}

interface ProviderNote {
  note_id: string;
  section_id: string;
  provider_name: string;
  note_content: string;
  created_at: string;
}

const SECTION_TITLES: Record<string, string> = {
  'about_me': 'About Me & My Preferences',
  'labor_delivery': 'Labor & Delivery Preferences',
  'pain_management': 'Pain Management',
  'monitoring_iv': 'Labor Environment & Comfort',
  'induction_interventions': 'Induction & Birth Interventions',
  'pushing_safe_word': 'Pushing, Delivery & Safe Word',
  'post_delivery': 'Post-Delivery Preferences',
  'newborn_care': 'Newborn Care Preferences',
  'other_considerations': 'Other Important Considerations',
};

export default function ClientBirthPlansScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
  const momUserId = params.momUserId as string | undefined;
  const clientName = params.clientName as string | undefined;
  const clientId = params.clientId as string | undefined;
  const returnTo = params.returnTo as string | undefined;
  
  const [pendingRequests, setPendingRequests] = useState<ShareRequest[]>([]);
  const [sharedBirthPlans, setSharedBirthPlans] = useState<SharedBirthPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  
  // Modal states
  const [selectedPlan, setSelectedPlan] = useState<SharedBirthPlan | null>(null);
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  
  // Back navigation handler
  const handleBack = () => {
    if (returnTo) {
      router.push(returnTo as any);
    } else {
      router.back();
    }
  };

  const fetchData = async () => {
    try {
      // If momUserId is provided, fetch specific birth plan directly
      if (momUserId) {
        const planData = await apiRequest(`${API_ENDPOINTS.PROVIDER_SHARED_BIRTH_PLAN}/${momUserId}`);
        if (planData && planData.plan) {
          const transformedPlan: SharedBirthPlan = {
            mom_user_id: momUserId,
            mom_name: planData.mom?.full_name || clientName || 'Unknown',
            due_date: planData.mom_profile?.due_date || null,
            birth_setting: planData.mom_profile?.planned_birth_setting || null,
            plan: planData.plan,
            provider_notes: planData.provider_notes || [],
            shared_at: new Date().toISOString(),
          };
          setSharedBirthPlans([transformedPlan]);
          // Auto-open the plan detail modal
          setSelectedPlan(transformedPlan);
          setPlanModalVisible(true);
        }
        setPendingRequests([]);
      } else {
        // Fetch all shared plans (original behavior)
        const [requestsData, plansData] = await Promise.all([
          apiRequest(API_ENDPOINTS.PROVIDER_SHARE_REQUESTS),
          apiRequest(API_ENDPOINTS.PROVIDER_SHARED_BIRTH_PLANS),
        ]);
        
        setPendingRequests(requestsData.requests?.filter((r: ShareRequest) => r.status === 'pending') || []);
        setSharedBirthPlans(plansData.birth_plans || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      // If specific plan not found, show empty state
      if (momUserId) {
        Alert.alert('Not Available', 'This birth plan is not available or has not been shared with you.');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    setRespondingTo(requestId);
    try {
      await apiRequest(`${API_ENDPOINTS.PROVIDER_SHARE_REQUESTS}/${requestId}/respond`, {
        method: 'PUT',
        body: { action },
      });
      Alert.alert('Success', `Request ${action}ed`);
      await fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond to request');
    } finally {
      setRespondingTo(null);
    }
  };

  const openPlanDetail = (plan: SharedBirthPlan) => {
    setSelectedPlan(plan);
    setPlanModalVisible(true);
  };

  const openNoteModal = (sectionId: string, existingNote?: ProviderNote) => {
    setSelectedSection(sectionId);
    if (existingNote) {
      // Editing existing note
      setEditingNoteId(existingNote.note_id);
      setNewNote(existingNote.note_content);
    } else {
      // Creating new note
      setEditingNoteId(null);
      setNewNote('');
    }
    setNoteModalVisible(true);
  };

  const saveNote = async () => {
    if (!selectedPlan || !selectedSection || !newNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    setSavingNote(true);
    try {
      if (editingNoteId) {
        // Update existing note
        await apiRequest(`/provider/birth-plan-notes/${editingNoteId}`, {
          method: 'PUT',
          body: {
            note_content: newNote.trim(),
          },
        });
        Alert.alert('Success', 'Note updated');
      } else {
        // Create new note
        await apiRequest(`${API_ENDPOINTS.PROVIDER_BIRTH_PLAN_NOTES}/${selectedPlan.mom_user_id}/notes`, {
          method: 'POST',
          body: {
            section_id: selectedSection,
            note_content: newNote.trim(),
          },
        });
        Alert.alert('Success', 'Note saved');
      }
      setNoteModalVisible(false);
      setNewNote('');
      setSelectedSection(null);
      setEditingNoteId(null);
      await fetchData();
      
      // Update selected plan with new data
      const updatedPlansData = await apiRequest(API_ENDPOINTS.PROVIDER_SHARED_BIRTH_PLANS);
      const updatedPlan = updatedPlansData.birth_plans?.find(
        (p: SharedBirthPlan) => p.mom_user_id === selectedPlan.mom_user_id
      );
      if (updatedPlan) {
        setSelectedPlan(updatedPlan);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const getSectionNotes = (sectionId: string): ProviderNote[] => {
    return selectedPlan?.provider_notes.filter((n: ProviderNote) => n.section_id === sectionId) || [];
  };

  // Format field labels for better readability
  const formatFieldLabel = (key: string): string => {
    // Convert camelCase to Title Case with spaces
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // If viewing a specific client's birth plan (came from client detail)
  const isClientSpecificView = !!momUserId;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Breadcrumb Navigation */}
      {isClientSpecificView && (
        <View style={styles.breadcrumb}>
          <TouchableOpacity 
            onPress={() => {
              // Use returnTo param to determine correct client route
              if (returnTo && returnTo.includes('midwife')) {
                router.push('/(midwife)/clients' as any);
              } else {
                router.push('/(doula)/clients' as any);
              }
            }}
            style={styles.breadcrumbItem}
          >
            <Text style={styles.breadcrumbLink}>Clients</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <TouchableOpacity 
            onPress={() => {
              // Navigate to client detail page using the clientId param
              if (returnTo && returnTo.includes('midwife')) {
                router.push({ 
                  pathname: '/(midwife)/client-detail' as any, 
                  params: { clientId: clientId, clientName: clientName } 
                });
              } else {
                router.push({ 
                  pathname: '/(doula)/client-detail' as any, 
                  params: { clientId: clientId, clientName: clientName } 
                });
              }
            }}
            style={styles.breadcrumbItem}
          >
            <Text style={styles.breadcrumbLink}>{clientName}</Text>
          </TouchableOpacity>
          <Text style={styles.breadcrumbSeparator}>›</Text>
          <Text style={styles.breadcrumbCurrent}>Birth Plan</Text>
        </View>
      )}
      
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Client Birth Plans</Text>
        <Text style={styles.subtitle}>
          Review birth plans shared with you and add your professional notes
        </Text>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests</Text>
            {pendingRequests.map((request) => (
              <Card key={request.request_id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={styles.requestAvatar}>
                    <Icon name="person" size={20} color={colors.white} />
                  </View>
                  <View style={styles.requestDetails}>
                    <Text style={styles.requestName}>{request.mom_name}</Text>
                    <Text style={styles.requestDate}>
                      Requested {new Date(request.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => respondToRequest(request.request_id, 'accept')}
                    disabled={respondingTo === request.request_id}
                    data-testid={`accept-btn-${request.request_id}`}
                  >
                    {respondingTo === request.request_id ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Icon name="checkmark" size={16} color={colors.white} />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectButton}
                    onPress={() => respondToRequest(request.request_id, 'reject')}
                    disabled={respondingTo === request.request_id}
                    data-testid={`reject-btn-${request.request_id}`}
                  >
                    <Icon name="close" size={16} color={colors.error} />
                    <Text style={styles.rejectButtonText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Shared Birth Plans */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shared Birth Plans</Text>
          {sharedBirthPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="document-text" size={48} color={colors.textLight} />
              <Text style={styles.emptyTitle}>No Shared Birth Plans</Text>
              <Text style={styles.emptyText}>
                When clients share their birth plans with you, they'll appear here.
              </Text>
            </View>
          ) : (
            sharedBirthPlans.map((plan) => (
              <TouchableOpacity
                key={plan.mom_user_id}
                onPress={() => openPlanDetail(plan)}
                data-testid={`plan-card-${plan.mom_user_id}`}
              >
                <Card style={styles.planCard}>
                  <View style={styles.planHeader}>
                    <View style={styles.planAvatar}>
                      <Icon name="person" size={24} color={colors.white} />
                    </View>
                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.mom_name}</Text>
                      {plan.due_date && (
                        <Text style={styles.planDueDate}>Due: {plan.due_date}</Text>
                      )}
                      {plan.birth_setting && (
                        <Text style={styles.planSetting}>{plan.birth_setting}</Text>
                      )}
                    </View>
                    <Icon name="chevron-forward" size={20} color={colors.textLight} />
                  </View>
                  <View style={styles.planMeta}>
                    <View style={styles.metaItem}>
                      <Icon name="document-text" size={14} color={colors.primary} />
                      <Text style={styles.metaText}>
                        {plan.plan?.sections?.filter((s: any) => s.status === 'Complete').length || 0}/9 Complete
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="chatbubble" size={14} color={colors.primary} />
                      <Text style={styles.metaText}>
                        {plan.provider_notes.length} Notes
                      </Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Birth Plan Detail Modal */}
      <Modal
        visible={planModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPlanModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPlanModalVisible(false)} style={styles.modalCloseBtn}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedPlan?.mom_name}'s Birth Plan</Text>
            <View style={{ width: 40 }} />
          </View>
          
          {selectedPlan && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Mom Info */}
              <Card style={styles.momInfoCard}>
                <View style={styles.momInfoRow}>
                  <Text style={styles.momInfoLabel}>Due Date:</Text>
                  <Text style={styles.momInfoValue}>{selectedPlan.due_date || 'Not specified'}</Text>
                </View>
                <View style={styles.momInfoRow}>
                  <Text style={styles.momInfoLabel}>Birth Setting:</Text>
                  <Text style={styles.momInfoValue}>{selectedPlan.birth_setting || 'Not specified'}</Text>
                </View>
              </Card>

              {/* Sections */}
              {selectedPlan.plan?.sections?.map((section: any) => {
                const sectionNotes = getSectionNotes(section.section_id);
                const hasData = section.data && Object.keys(section.data).length > 0;
                
                return (
                  <Card key={section.section_id} style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionTitleRow}>
                        <Text style={styles.sectionName}>
                          {SECTION_TITLES[section.section_id] || section.title}
                        </Text>
                        <View style={[
                          styles.statusBadge,
                          { backgroundColor: section.status === 'Complete' ? colors.success + '20' : colors.textLight + '20' }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            { color: section.status === 'Complete' ? colors.success : colors.textLight }
                          ]}>
                            {section.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Section Data - Show ALL fields */}
                    {hasData && (
                      <View style={styles.sectionDataPreview}>
                        {Object.entries(section.data).map(([key, value]) => (
                          <View key={key} style={styles.dataRow}>
                            <Text style={styles.dataLabel}>{formatFieldLabel(key)}:</Text>
                            <Text style={styles.dataValue}>
                              {Array.isArray(value) ? value.join(', ') : String(value)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Notes to Provider */}
                    {section.notes_to_provider && (
                      <View style={styles.notesToProvider}>
                        <Text style={styles.notesLabel}>Mom's Notes to Provider:</Text>
                        <Text style={styles.notesContent}>{section.notes_to_provider}</Text>
                      </View>
                    )}

                    {/* Provider Notes */}
                    {sectionNotes.length > 0 && (
                      <View style={styles.providerNotes}>
                        <Text style={styles.providerNotesLabel}>Your Notes:</Text>
                        {sectionNotes.map((note: ProviderNote) => (
                          <View key={note.note_id} style={styles.noteItem}>
                            <View style={styles.noteHeader}>
                              <Text style={styles.noteDate}>
                                {new Date(note.created_at).toLocaleDateString()}
                              </Text>
                              <TouchableOpacity
                                onPress={() => openNoteModal(section.section_id, note)}
                                style={styles.editNoteBtn}
                                data-testid={`edit-note-btn-${note.note_id}`}
                              >
                                <Icon name="create-outline" size={16} color={colors.primary} />
                                <Text style={styles.editNoteBtnText}>Edit</Text>
                              </TouchableOpacity>
                            </View>
                            <Text style={styles.noteContent}>{note.note_content}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Add Note Button */}
                    <TouchableOpacity
                      style={styles.addNoteBtn}
                      onPress={() => openNoteModal(section.section_id)}
                      data-testid={`add-note-btn-${section.section_id}`}
                    >
                      <Icon name="add-circle" size={18} color={colors.primary} />
                      <Text style={styles.addNoteBtnText}>
                        {sectionNotes.length > 0 ? 'Add Another Note' : 'Add Note'}
                      </Text>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        visible={noteModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModalContent}>
            <Text style={styles.noteModalTitle}>
              {editingNoteId ? 'Edit Note' : 'Add Note'}
            </Text>
            <Text style={styles.noteModalSection}>
              Section: {selectedSection ? (SECTION_TITLES[selectedSection] || selectedSection) : ''}
            </Text>
            
            <TextInput
              style={styles.noteInput}
              value={newNote}
              onChangeText={setNewNote}
              placeholder="Enter your professional notes, observations, or recommendations..."
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              data-testid="note-input"
            />
            
            <View style={styles.noteModalActions}>
              <TouchableOpacity
                style={styles.cancelNoteBtn}
                onPress={() => {
                  setNoteModalVisible(false);
                  setNewNote('');
                  setSelectedSection(null);
                  setEditingNoteId(null);
                }}
              >
                <Text style={styles.cancelNoteBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveNoteBtn}
                onPress={saveNote}
                disabled={savingNote || !newNote.trim()}
                data-testid="save-note-btn"
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveNoteBtnText}>Save Note</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  backButtonText: {
    fontSize: SIZES.fontMd,
    color: colors.text,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    marginBottom: SIZES.lg,
  },
  section: {
    marginBottom: SIZES.lg,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SIZES.md,
  },
  requestCard: {
    marginBottom: SIZES.sm,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  requestAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestDetails: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  requestName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
  },
  requestDate: {
    fontSize: SIZES.fontSm,
    color: colors.textLight,
  },
  requestActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  acceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    gap: 4,
  },
  acceptButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: SIZES.fontSm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error + '15',
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    gap: 4,
  },
  rejectButtonText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: SIZES.fontSm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.xxl,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.sm,
    paddingHorizontal: SIZES.xl,
  },
  planCard: {
    marginBottom: SIZES.sm,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planInfo: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  planName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
  },
  planDueDate: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planSetting: {
    fontSize: SIZES.fontSm,
    color: colors.primary,
  },
  planMeta: {
    flexDirection: 'row',
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: SIZES.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    padding: SIZES.xs,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  momInfoCard: {
    marginBottom: SIZES.md,
    backgroundColor: colors.primaryLight + '15',
  },
  momInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.xs,
  },
  momInfoLabel: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
  },
  momInfoValue: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: colors.text,
  },
  sectionCard: {
    marginBottom: SIZES.md,
  },
  sectionHeader: {
    marginBottom: SIZES.sm,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusSm,
  },
  statusBadgeText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  sectionDataPreview: {
    backgroundColor: colors.background,
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
  },
  dataRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dataLabel: {
    fontSize: SIZES.fontSm,
    color: colors.textLight,
    width: 140,
    flexShrink: 0,
  },
  dataValue: {
    fontSize: SIZES.fontSm,
    color: colors.text,
    flex: 1,
    flexWrap: 'wrap',
  },
  moreData: {
    fontSize: SIZES.fontSm,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: SIZES.xs,
  },
  notesToProvider: {
    backgroundColor: colors.warning + '15',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
  },
  notesLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: colors.warning,
    marginBottom: 4,
  },
  notesContent: {
    fontSize: SIZES.fontSm,
    color: colors.text,
  },
  providerNotes: {
    backgroundColor: colors.primary + '10',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SIZES.sm,
  },
  providerNotesLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: SIZES.xs,
  },
  noteItem: {
    marginBottom: SIZES.sm,
    padding: SIZES.sm,
    backgroundColor: colors.background,
    borderRadius: SIZES.radiusSm,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  noteContent: {
    fontSize: SIZES.fontSm,
    color: colors.text,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: SIZES.fontXs,
    color: colors.textLight,
  },
  editNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: SIZES.xs,
  },
  editNoteBtnText: {
    fontSize: SIZES.fontXs,
    color: colors.primary,
    fontWeight: '500',
  },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    gap: 4,
  },
  addNoteBtnText: {
    fontSize: SIZES.fontSm,
    color: colors.primary,
    fontWeight: '600',
  },
  // Breadcrumb styles
  breadcrumb: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  breadcrumbItem: { paddingVertical: 4 },
  breadcrumbLink: { 
    fontSize: SIZES.fontMd, 
    color: colors.primary, 
    fontWeight: '500' 
  },
  breadcrumbSeparator: { 
    fontSize: SIZES.fontMd, 
    color: colors.textLight, 
    marginHorizontal: SIZES.sm 
  },
  breadcrumbCurrent: { 
    fontSize: SIZES.fontMd, 
    color: colors.text, 
    fontWeight: '600' 
  },
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  noteModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    padding: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },
  noteModalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  noteModalSection: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    marginBottom: SIZES.md,
  },
  noteInput: {
    backgroundColor: colors.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: colors.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteModalActions: {
    flexDirection: 'row',
    marginTop: SIZES.lg,
    gap: SIZES.md,
  },
  cancelNoteBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    backgroundColor: colors.border,
    alignItems: 'center',
  },
  cancelNoteBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  saveNoteBtn: {
    flex: 1,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveNoteBtnText: {
    color: colors.white,
    fontWeight: '600',
  },
}));
