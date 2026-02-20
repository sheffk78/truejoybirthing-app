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
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';

interface Appointment {
  appointment_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: string;
  appointment_date: string;
  appointment_time: string;
  appointment_type: string;
  location?: string;
  is_virtual: boolean;
  status: string;
  created_at: string;
  created_by?: string;
}

interface Provider {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  picture?: string;
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  prenatal_visit: 'Prenatal Visit',
  birth_planning_session: 'Birth Planning Session',
  postpartum_visit: 'Postpartum Visit',
  consultation: 'Consultation',
  home_visit: 'Home Visit',
  virtual: 'Virtual Meeting',
};

const APPOINTMENT_TYPES = [
  { value: 'prenatal_visit', label: 'Prenatal Visit' },
  { value: 'birth_planning_session', label: 'Birth Planning Session' },
  { value: 'postpartum_visit', label: 'Postpartum Visit' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'home_visit', label: 'Home Visit' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  accepted: COLORS.success,
  scheduled: COLORS.success,
  confirmed: COLORS.success,
  declined: COLORS.error,
  cancelled: COLORS.textLight,
  completed: COLORS.textLight,
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ providerId?: string; providerName?: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  
  // Create appointment modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [appointmentDate, setAppointmentDate] = useState(new Date());
  const [appointmentTime, setAppointmentTime] = useState(new Date());
  const [appointmentType, setAppointmentType] = useState('consultation');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isPersonalAppointment, setIsPersonalAppointment] = useState(false);
  const [personalTitle, setPersonalTitle] = useState('');
  const [preSelectedProviderId, setPreSelectedProviderId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [appointmentsData, providersData] = await Promise.all([
        apiRequest('/appointments', { method: 'GET' }),
        apiRequest('/mom/team-providers', { method: 'GET' }).catch(() => []),
      ]);
      setAppointments(appointmentsData || []);
      setProviders(providersData || []);
      
      // Handle pre-selection from URL params
      if (params.providerId && providersData?.length > 0) {
        const provider = providersData.find((p: Provider) => p.user_id === params.providerId);
        if (provider) {
          setSelectedProvider(provider);
          setPreSelectedProviderId(params.providerId);
          setShowCreateModal(true);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [params.providerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleRespond = async (appointmentId: string, response: 'accepted' | 'declined') => {
    setRespondingId(appointmentId);
    try {
      await apiRequest(`/appointments/${appointmentId}/respond?response=${response}`, {
        method: 'PUT',
      });
      
      setAppointments(prev =>
        prev.map(apt =>
          apt.appointment_id === appointmentId
            ? { ...apt, status: response }
            : apt
        )
      );
      
      Alert.alert(
        'Success',
        response === 'accepted'
          ? 'Appointment accepted! Your provider has been notified.'
          : 'Appointment declined. Your provider has been notified.'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to respond to appointment');
    } finally {
      setRespondingId(null);
    }
  };

  const confirmResponse = (appointmentId: string, response: 'accepted' | 'declined') => {
    const action = response === 'accepted' ? 'accept' : 'decline';
    Alert.alert(
      `${action.charAt(0).toUpperCase() + action.slice(1)} Appointment`,
      `Are you sure you want to ${action} this appointment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: action.charAt(0).toUpperCase() + action.slice(1), onPress: () => handleRespond(appointmentId, response) },
      ]
    );
  };

  const handleCreateAppointment = async () => {
    // Allow creating appointments without provider ("none" option)
    if (!selectedProvider && !isPersonalAppointment) {
      Alert.alert('Error', 'Please select a provider or choose "Personal/Other"');
      return;
    }

    setIsCreating(true);
    try {
      const dateStr = appointmentDate.toISOString().split('T')[0];
      const timeStr = `${appointmentTime.getHours().toString().padStart(2, '0')}:${appointmentTime.getMinutes().toString().padStart(2, '0')}`;
      
      const result = await apiRequest('/appointments', {
        method: 'POST',
        body: {
          provider_id: isPersonalAppointment ? 'none' : selectedProvider?.user_id,
          appointment_date: dateStr,
          appointment_time: timeStr,
          appointment_type: appointmentType,
          title: isPersonalAppointment ? personalTitle : undefined,
          is_virtual: isVirtual,
          notes: appointmentNotes,
        },
      });
      
      const message = isPersonalAppointment
        ? 'Your personal appointment has been added to your timeline.'
        : `Your appointment request has been sent to ${selectedProvider?.full_name}. They will confirm shortly.`;
      
      Alert.alert('Success!', message);
      
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create appointment');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setSelectedProvider(null);
    setAppointmentDate(new Date());
    setAppointmentTime(new Date());
    setAppointmentType('consultation');
    setAppointmentNotes('');
    setIsVirtual(false);
    setIsPersonalAppointment(false);
    setPersonalTitle('');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending' && a.created_by !== 'mom');
  const myRequestsPending = appointments.filter(a => a.status === 'pending' && a.created_by === 'mom');
  const upcomingAppointments = appointments.filter(a => ['accepted', 'scheduled', 'confirmed'].includes(a.status));
  const pastAppointments = appointments.filter(a => ['declined', 'cancelled', 'completed'].includes(a.status));

  const renderAppointmentCard = (appointment: Appointment, showActions = true) => {
    const isPending = appointment.status === 'pending' && appointment.created_by !== 'mom';
    const isMyRequest = appointment.status === 'pending' && appointment.created_by === 'mom';
    const isResponding = respondingId === appointment.appointment_id;

    return (
      <Card key={appointment.appointment_id} style={styles.appointmentCard} data-testid={`appointment-${appointment.appointment_id}`}>
        <View style={styles.cardHeader}>
          <View style={styles.providerInfo}>
            <View style={[styles.providerAvatar, { backgroundColor: appointment.provider_role === 'DOULA' ? COLORS.roleDoula : COLORS.roleMidwife }]}>
              <Icon name={appointment.provider_role === 'DOULA' ? 'heart' : 'medical'} size={20} color={COLORS.white} />
            </View>
            <View>
              <Text style={styles.providerName}>{appointment.provider_name}</Text>
              <Text style={styles.providerRole}>{appointment.provider_role}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[appointment.status] || COLORS.textLight) + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[appointment.status] || COLORS.textLight }]}>
              {isMyRequest ? 'Awaiting Response' : appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Icon name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.detailText}>{formatDate(appointment.appointment_date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="time" size={18} color={COLORS.primary} />
            <Text style={styles.detailText}>{formatTime(appointment.appointment_time)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="clipboard" size={18} color={COLORS.primary} />
            <Text style={styles.detailText}>
              {APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type}
            </Text>
          </View>
          {appointment.location && (
            <View style={styles.detailRow}>
              <Icon name={appointment.is_virtual ? 'videocam' : 'location'} size={18} color={COLORS.primary} />
              <Text style={styles.detailText}>
                {appointment.is_virtual ? 'Virtual Meeting' : appointment.location}
              </Text>
            </View>
          )}
        </View>

        {isPending && showActions && (
          <View style={styles.actionButtons}>
            <Button
              title="Decline"
              variant="outline"
              onPress={() => confirmResponse(appointment.appointment_id, 'declined')}
              style={styles.declineButton}
              loading={isResponding}
              disabled={isResponding}
            />
            <Button
              title="Accept"
              onPress={() => confirmResponse(appointment.appointment_id, 'accepted')}
              style={styles.acceptButton}
              loading={isResponding}
              disabled={isResponding}
            />
          </View>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} data-testid="back-button">
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <TouchableOpacity 
          onPress={() => setShowCreateModal(true)} 
          style={styles.addButton}
          data-testid="create-appointment-btn"
        >
          <Icon name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Request Appointment CTA */}
        {providers.length > 0 && (
          <TouchableOpacity 
            style={styles.requestCTA}
            onPress={() => setShowCreateModal(true)}
            data-testid="request-appointment-cta"
          >
            <View style={styles.ctaIcon}>
              <Icon name="calendar-outline" size={24} color={COLORS.white} />
            </View>
            <View style={styles.ctaText}>
              <Text style={styles.ctaTitle}>Request an Appointment</Text>
              <Text style={styles.ctaSubtitle}>Schedule time with your doula or midwife</Text>
            </View>
            <Icon name="chevron-forward" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {appointments.length === 0 && providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Appointments Yet</Text>
            <Text style={styles.emptySubtitle}>
              Connect with a doula or midwife through the Marketplace to start scheduling appointments.
            </Text>
            <Button 
              title="Browse Marketplace"
              onPress={() => router.push('/(mom)/marketplace')}
              style={{ marginTop: SIZES.md }}
            />
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Appointments Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the button above to request an appointment with your care team.
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Response from Providers */}
            {pendingAppointments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="notifications" size={20} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Needs Your Response</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingAppointments.length}</Text>
                  </View>
                </View>
                {pendingAppointments.map(apt => renderAppointmentCard(apt))}
              </View>
            )}

            {/* My Pending Requests */}
            {myRequestsPending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="hourglass-outline" size={20} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Your Requests</Text>
                </View>
                {myRequestsPending.map(apt => renderAppointmentCard(apt, false))}
              </View>
            )}

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.sectionTitle}>Upcoming</Text>
                </View>
                {upcomingAppointments.map(apt => renderAppointmentCard(apt, false))}
              </View>
            )}

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="time-outline" size={20} color={COLORS.textLight} />
                  <Text style={styles.sectionTitle}>Past</Text>
                </View>
                {pastAppointments.map(apt => renderAppointmentCard(apt, false))}
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
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }} data-testid="close-modal-btn">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Appointment</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Provider Selection */}
            <Text style={styles.fieldLabel}>Select Provider</Text>
            {providers.length === 0 ? (
              <Card style={styles.noProvidersCard}>
                <Icon name="people-outline" size={32} color={COLORS.textLight} />
                <Text style={styles.noProvidersText}>No providers in your team yet</Text>
                <Button 
                  title="Find Providers" 
                  variant="outline"
                  onPress={() => { setShowCreateModal(false); router.push('/(mom)/marketplace'); }}
                />
              </Card>
            ) : (
              <View style={styles.providersList}>
                {providers.map(provider => (
                  <TouchableOpacity
                    key={provider.user_id}
                    style={[
                      styles.providerOption,
                      selectedProvider?.user_id === provider.user_id && styles.providerOptionSelected
                    ]}
                    onPress={() => setSelectedProvider(provider)}
                    data-testid={`provider-${provider.user_id}`}
                  >
                    {provider.picture ? (
                      <Image source={{ uri: provider.picture }} style={styles.providerOptionAvatar} />
                    ) : (
                      <View style={[styles.providerOptionAvatar, { backgroundColor: provider.role === 'DOULA' ? COLORS.roleDoula : COLORS.roleMidwife, justifyContent: 'center', alignItems: 'center' }]}>
                        <Icon name={provider.role === 'DOULA' ? 'heart' : 'medical'} size={20} color={COLORS.white} />
                      </View>
                    )}
                    <View style={styles.providerOptionInfo}>
                      <Text style={styles.providerOptionName}>{provider.full_name}</Text>
                      <Text style={styles.providerOptionRole}>{provider.role}</Text>
                    </View>
                    {selectedProvider?.user_id === provider.user_id && (
                      <Icon name="checkmark-circle" size={24} color={COLORS.success} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Date & Time */}
            <Text style={styles.fieldLabel}>Date & Time</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity 
                style={styles.dateTimeButton} 
                onPress={() => setShowDatePicker(true)}
                data-testid="date-picker-btn"
              >
                <Icon name="calendar" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>
                  {appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.dateTimeButton} 
                onPress={() => setShowTimePicker(true)}
                data-testid="time-picker-btn"
              >
                <Icon name="time" size={20} color={COLORS.primary} />
                <Text style={styles.dateTimeText}>
                  {appointmentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker - Platform specific */}
            {showDatePicker && (
              Platform.OS === 'web' ? (
                <Modal
                  visible={showDatePicker}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowDatePicker(false)}
                >
                  <View style={styles.dateModalOverlay}>
                    <View style={styles.dateModalContent}>
                      <View style={styles.dateModalHeader}>
                        <Text style={styles.dateModalTitle}>Select Date</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Icon name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.webCalendarWrapper}>
                        <input
                          type="date"
                          value={appointmentDate.toISOString().split('T')[0]}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e: any) => {
                            if (e.target.value) {
                              setAppointmentDate(new Date(e.target.value + 'T12:00:00'));
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: 16,
                            fontSize: 18,
                            border: `2px solid ${COLORS.primary}`,
                            borderRadius: 12,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        />
                      </View>
                      <Button
                        title="Done"
                        onPress={() => setShowDatePicker(false)}
                        fullWidth
                        style={{ marginTop: 16 }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={appointmentDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    // On Android, always hide the picker after selection
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    // On iOS, keep it open for spinner mode
                    if (Platform.OS === 'ios' && event.type === 'dismissed') {
                      setShowDatePicker(false);
                    }
                    if (date) setAppointmentDate(date);
                  }}
                />
              )
            )}

            {/* Time Picker - Platform specific */}
            {showTimePicker && (
              Platform.OS === 'web' ? (
                <Modal
                  visible={showTimePicker}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setShowTimePicker(false)}
                >
                  <View style={styles.dateModalOverlay}>
                    <View style={styles.dateModalContent}>
                      <View style={styles.dateModalHeader}>
                        <Text style={styles.dateModalTitle}>Select Time</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                          <Icon name="close" size={24} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.webCalendarWrapper}>
                        <input
                          type="time"
                          value={`${appointmentTime.getHours().toString().padStart(2, '0')}:${appointmentTime.getMinutes().toString().padStart(2, '0')}`}
                          onChange={(e: any) => {
                            if (e.target.value) {
                              const [hours, minutes] = e.target.value.split(':');
                              const newTime = new Date(appointmentTime);
                              newTime.setHours(parseInt(hours), parseInt(minutes));
                              setAppointmentTime(newTime);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: 16,
                            fontSize: 18,
                            border: `2px solid ${COLORS.primary}`,
                            borderRadius: 12,
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        />
                      </View>
                      <Button
                        title="Done"
                        onPress={() => setShowTimePicker(false)}
                        fullWidth
                        style={{ marginTop: 16 }}
                      />
                    </View>
                  </View>
                </Modal>
              ) : (
                <DateTimePicker
                  value={appointmentTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    // On Android, always hide the picker after selection
                    if (Platform.OS === 'android') {
                      setShowTimePicker(false);
                    }
                    // On iOS, keep it open for spinner mode
                    if (Platform.OS === 'ios' && event.type === 'dismissed') {
                      setShowTimePicker(false);
                    }
                    if (date) setAppointmentTime(date);
                  }}
                />
              )
            )}

            {/* Appointment Type */}
            <Text style={styles.fieldLabel}>Appointment Type</Text>
            <View style={styles.typeOptions}>
              {APPOINTMENT_TYPES.map(type => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    appointmentType === type.value && styles.typeOptionSelected
                  ]}
                  onPress={() => setAppointmentType(type.value)}
                  data-testid={`type-${type.value}`}
                >
                  <Text style={[
                    styles.typeOptionText,
                    appointmentType === type.value && styles.typeOptionTextSelected
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Virtual Toggle */}
            <TouchableOpacity 
              style={styles.virtualToggle}
              onPress={() => setIsVirtual(!isVirtual)}
              data-testid="virtual-toggle"
            >
              <Icon name="videocam" size={20} color={isVirtual ? COLORS.primary : COLORS.textSecondary} />
              <Text style={styles.virtualToggleText}>Virtual Appointment</Text>
              <Icon 
                name={isVirtual ? 'checkbox' : 'square-outline'} 
                size={24} 
                color={isVirtual ? COLORS.primary : COLORS.textSecondary} 
              />
            </TouchableOpacity>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes for your provider..."
              placeholderTextColor={COLORS.textLight}
              value={appointmentNotes}
              onChangeText={setAppointmentNotes}
              multiline
              numberOfLines={3}
              data-testid="notes-input"
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title={isCreating ? 'Sending Request...' : 'Send Request'}
              onPress={handleCreateAppointment}
              disabled={!selectedProvider || isCreating}
              loading={isCreating}
              fullWidth
              data-testid="submit-appointment-btn"
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.lg, paddingVertical: SIZES.md },
  backButton: { padding: SIZES.xs },
  headerTitle: { fontSize: SIZES.fontXl, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  addButton: { padding: SIZES.xs },
  headerRight: { width: 40 },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  
  // CTA
  requestCTA: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.lg },
  ctaIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  ctaText: { flex: 1 },
  ctaTitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.white },
  ctaSubtitle: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: 'rgba(255,255,255,0.8)' },
  
  // Sections
  section: { marginBottom: SIZES.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.sm },
  sectionTitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.subheading, color: COLORS.textPrimary, marginLeft: SIZES.xs, flex: 1 },
  badge: { backgroundColor: COLORS.warning, paddingHorizontal: SIZES.sm, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: COLORS.white, fontSize: SIZES.fontXs, fontFamily: FONTS.bodyBold },
  
  // Cards
  appointmentCard: { marginBottom: SIZES.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.sm },
  providerInfo: { flexDirection: 'row', alignItems: 'center' },
  providerAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.sm },
  providerName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  providerRole: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  statusBadge: { paddingHorizontal: SIZES.sm, paddingVertical: 4, borderRadius: SIZES.radiusSm },
  statusText: { fontSize: SIZES.fontXs, fontFamily: FONTS.bodyBold },
  appointmentDetails: { marginTop: SIZES.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.xs },
  detailText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary, marginLeft: SIZES.sm },
  actionButtons: { flexDirection: 'row', marginTop: SIZES.md, gap: SIZES.sm },
  declineButton: { flex: 1 },
  acceptButton: { flex: 1 },
  
  // Empty
  emptyState: { alignItems: 'center', paddingVertical: SIZES.xxl },
  emptyTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading, color: COLORS.textPrimary, marginTop: SIZES.md },
  emptySubtitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textSecondary, textAlign: 'center', marginTop: SIZES.sm, paddingHorizontal: SIZES.lg },
  
  // Loading
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.textSecondary },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SIZES.md, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  modalContent: { flex: 1, padding: SIZES.md },
  modalFooter: { padding: SIZES.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  
  // Fields
  fieldLabel: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary, marginBottom: SIZES.sm, marginTop: SIZES.md },
  
  // Provider Selection
  providersList: { gap: SIZES.sm },
  providerOption: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, borderWidth: 2, borderColor: 'transparent' },
  providerOptionSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  providerOptionAvatar: { width: 48, height: 48, borderRadius: 24, marginRight: SIZES.md },
  providerOptionInfo: { flex: 1 },
  providerOptionName: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, color: COLORS.textPrimary },
  providerOptionRole: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  noProvidersCard: { alignItems: 'center', padding: SIZES.lg },
  noProvidersText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginVertical: SIZES.md },
  
  // Date Time
  dateTimeRow: { flexDirection: 'row', gap: SIZES.sm },
  dateTimeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: SIZES.md, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, gap: SIZES.sm },
  dateTimeText: { fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary },
  
  // Date Modal (web)
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: SIZES.lg },
  dateModalContent: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: SIZES.lg, width: '100%', maxWidth: 400 },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.lg },
  dateModalTitle: { fontSize: SIZES.fontLg, fontFamily: FONTS.heading, color: COLORS.textPrimary },
  webCalendarWrapper: { marginVertical: SIZES.md },
  
  // Type Options
  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.sm },
  typeOption: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border },
  typeOptionSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeOptionText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, color: COLORS.textSecondary },
  typeOptionTextSelected: { color: COLORS.white, fontFamily: FONTS.bodyBold },
  
  // Virtual Toggle
  virtualToggle: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, marginTop: SIZES.md },
  virtualToggleText: { flex: 1, fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary, marginLeft: SIZES.sm },
  
  // Notes
  notesInput: { backgroundColor: COLORS.white, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, fontFamily: FONTS.body, color: COLORS.textPrimary, minHeight: 100, textAlignVertical: 'top' },
});
