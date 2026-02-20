// Shared Appointments Screen for Doula and Midwife
// Uses unified /api/provider/appointments endpoint with config-based customization

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
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { COLORS, SIZES, FONTS } from '../../constants/theme';
import { ProviderConfig } from './config/providerConfig';

const DateTimePicker = Platform.OS === 'web' ? null : require('@react-native-community/datetimepicker').default;

interface Appointment {
  appointment_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: string;
  mom_user_id: string;
  mom_name: string;
  client_id?: string;
  client_name?: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  location?: string;
  is_virtual: boolean;
  notes?: string;
  status: string;
  created_at: string;
}

interface Client {
  client_id: string;
  name: string;
  linked_mom_id?: string;
  email?: string;
}

const APPOINTMENT_TYPES = [
  { value: 'prenatal_visit', label: 'Prenatal Visit', icon: 'fitness', category: 'prenatal' },
  { value: 'birth_planning_session', label: 'Birth Planning', icon: 'document-text', category: 'prenatal' },
  { value: 'postpartum_visit', label: 'Postpartum Visit', icon: 'heart', category: 'postpartum' },
  { value: 'consultation', label: 'Consultation', icon: 'chatbubbles', category: 'general' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  accepted: COLORS.success,
  declined: COLORS.error,
  cancelled: COLORS.textLight,
};

type FilterTab = 'all' | 'prenatal' | 'postpartum';

interface ProviderAppointmentsProps {
  config: ProviderConfig;
}

export default function ProviderAppointments({ config }: ProviderAppointmentsProps) {
  const router = useRouter();
  const params = useLocalSearchParams();
  const preSelectedClientId = params.clientId as string | undefined;
  const preSelectedClientName = params.clientName as string | undefined;
  const returnTo = params.returnTo as string | undefined;
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  // Create appointment form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [appointmentType, setAppointmentType] = useState('');
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [privateNotes, setPrivateNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);

  const primaryColor = config.primaryColor;
  
  // Show filter tabs for Midwife role (has clinical visit types)
  const showFilterTabs = config.features.showVisits;

  const fetchData = useCallback(async () => {
    try {
      // Use unified appointments endpoint (works for all roles)
      const [appointmentsData, clientsData] = await Promise.all([
        apiRequest('/appointments'),
        apiRequest(config.endpoints.unifiedClients || '/provider/clients'),
      ]);
      setAppointments(appointmentsData || []);
      // Filter clients that have linked mom accounts
      const linkedClients = (clientsData || []).filter((c: Client) => c.linked_mom_id);
      setClients(linkedClients);
      
      // Auto-select client if coming from client detail
      if (preSelectedClientId && linkedClients.length > 0) {
        const matchingClient = linkedClients.find((c: Client) => c.client_id === preSelectedClientId);
        if (matchingClient) {
          setSelectedClient(matchingClient);
          // Auto-open create modal if coming from client detail
          setShowCreateModal(true);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [config.endpoints, preSelectedClientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };
  
  const handleBack = () => {
    if (returnTo) {
      router.push(decodeURIComponent(returnTo) as any);
    } else {
      router.back();
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setAppointmentDate(new Date());
    setAppointmentTime(new Date());
    setAppointmentType('');
    setLocation('');
    setIsVirtual(false);
    setPrivateNotes('');
  };

  const handleCreateAppointment = async () => {
    if (!selectedClient?.linked_mom_id) {
      Alert.alert('Error', 'Please select a client with a linked account');
      return;
    }
    if (!appointmentType) {
      Alert.alert('Error', 'Please select an appointment type');
      return;
    }

    setIsCreating(true);
    try {
      const dateStr = appointmentDate.toISOString().split('T')[0];
      const timeStr = `${appointmentTime.getHours().toString().padStart(2, '0')}:${appointmentTime.getMinutes().toString().padStart(2, '0')}`;

      await apiRequest('/appointments', {
        method: 'POST',
        body: {
          client_id: selectedClient.client_id,
          appointment_date: dateStr,
          appointment_time: timeStr,
          appointment_type: appointmentType,
          location: isVirtual ? 'Virtual Meeting' : location,
          is_virtual: isVirtual,
          notes: privateNotes,
        },
      });

      Alert.alert('Success', 'Appointment created! The client has been notified.');
      setShowCreateModal(false);
      resetForm();
      fetchData();
      
      // If we came from client detail, go back there
      if (preSelectedClientId && returnTo) {
        handleBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create appointment');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/provider/appointments/${appointmentId}`, { method: 'DELETE' });
              setAppointments(prev =>
                prev.map(apt =>
                  apt.appointment_id === appointmentId
                    ? { ...apt, status: 'cancelled' }
                    : apt
                )
              );
              Alert.alert('Success', 'Appointment cancelled');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel appointment');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter appointments based on active tab
  const getFilteredAppointments = () => {
    if (!showFilterTabs || activeTab === 'all') {
      return appointments;
    }
    
    if (activeTab === 'prenatal') {
      return appointments.filter(a => 
        a.appointment_type === 'prenatal_visit' || a.appointment_type === 'birth_planning_session'
      );
    } else if (activeTab === 'postpartum') {
      return appointments.filter(a => a.appointment_type === 'postpartum_visit');
    }
    
    return appointments;
  };

  const filteredAppointments = getFilteredAppointments();
  const pendingAppointments = filteredAppointments.filter(a => a.status === 'pending');
  const upcomingAppointments = filteredAppointments.filter(a => a.status === 'accepted');
  const pastAppointments = filteredAppointments.filter(a => ['declined', 'cancelled'].includes(a.status));

  const renderAppointmentCard = (appointment: Appointment) => (
    <Card key={appointment.appointment_id} style={styles.appointmentCard} data-testid={`appointment-${appointment.appointment_id}`}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.clientName}>{appointment.client_name || appointment.mom_name}</Text>
          <Text style={styles.appointmentType}>
            {APPOINTMENT_TYPES.find(t => t.value === appointment.appointment_type)?.label || appointment.appointment_type}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[appointment.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[appointment.status] }]}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.appointmentDetails}>
        <View style={styles.detailRow}>
          <Icon name="calendar" size={16} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
          <Icon name="time" size={16} color={COLORS.textSecondary} style={{ marginLeft: SIZES.md }} />
          <Text style={styles.detailText}>{formatTime(appointment.appointment_time)}</Text>
        </View>
        {appointment.location && (
          <View style={styles.detailRow}>
            <Icon name={appointment.is_virtual ? 'videocam' : 'location'} size={16} color={COLORS.textSecondary} />
            <Text style={styles.detailText}>{appointment.location}</Text>
          </View>
        )}
        {appointment.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Private Notes:</Text>
            <Text style={styles.notesText}>{appointment.notes}</Text>
          </View>
        )}
      </View>

      {['pending', 'accepted'].includes(appointment.status) && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancelAppointment(appointment.appointment_id)}
        >
          <Icon name="close-circle-outline" size={18} color={COLORS.error} />
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="provider-appointments-screen">
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton} data-testid="back-btn">
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
          disabled={clients.length === 0}
          data-testid="add-appointment-btn"
        >
          <Icon name="add-circle" size={28} color={clients.length > 0 ? primaryColor : COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs - Only shown for Midwife */}
      {showFilterTabs && (
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && { backgroundColor: primaryColor }]}
            onPress={() => setActiveTab('all')}
            data-testid="filter-tab-all"
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'prenatal' && { backgroundColor: primaryColor }]}
            onPress={() => setActiveTab('prenatal')}
            data-testid="filter-tab-prenatal"
          >
            <Text style={[styles.tabText, activeTab === 'prenatal' && styles.tabTextActive]}>Prenatal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'postpartum' && { backgroundColor: primaryColor }]}
            onPress={() => setActiveTab('postpartum')}
            data-testid="filter-tab-postpartum"
          >
            <Text style={[styles.tabText, activeTab === 'postpartum' && styles.tabTextActive]}>Postpartum</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[primaryColor]} tintColor={primaryColor} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>
              No {showFilterTabs && activeTab !== 'all' ? activeTab : ''} Appointments
            </Text>
            <Text style={styles.emptySubtitle}>
              {clients.length > 0
                ? 'Tap the + button to schedule an appointment with a client.'
                : 'Link a client account to start scheduling appointments.'}
            </Text>
          </View>
        ) : (
          <>
            {pendingAppointments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Awaiting Response ({pendingAppointments.length})</Text>
                {pendingAppointments.map(renderAppointmentCard)}
              </View>
            )}

            {upcomingAppointments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Confirmed ({upcomingAppointments.length})</Text>
                {upcomingAppointments.map(renderAppointmentCard)}
              </View>
            )}

            {pastAppointments.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Past</Text>
                {pastAppointments.map(renderAppointmentCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create Appointment Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          // If we came from client detail and are closing without creating, go back
          if (preSelectedClientId && returnTo) {
            handleBack();
          }
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              setShowCreateModal(false);
              // If we came from client detail and are closing without creating, go back
              if (preSelectedClientId && returnTo) {
                handleBack();
              }
            }} data-testid="modal-close-btn">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Appointment</Text>
            <View style={{ width: 24 }} />
          </View>

          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Client Selection */}
              <Text style={styles.inputLabel}>Client</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowClientPicker(!showClientPicker)}
              >
                <Text style={selectedClient ? styles.selectText : styles.selectPlaceholder}>
                  {selectedClient?.name || 'Select a client'}
                </Text>
                <Icon name="chevron-down" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

              {showClientPicker && (
                <View style={styles.pickerContainer}>
                  {clients.map(client => (
                    <TouchableOpacity
                      key={client.client_id}
                      style={[
                        styles.pickerItem,
                        selectedClient?.client_id === client.client_id && { backgroundColor: primaryColor + '10' },
                      ]}
                      onPress={() => {
                        setSelectedClient(client);
                        setShowClientPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{client.name}</Text>
                      {selectedClient?.client_id === client.client_id && (
                        <Icon name="checkmark" size={20} color={primaryColor} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Appointment Type */}
              <Text style={styles.inputLabel}>Type</Text>
              <View style={styles.typeGrid}>
                {APPOINTMENT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeCard,
                      appointmentType === type.value && { borderColor: primaryColor, backgroundColor: primaryColor + '10' },
                    ]}
                    onPress={() => setAppointmentType(type.value)}
                  >
                    <Icon
                      name={type.icon as any}
                      size={24}
                      color={appointmentType === type.value ? primaryColor : COLORS.textSecondary}
                    />
                    <Text style={[
                      styles.typeLabel,
                      appointmentType === type.value && { color: primaryColor, fontFamily: FONTS.bodyBold },
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Selection */}
              <Text style={styles.inputLabel}>Date</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar" size={20} color={primaryColor} />
                <Text style={styles.selectText}>
                  {appointmentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                Platform.OS === 'web' ? (
                  <View style={styles.webDatePickerContainer}>
                    <input
                      type="date"
                      value={appointmentDate.toISOString().split('T')[0]}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e: any) => {
                        const date = new Date(e.target.value);
                        if (!isNaN(date.getTime())) {
                          setAppointmentDate(date);
                        }
                        setShowDatePicker(false);
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.white,
                      }}
                    />
                  </View>
                ) : DateTimePicker && (
                  <DateTimePicker
                    value={appointmentDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, date?: Date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) setAppointmentDate(date);
                    }}
                    minimumDate={new Date()}
                  />
                )
              )}

              {/* Time Selection */}
              <Text style={styles.inputLabel}>Time</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="time" size={20} color={primaryColor} />
                <Text style={styles.selectText}>
                  {appointmentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                Platform.OS === 'web' ? (
                  <View style={styles.webDatePickerContainer}>
                    <input
                      type="time"
                      value={appointmentTime.toTimeString().slice(0, 5)}
                      onChange={(e: any) => {
                        const [hours, minutes] = e.target.value.split(':');
                        const time = new Date();
                        time.setHours(parseInt(hours, 10), parseInt(minutes, 10));
                        setAppointmentTime(time);
                        setShowTimePicker(false);
                      }}
                      style={{
                        width: '100%',
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 8,
                        border: `1px solid ${COLORS.border}`,
                        backgroundColor: COLORS.white,
                      }}
                    />
                  </View>
                ) : DateTimePicker && (
                  <DateTimePicker
                    value={appointmentTime}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, time?: Date) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (time) setAppointmentTime(time);
                    }}
                  />
                )
              )}

              {/* Virtual Toggle */}
              <TouchableOpacity
                style={styles.toggleRow}
                onPress={() => setIsVirtual(!isVirtual)}
              >
                <View style={styles.toggleLeft}>
                  <Icon name="videocam" size={20} color={primaryColor} />
                  <Text style={styles.toggleLabel}>Virtual Meeting</Text>
                </View>
                <View style={[styles.toggle, isVirtual && { backgroundColor: primaryColor }]}>
                  <View style={[styles.toggleKnob, isVirtual && styles.toggleKnobActive]} />
                </View>
              </TouchableOpacity>

              {/* Location */}
              {!isVirtual && (
                <>
                  <Text style={styles.inputLabel}>Location</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter appointment location"
                    placeholderTextColor={COLORS.textLight}
                    value={location}
                    onChangeText={setLocation}
                  />
                </>
              )}

              {/* Private Notes */}
              <Text style={styles.inputLabel}>Private Notes (not visible to client)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add notes for yourself..."
                placeholderTextColor={COLORS.textLight}
                value={privateNotes}
                onChangeText={setPrivateNotes}
                multiline
                numberOfLines={4}
              />

              <Button
                title="Create Appointment"
                onPress={handleCreateAppointment}
                loading={isCreating}
                disabled={!selectedClient || !appointmentType}
                fullWidth
                style={[styles.createButton, { backgroundColor: !selectedClient || !appointmentType ? COLORS.border : primaryColor }]}
              />
              
              {/* Extra padding for keyboard */}
              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
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
  webDatePickerContainer: {
    marginVertical: SIZES.sm,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    overflow: 'visible',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  addButton: {
    padding: SIZES.xs,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.sm,
    alignItems: 'center',
    borderRadius: SIZES.radiusSm,
    marginHorizontal: SIZES.xs,
    backgroundColor: COLORS.background,
  },
  tabText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.white,
    fontFamily: FONTS.bodyBold,
  },
  scrollContent: {
    padding: SIZES.lg,
    paddingBottom: SIZES.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: SIZES.xl * 2,
  },
  emptyTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    marginTop: SIZES.lg,
    marginBottom: SIZES.sm,
    textTransform: 'capitalize',
  },
  emptySubtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SIZES.xl,
  },
  section: {
    marginBottom: SIZES.xl,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  appointmentCard: {
    marginBottom: SIZES.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  appointmentType: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  statusText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
  },
  appointmentDetails: {
    marginBottom: SIZES.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginLeft: SIZES.xs,
  },
  notesSection: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.sm,
    marginTop: SIZES.sm,
  },
  notesLabel: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  notesText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SIZES.sm,
  },
  cancelText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.error,
    marginLeft: SIZES.xs,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.lg,
  },
  inputLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
  },
  selectText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
    marginLeft: SIZES.sm,
  },
  selectPlaceholder: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
  },
  pickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SIZES.xs,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pickerItemText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -SIZES.xs,
  },
  typeCard: {
    width: '48%',
    margin: '1%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    alignItems: 'center',
  },
  typeLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: SIZES.sm,
    textAlign: 'center',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    marginTop: SIZES.md,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    padding: 2,
  },
  toggleKnob: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    marginTop: SIZES.xl,
    marginBottom: SIZES.xl,
  },
});
