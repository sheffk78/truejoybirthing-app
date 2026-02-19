// Unified Client Detail Screen - Hub for all client work
// Used by both Doula and Midwife with role-specific tabs

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
import { Icon } from '../../Icon';
import Card from '../../Card';
import Button from '../../Button';
import { apiRequest } from '../../../utils/api';
import { COLORS, SIZES, FONTS } from '../../../constants/theme';
import { ProviderConfig, getProviderConfig } from '../config/providerConfig';

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

interface TimelineItem {
  type: 'appointment' | 'visit' | 'note' | 'contract' | 'invoice';
  id: string;
  date: string;
  title: string;
  subtitle: string;
  status?: string;
  data: any;
}

interface ClientDetailProps {
  config: ProviderConfig;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: COLORS.primary,
  confirmed: COLORS.success,
  completed: COLORS.textLight,
  cancelled: COLORS.error,
  pending: COLORS.warning,
  Draft: COLORS.textLight,
  Sent: COLORS.warning,
  Signed: COLORS.success,
  Paid: COLORS.success,
  Overdue: COLORS.error,
};

const TYPE_ICONS: Record<string, string> = {
  appointment: 'calendar',
  visit: 'fitness',
  note: 'document-text',
  contract: 'document',
  invoice: 'cash',
};

const TYPE_COLORS: Record<string, string> = {
  appointment: COLORS.primary,
  visit: COLORS.success,
  note: COLORS.accent,
  contract: COLORS.warning,
  invoice: COLORS.roleMidwife,
};

export default function ProviderClientDetail({ config }: ClientDetailProps) {
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const [client, setClient] = useState<Client | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [activeTab, setActiveTab] = useState('timeline');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const primaryColor = config.primaryColor;

  const fetchData = useCallback(async () => {
    if (!clientId) return;
    
    try {
      // Fetch client timeline (includes client details)
      const data = await apiRequest(`/api/provider/clients/${clientId}/timeline`);
      setClient(data.client);
      setTimeline(data.timeline || []);
    } catch (error: any) {
      console.error('Error fetching client:', error);
      Alert.alert('Error', 'Failed to load client details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
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

  const handleQuickAction = (action: string) => {
    if (!client) return;
    
    switch (action) {
      case 'appointment':
        router.push(`${config.routes.appointments}?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}`);
        break;
      case 'note':
        router.push(`${config.routes.notes}?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}`);
        break;
      case 'message':
        if (client.linked_mom_id) {
          router.push(`${config.routes.messages}?userId=${client.linked_mom_id}`);
        } else {
          Alert.alert('Not Available', 'This client is not linked to a registered user yet.');
        }
        break;
      case 'contract':
        router.push(`${config.routes.contracts}?clientId=${client.client_id}`);
        break;
      case 'invoice':
        router.push(`${config.routes.invoices}?clientId=${client.client_id}`);
        break;
      case 'visit':
        if (config.features.showVisits) {
          router.push(`${config.routes.visits}?clientId=${client.client_id}&clientName=${encodeURIComponent(client.name)}`);
        }
        break;
    }
  };

  const renderTimelineItem = (item: TimelineItem) => (
    <TouchableOpacity
      key={`${item.type}-${item.id}`}
      onPress={() => {
        // Navigate to the appropriate detail view
        switch (item.type) {
          case 'appointment':
            router.push(`${config.routes.appointments}?appointmentId=${item.id}`);
            break;
          case 'note':
            router.push(`${config.routes.notes}?noteId=${item.id}`);
            break;
          // Add other navigation as needed
        }
      }}
      activeOpacity={0.8}
      data-testid={`timeline-item-${item.type}-${item.id}`}
    >
      <Card style={styles.timelineCard}>
        <View style={styles.timelineRow}>
          <View style={[styles.typeIcon, { backgroundColor: TYPE_COLORS[item.type] + '20' }]}>
            <Icon name={TYPE_ICONS[item.type]} size={18} color={TYPE_COLORS[item.type]} />
          </View>
          <View style={styles.timelineContent}>
            <View style={styles.timelineHeader}>
              <Text style={styles.timelineTitle}>{item.title}</Text>
              {item.status && (
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || COLORS.textLight) + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || COLORS.textLight }]}>
                    {item.status}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.timelineSubtitle} numberOfLines={2}>{item.subtitle}</Text>
            <Text style={styles.timelineDate}>{formatDate(item.date)}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const filteredTimeline = timeline.filter(item => {
    if (activeTab === 'timeline') return true;
    if (activeTab === 'appointments') return item.type === 'appointment';
    if (activeTab === 'visits') return item.type === 'visit';
    if (activeTab === 'notes') return item.type === 'note';
    if (activeTab === 'contracts') return item.type === 'contract';
    if (activeTab === 'invoices') return item.type === 'invoice';
    return true;
  });

  if (isLoading) {
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="back-button">
            <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Client Details</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Client Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {client.picture ? (
              <Image source={{ uri: client.picture }} style={[styles.avatar, { borderColor: primaryColor }]} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: primaryColor + '20', borderColor: primaryColor }]}>
                <Text style={[styles.avatarInitial, { color: primaryColor }]}>
                  {client.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.clientName}>{client.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: client.is_active ? COLORS.success + '20' : COLORS.textLight + '20' }]}>
                  <Text style={[styles.statusText, { color: client.is_active ? COLORS.success : COLORS.textLight }]}>
                    {client.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: primaryColor + '20', marginLeft: SIZES.xs }]}>
                  <Text style={[styles.statusText, { color: primaryColor }]}>{client.status}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Client Details */}
          <View style={styles.detailsGrid}>
            {(client.due_date || client.edd) && (
              <View style={styles.detailItem}>
                <Icon name="calendar" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabel}>Due Date</Text>
                <Text style={styles.detailValue}>{formatDate(client.due_date || client.edd || '')}</Text>
                {getDaysUntilDue() && (
                  <Text style={styles.daysUntil}>{getDaysUntilDue()}</Text>
                )}
              </View>
            )}
            {client.email && (
              <View style={styles.detailItem}>
                <Icon name="mail" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue} numberOfLines={1}>{client.email}</Text>
              </View>
            )}
            {client.phone && (
              <View style={styles.detailItem}>
                <Icon name="call" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{client.phone}</Text>
              </View>
            )}
            {client.planned_birth_setting && (
              <View style={styles.detailItem}>
                <Icon name="home" size={16} color={COLORS.textSecondary} />
                <Text style={styles.detailLabel}>Birth Setting</Text>
                <Text style={styles.detailValue}>{client.planned_birth_setting}</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickActionsScroll}>
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.primary + '20' }]} onPress={() => handleQuickAction('appointment')} data-testid="quick-action-appointment">
              <Icon name="calendar-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.quickActionText, { color: COLORS.primary }]}>Schedule</Text>
            </TouchableOpacity>
            
            {config.features.showVisits && (
              <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.success + '20' }]} onPress={() => handleQuickAction('visit')} data-testid="quick-action-visit">
                <Icon name="fitness" size={20} color={COLORS.success} />
                <Text style={[styles.quickActionText, { color: COLORS.success }]}>Add Visit</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.accent + '20' }]} onPress={() => handleQuickAction('note')} data-testid="quick-action-note">
              <Icon name="create" size={20} color={COLORS.accent} />
              <Text style={[styles.quickActionText, { color: COLORS.accent }]}>Add Note</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.info + '20' }]} onPress={() => handleQuickAction('message')} data-testid="quick-action-message">
              <Icon name="chatbubble" size={20} color={COLORS.info || COLORS.primary} />
              <Text style={[styles.quickActionText, { color: COLORS.info || COLORS.primary }]}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.warning + '20' }]} onPress={() => handleQuickAction('contract')} data-testid="quick-action-contract">
              <Icon name="document" size={20} color={COLORS.warning} />
              <Text style={[styles.quickActionText, { color: COLORS.warning }]}>Contract</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.quickAction, { backgroundColor: COLORS.roleMidwife + '20' }]} onPress={() => handleQuickAction('invoice')} data-testid="quick-action-invoice">
              <Icon name="cash" size={20} color={COLORS.roleMidwife} />
              <Text style={[styles.quickActionText, { color: COLORS.roleMidwife }]}>Invoice</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Stats */}
        {client._counts && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{client._counts.appointments}</Text>
              <Text style={styles.statLabel}>Appts</Text>
            </View>
            {config.features.showVisits && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{client._counts.visits}</Text>
                <Text style={styles.statLabel}>Visits</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{client._counts.notes}</Text>
              <Text style={styles.statLabel}>Notes</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{client._counts.contracts}</Text>
              <Text style={styles.statLabel}>Contracts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{client._counts.invoices}</Text>
              <Text style={styles.statLabel}>Invoices</Text>
            </View>
          </View>
        )}

        {/* Tab Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {config.clientDetailTabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { backgroundColor: primaryColor }]}
              onPress={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
            >
              <Icon 
                name={tab.icon} 
                size={16} 
                color={activeTab === tab.key ? COLORS.white : COLORS.textSecondary} 
              />
              <Text style={[styles.tabText, activeTab === tab.key && { color: COLORS.white }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Timeline */}
        <View style={styles.timelineSection}>
          {filteredTimeline.length > 0 ? (
            filteredTimeline.map(renderTimelineItem)
          ) : (
            <Card style={styles.emptyCard}>
              <Icon name="folder-open-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyText}>
                No {activeTab === 'timeline' ? 'activity' : activeTab} yet
              </Text>
              <Text style={styles.emptySubtext}>
                Use the quick actions above to get started
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: SIZES.md },
  errorText: { fontSize: SIZES.fontLg, color: COLORS.error },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.md },
  backButton: { padding: SIZES.sm },
  headerTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary },
  
  profileCard: { marginBottom: SIZES.md },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.md },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 3 },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 28, fontWeight: '700' },
  profileInfo: { flex: 1, marginLeft: SIZES.md },
  clientName: { fontSize: SIZES.fontXl, fontWeight: '700', color: COLORS.textPrimary },
  statusRow: { flexDirection: 'row', marginTop: SIZES.xs },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontWeight: '600' },
  
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.md },
  detailItem: { minWidth: '45%' },
  detailLabel: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, marginTop: 4 },
  detailValue: { fontSize: SIZES.fontSm, color: COLORS.textPrimary, fontWeight: '500' },
  daysUntil: { fontSize: SIZES.fontXs, color: COLORS.primary, fontStyle: 'italic' },
  
  quickActionsSection: { marginBottom: SIZES.md },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.sm },
  quickActionsScroll: { flexDirection: 'row' },
  quickAction: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd, marginRight: SIZES.sm, gap: SIZES.xs },
  quickActionText: { fontSize: SIZES.fontSm, fontWeight: '600' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: SIZES.fontXl, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: SIZES.fontXs, color: COLORS.textSecondary },
  
  tabsContainer: { marginBottom: SIZES.md },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.white, marginRight: SIZES.xs, gap: SIZES.xs },
  tabText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, fontWeight: '500' },
  
  timelineSection: {},
  timelineCard: { marginBottom: SIZES.sm },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  typeIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.sm },
  timelineContent: { flex: 1 },
  timelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  timelineSubtitle: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 2 },
  timelineDate: { fontSize: SIZES.fontXs, color: COLORS.textLight, marginTop: 4 },
  
  emptyCard: { alignItems: 'center', padding: SIZES.xl },
  emptyText: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginTop: SIZES.md },
  emptySubtext: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, textAlign: 'center' },
});
