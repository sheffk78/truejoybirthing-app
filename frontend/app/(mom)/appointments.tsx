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
  KeyboardAvoidingView,
} from 'react-native';
import { formatDateLocal, todayLocal } from '../../src/utils/date';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TIcon from '../../src/components/TIcon';
import HBand from '../../src/components/mom/HBand';
import { C, F, BAND_APPOINTMENTS } from '../../src/constants/designRefresh';

interface Appointment {
  appointment_id: string;
  provider_id: string;
  provider_name: string;
  provider_role: string;
  provider_picture?: string;
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

// ---- Approved S7 chip law (mockup .schip): done sage / wip lavender / warn rose / todo gray ----
const STATUS_CHIP: Record<string, { label: string; color: string; bg: string }> = {
  accepted: { label: 'Confirmed', color: C.sage, bg: C.sageBg },
  scheduled: { label: 'Confirmed', color: C.sage, bg: C.sageBg },
  confirmed: { label: 'Confirmed', color: C.sage, bg: C.sageBg },
  pending: { label: 'Pending', color: C.lavender, bg: C.lavenderBg },
  declined: { label: 'Declined', color: C.rose, bg: C.roseBg },
  cancelled: { label: 'Cancelled', color: C.grayLight, bg: C.track },
  completed: { label: 'Visited', color: C.sage, bg: C.sageBg },
};

// ---- Approved S7 row icon law (mockup .sico): sage leaf for in-person, lavender video for virtual ----
const rowIconFor = (apt: Appointment): { name: string; color: string; bg: string } => {
  if (apt.is_virtual) return { name: 'messages', color: C.lavender, bg: C.lavenderBg };
  return { name: 'k_timeline', color: C.sage, bg: C.sageBg };
};

export default function AppointmentsScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const params = useLocalSearchParams<{ providerId?: string; providerName?: string }>();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

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
    } catch (error: any) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fix 5.7: Handle pre-selection from URL params in a separate effect that
  // runs once when providerId is first received, rather than inside fetchData
  // (which would re-open the modal on every fetch, including pull-to-refresh)
  useEffect(() => {
    if (!params.providerId) return;
    if (providers.length === 0) return; // Wait for providers to load
    const provider = providers.find((p: Provider) => p.user_id === params.providerId);
    if (provider) {
      setSelectedProvider(provider);
      setPreSelectedProviderId(params.providerId);
      setShowCreateModal(true);
      // Clear the param so it doesn't re-trigger on subsequent fetches/refreshes
      router.setParams({ providerId: undefined, providerName: undefined } as any);
    }
  }, [params.providerId, providers]);

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

  const handleDeleteAppointment = async (appointmentId: string) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment? This cannot be undone.',
      [
        { text: 'No, Keep It', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiRequest(`/appointments/${appointmentId}`, { method: 'DELETE' });
              Alert.alert('Success', 'Appointment cancelled successfully.');
              fetchData();
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to cancel appointment');
            }
          },
        },
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
      const dateStr = formatDateLocal(appointmentDate);
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

  // Approved S7 date law (mockup .mmeta): "Tue, Sep 22" — compact weekday form
  const formatRowDate = (dateStr: string) => {
    const date = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending' && a.created_by !== 'mom');
  const myRequestsPending = appointments.filter(a => a.status === 'pending' && a.created_by === 'mom');
  const upcomingAppointments = appointments.filter(a => ['accepted', 'scheduled', 'confirmed'].includes(a.status));
  const pastAppointments = appointments.filter(a => ['declined', 'cancelled', 'completed'].includes(a.status));

  const renderAppointmentRow = (appointment: Appointment, showActions = true) => {
    const isPending = appointment.status === 'pending' && appointment.created_by !== 'mom';
    const isMyRequest = appointment.status === 'pending' && appointment.created_by === 'mom';
    const isResponding = respondingId === appointment.appointment_id;
    const isUpcoming = ['accepted', 'scheduled', 'confirmed'].includes(appointment.status);
    const chip = STATUS_CHIP[appointment.status] ?? {
      label: appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1),
      color: C.grayLight,
      bg: C.track,
    };
    const ico = rowIconFor(appointment);
    const title = isMyRequest && appointment.appointment_type === 'consultation'
      ? 'Your Request'
      : APPOINTMENT_TYPE_LABELS[appointment.appointment_type] || appointment.appointment_type;

    return (
      <TouchableOpacity
        key={appointment.appointment_id}
        style={styles.srow}
        activeOpacity={0.7}
        onPress={() => confirmResponse(appointment.appointment_id, 'declined')}
        data-testid={`appointment-${appointment.appointment_id}`}
      >
        <View style={[styles.sico, { backgroundColor: ico.bg }]}>
          <TIcon name={ico.name} size={20} color={ico.color} />
        </View>
        <View style={styles.smid}>
          <Text style={styles.sh3}>{title}</Text>
          <View style={styles.smeta}>
            <Text style={styles.mmeta}>
              {appointment.provider_name || 'Personal'}
              {appointment.provider_role ? ` · ${appointment.provider_role}` : ''}
            </Text>
          </View>
          <View style={styles.smeta}>
            <Text style={styles.mmeta}>
              {formatRowDate(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}
            </Text>
            <View style={[styles.schip, { backgroundColor: chip.bg }]}>
              <Text style={[styles.schipText, { color: chip.color }]}>{chip.label}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.lavender} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Approved S7 header: photo band + Your Care overline + H1 (hband variant, prior art S10/S11/S12) */}
      <View style={[styles.bandWrap, { marginTop: -insets.top }]}>
        <HBand source={BAND_APPOINTMENTS} height={168 + insets.top} focus="50% 45%" />
        <View style={[styles.mhead, { paddingTop: insets.top + 24 }]}>
          <Text style={styles.overline}>Your Care</Text>
          <Text style={styles.headerTitle}>
            Your <Text style={styles.headerTitleAccent}>Appointments</Text>
          </Text>
          <Text style={styles.headerSub}>Visits with your team — respond, reschedule, breathe</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[C.lavender]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {appointments.length === 0 && providers.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIco}>
              <TIcon name="bell" size={34} color={C.lavender} />
            </View>
            <Text style={styles.emptyTitle}>No visits yet</Text>
            <Text style={styles.emptySubtitle}>
              Connect with a doula or midwife through the Marketplace to start scheduling visits.
            </Text>
            <Button
              title="Browse Marketplace"
              onPress={() => router.push('/(mom)/marketplace')}
              style={{ marginTop: 16 }}
            />
          </View>
        ) : (
          <>
            {/* Needs Your Response — approved srow + inline rbtn accept/decline */}
            {pendingAppointments.length > 0 && (
              <View style={styles.sect}>
                <Text style={styles.sh2}>Needs your response</Text>
                <Text style={styles.sectSub}>{pendingAppointments.length} visit{pendingAppointments.length === 1 ? '' : 's'} waiting on you</Text>
                {pendingAppointments.map(apt => (
                  <View key={apt.appointment_id} style={styles.pendingBlock}>
                    {renderAppointmentRow(apt, true)}
                    <View style={styles.btnrow}>
                      <TouchableOpacity
                        style={styles.rbtnNo}
                        disabled={respondingId === apt.appointment_id}
                        onPress={() => confirmResponse(apt.appointment_id, 'declined')}
                      >
                        <Text style={styles.rbtnNoText}>Decline</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rbtnYes}
                        disabled={respondingId === apt.appointment_id}
                        onPress={() => confirmResponse(apt.appointment_id, 'accepted')}
                      >
                        <Text style={styles.rbtnYesText}>
                          {respondingId === apt.appointment_id ? 'Responding…' : 'Accept'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Your Requests */}
            {myRequestsPending.length > 0 && (
              <View style={styles.sect}>
                <Text style={styles.sh2}>Your requests</Text>
                <Text style={styles.sectSub}>Waiting for your provider to confirm</Text>
                {myRequestsPending.map(apt => renderAppointmentRow(apt, false))}
              </View>
            )}

            {/* Upcoming */}
            {upcomingAppointments.length > 0 && (
              <View style={styles.sect}>
                <Text style={styles.sh2}>Upcoming</Text>
                <Text style={styles.sectSub}>
                  {upcomingAppointments.length} visit{upcomingAppointments.length === 1 ? '' : 's'} on the calendar
                </Text>
                {upcomingAppointments.map(apt => renderAppointmentRow(apt, false))}
              </View>
            )}

            {/* Past */}
            {pastAppointments.length > 0 && (
              <View style={styles.sect}>
                <Text style={styles.sh2}>Past</Text>
                <Text style={styles.sectSub}>Your visit history</Text>
                {pastAppointments.map(apt => renderAppointmentRow(apt, false))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Approved S7 footer CTA (mockup .dl .abtn + hint) */}
      <View style={styles.dl}>
        <TouchableOpacity
          style={styles.abtn}
          onPress={() => setShowCreateModal(true)}
          data-testid="create-appointment-btn"
        >
          <Text style={styles.abtnText}>Schedule a Visit</Text>
        </TouchableOpacity>
        <Text style={styles.dlHint}>Your provider's openings, ready when you are</Text>
      </View>

      {/* Create Appointment Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <SafeAreaView style={styles.modalContainer} edges={['top']}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }} data-testid="close-modal-btn">
                <Text style={styles.modalCloseX}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Request Appointment</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 120 }}
            >
            {/* Provider Selection */}
            <Text style={styles.fieldLabel}>Select Provider</Text>
            {providers.length === 0 ? (
              <Card style={styles.noProvidersCard}>
                <TIcon name="team" size={32} color={C.grayLight} />
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
                      <View style={[styles.providerOptionAvatar, { backgroundColor: provider.role === 'DOULA' ? C.roseBg : provider.role === 'MIDWIFE' ? C.sageBg : C.lavenderBg, justifyContent: 'center', alignItems: 'center' }]}>
                        <TIcon
                          name={provider.role === 'DOULA' ? 'pushing_safe_word' : provider.role === 'MIDWIFE' ? 'k_timeline' : 'newborn_care'}
                          size={20}
                          color={provider.role === 'DOULA' ? C.rose : provider.role === 'MIDWIFE' ? C.sage : C.lavender}
                        />
                      </View>
                    )}
                    <View style={styles.providerOptionInfo}>
                      <Text style={styles.providerOptionName}>{provider.full_name}</Text>
                      <Text style={styles.providerOptionRole}>{provider.role}</Text>
                    </View>
                    {selectedProvider?.user_id === provider.user_id && (
                      <TIcon name="status_done" size={22} color={C.sage} />
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
                <TIcon name="ar_contract" size={20} color={C.lavender} />
                <Text style={styles.dateTimeText}>
                  {appointmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
                data-testid="time-picker-btn"
              >
                <TIcon name="timer" size={20} color={C.lavender} />
                <Text style={styles.dateTimeText}>
                  {appointmentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Date Picker */}
            {showDatePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={appointmentDate}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && date) {
                    setAppointmentDate(date);
                  }
                }}
              />
            )}
            {showDatePicker && Platform.OS !== 'android' && (
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
                        <Text style={styles.modalCloseX}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {Platform.OS === 'web' ? (
                      <View style={styles.webCalendarWrapper}>
                        <input
                          type="date"
                          value={formatDateLocal(appointmentDate)}
                          min={todayLocal()}
                          onChange={(e: any) => {
                            if (e.target.value) {
                              setAppointmentDate(new Date(e.target.value + 'T12:00:00'));
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: 16,
                            fontSize: 18,
                            border: `2px solid ${C.lavender}`,
                            borderRadius: 12,
                            outline: 'none',
                            cursor: 'pointer',
                            color: C.ink,
                            backgroundColor: C.cardBg,
                            fontFamily: 'Quicksand',
                          }}
                        />
                      </View>
                    ) : (
                      <View style={styles.nativeTimePickerWrapper}>
                        <DateTimePicker
                          value={appointmentDate}
                          mode="date"
                          display="default"
                          minimumDate={new Date()}
                          onChange={(event, date) => {
                            if (date) setAppointmentDate(date);
                          }}
                          textColor={C.ink}
                          style={{ width: '100%', height: 320 }}
                        />
                      </View>
                    )}
                    <Button
                      title="Done"
                      onPress={() => setShowDatePicker(false)}
                      fullWidth
                      style={{ marginTop: 16 }}
                    />
                  </View>
                </View>
              </Modal>
            )}

            {/* Time Picker */}
            {showTimePicker && Platform.OS === 'android' && (
              <DateTimePicker
                value={appointmentTime}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowTimePicker(false);
                  if (event.type === 'set' && date) {
                    setAppointmentTime(date);
                  }
                }}
              />
            )}
            {showTimePicker && Platform.OS !== 'android' && (
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
                        <Text style={styles.modalCloseX}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    {Platform.OS === 'web' ? (
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
                            border: `2px solid ${C.lavender}`,
                            borderRadius: 12,
                            outline: 'none',
                            cursor: 'pointer',
                            color: C.ink,
                            backgroundColor: C.cardBg,
                            fontFamily: 'Quicksand',
                          }}
                        />
                      </View>
                    ) : (
                      <View style={styles.nativeTimePickerWrapper}>
                        <DateTimePicker
                          value={appointmentTime}
                          mode="time"
                          display="default"
                          onChange={(event, date) => {
                            if (date) setAppointmentTime(date);
                          }}
                          textColor={C.ink}
                          style={{ width: '100%', height: 200 }}
                        />
                      </View>
                    )}
                    <Button
                      title="Done"
                      onPress={() => setShowTimePicker(false)}
                      fullWidth
                      style={{ marginTop: 16 }}
                    />
                  </View>
                </View>
              </Modal>
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
              <TIcon name="messages" size={20} color={isVirtual ? C.lavender : C.grayLight} />
              <Text style={styles.virtualToggleText}>Virtual Appointment</Text>
              <TIcon
                name={isVirtual ? 'status_done' : 'status_todo'}
                size={22}
                color={isVirtual ? C.lavender : C.grayLight}
              />
            </TouchableOpacity>

            {/* Notes */}
            <Text style={styles.fieldLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes for your provider..."
              placeholderTextColor={C.grayLight}
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
              disabled={(!selectedProvider && !isPersonalAppointment) || isCreating}
              loading={isCreating}
              fullWidth
              data-testid="submit-appointment-btn"
            />
          </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles(() => ({
  container: { flex: 1, backgroundColor: C.cream },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.cream },
  loadingText: { marginTop: 12, fontSize: 13, fontFamily: F.ui, color: C.gray },

  // —— Approved S7 header (.hband + .m-head) ——
  bandWrap: { position: 'relative', zIndex: 1 },
  mhead: { paddingHorizontal: 20, paddingBottom: 6 },
  overline: {
    fontSize: 10,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    color: C.rose,
    marginBottom: 5,
    fontFamily: F.uiBold,
  },
  headerTitle: { fontSize: 26, fontFamily: F.serif, color: C.ink, lineHeight: 30 },
  headerTitleAccent: { color: C.roseSoft },
  headerSub: { fontSize: 12.5, color: C.gray, marginTop: 4, fontFamily: F.ui, fontWeight: '500' },

  scrollContent: { paddingBottom: 24 },

  // —— Approved section (.sect) ——
  sect: { marginHorizontal: 20, marginTop: 16 },
  sh2: { fontFamily: F.serif, fontWeight: '700', fontSize: 21, color: C.ink, marginBottom: 2 },
  sectSub: { fontSize: 11.5, color: C.gray, fontFamily: F.ui, fontWeight: '500', marginBottom: 10 },

  // —— Approved schedule row (.srow) ——
  srow: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sico: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  smid: { flex: 1, minWidth: 0 },
  sh3: { fontFamily: F.serifSemi, fontSize: 17, color: C.ink },
  smeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  mmeta: { fontSize: 11, color: C.gray, fontFamily: F.ui, fontWeight: '500' },
  schip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 2 },
  schipText: { fontSize: 9.5, letterSpacing: 0.6, fontWeight: '700', textTransform: 'uppercase', fontFamily: F.uiBold },
  chev: { color: C.chev, fontSize: 16, flexShrink: 0, fontWeight: '300' },

  // —— Approved inline respond buttons (.btnrow .rbtn) ——
  pendingBlock: { marginBottom: 8 },
  btnrow: { flexDirection: 'row', gap: 8, marginTop: 0 },
  rbtnYes: { flex: 1, backgroundColor: C.lavenderSoft, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  rbtnYesText: { color: C.white, fontSize: 11.5, fontWeight: '700', fontFamily: F.uiBold },
  rbtnNo: { flex: 1, borderWidth: 1.3, borderColor: C.lavenderBorder, backgroundColor: C.cardBg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center' },
  rbtnNoText: { color: C.lavender, fontSize: 11.5, fontWeight: '700', fontFamily: F.uiBold },

  // —— Approved footer CTA (.dl .abtn + .hint) ——
  dl: { marginHorizontal: 20, marginTop: 16 },
  abtn: { backgroundColor: C.lavender, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center' },
  abtnText: { color: C.white, fontSize: 13, fontWeight: '600', fontFamily: F.uiSemi },
  dlHint: { textAlign: 'center', fontSize: 11, color: C.gray, marginTop: 7, fontFamily: F.ui, fontWeight: '500' },

  // —— Empty state ——
  emptyState: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyIco: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.lavenderBg, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 21, fontFamily: F.serif, color: C.ink, marginTop: 12 },
  emptySubtitle: { fontSize: 12.5, fontFamily: F.ui, color: C.gray, textAlign: 'center', marginTop: 6, lineHeight: 18 },

  // —— Modal ——
  modalContainer: { flex: 1, backgroundColor: C.cream },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: C.hairline },
  modalTitle: { fontSize: 21, fontFamily: F.serif, fontWeight: '700', color: C.ink },
  modalCloseX: { fontSize: 18, color: C.gray, fontWeight: '600', paddingHorizontal: 6 },
  modalContent: { flex: 1, padding: 20 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: C.hairline },

  fieldLabel: { fontSize: 12, fontFamily: F.uiBold, fontWeight: '700', color: C.gray, marginBottom: 8, marginTop: 16, letterSpacing: 0.3 },

  providersList: { gap: 8 },
  providerOption: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: C.white, borderRadius: 18, borderWidth: 2, borderColor: 'transparent' },
  providerOptionSelected: { borderColor: C.lavender, backgroundColor: C.lavenderBg },
  providerOptionAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  providerOptionInfo: { flex: 1 },
  providerOptionName: { fontSize: 14, fontFamily: F.uiSemi, fontWeight: '600', color: C.ink },
  providerOptionRole: { fontSize: 11.5, fontFamily: F.ui, color: C.gray },
  noProvidersCard: { alignItems: 'center', padding: 24 },
  noProvidersText: { fontSize: 13, fontFamily: F.ui, color: C.gray, marginVertical: 16 },

  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateTimeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, gap: 10 },
  dateTimeText: { fontSize: 13.5, fontFamily: F.ui, fontWeight: '600', color: C.ink },

  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(42,42,42,0.4)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  dateModalContent: { backgroundColor: C.white, borderRadius: 22, padding: 24, width: '100%', maxWidth: 400 },
  dateModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  dateModalTitle: { fontSize: 21, fontFamily: F.serif, fontWeight: '700', color: C.ink },
  webCalendarWrapper: { marginVertical: 12 },
  nativeTimePickerWrapper: { alignItems: 'center', justifyContent: 'center', marginVertical: 12 },

  typeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.white, borderRadius: 999, borderWidth: 1.3, borderColor: C.lavenderBorder },
  typeOptionSelected: { backgroundColor: C.lavender, borderColor: C.lavender },
  typeOptionText: { fontSize: 12, fontFamily: F.ui, fontWeight: '600', color: C.gray },
  typeOptionTextSelected: { color: C.white, fontFamily: F.uiBold, fontWeight: '700' },

  virtualToggle: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, marginTop: 16 },
  virtualToggleText: { flex: 1, fontSize: 13.5, fontFamily: F.ui, color: C.ink, marginLeft: 10 },

  notesInput: { backgroundColor: C.white, borderRadius: 18, borderWidth: 1, borderColor: C.border, padding: 14, fontSize: 13.5, fontFamily: F.ui, color: C.ink, minHeight: 96, textAlignVertical: 'top' },
}));