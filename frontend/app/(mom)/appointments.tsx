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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
}

const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  prenatal_visit: 'Prenatal Visit',
  birth_planning_session: 'Birth Planning Session',
  postpartum_visit: 'Postpartum Visit',
  consultation: 'Consultation',
};

const STATUS_COLORS: Record<string, string> = {
  pending: COLORS.warning,
  accepted: COLORS.success,
  declined: COLORS.error,
  cancelled: COLORS.textLight,
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      const data = await apiRequest('/api/appointments', { method: 'GET' });
      setAppointments(data || []);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAppointments();
  };

  const handleRespond = async (appointmentId: string, response: 'accepted' | 'declined') => {
    setRespondingId(appointmentId);
    try {
      await apiRequest(`/api/appointments/${appointmentId}/respond?response=${response}`, {
        method: 'PUT',
      });
      
      // Update local state
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
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const pendingAppointments = appointments.filter(a => a.status === 'pending');
  const upcomingAppointments = appointments.filter(a => a.status === 'accepted');
  const pastAppointments = appointments.filter(a => ['declined', 'cancelled'].includes(a.status));

  const renderAppointmentCard = (appointment: Appointment) => {
    const isPending = appointment.status === 'pending';
    const isResponding = respondingId === appointment.appointment_id;

    return (
      <Card key={appointment.appointment_id} style={styles.appointmentCard}>
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
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[appointment.status] + '20' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[appointment.status] }]}>
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
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

        {isPending && (
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Appointments</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[COLORS.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-outline" size={64} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No Appointments Yet</Text>
            <Text style={styles.emptySubtitle}>
              When your doula or midwife schedules an appointment, it will appear here.
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Appointments */}
            {pendingAppointments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="notifications" size={20} color={COLORS.warning} />
                  <Text style={styles.sectionTitle}>Pending Response</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pendingAppointments.length}</Text>
                  </View>
                </View>
                {pendingAppointments.map(renderAppointmentCard)}
              </View>
            )}

            {/* Upcoming Appointments */}
            {upcomingAppointments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.sectionTitle}>Upcoming</Text>
                </View>
                {upcomingAppointments.map(renderAppointmentCard)}
              </View>
            )}

            {/* Past/Cancelled Appointments */}
            {pastAppointments.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Icon name="time-outline" size={20} color={COLORS.textLight} />
                  <Text style={styles.sectionTitle}>Past</Text>
                </View>
                {pastAppointments.map(renderAppointmentCard)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  headerRight: {
    width: 32,
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
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  badge: {
    backgroundColor: COLORS.warning,
    borderRadius: 12,
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    color: COLORS.white,
  },
  appointmentCard: {
    marginBottom: SIZES.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.md,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  providerName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  providerRole: {
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
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  detailText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    marginLeft: SIZES.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SIZES.md,
  },
  declineButton: {
    flex: 1,
  },
  acceptButton: {
    flex: 1,
  },
});
