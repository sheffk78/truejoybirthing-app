import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

interface Milestone {
  week: number;
  title: string;
  description: string;
  date: string;
  is_past: boolean;
  is_current: boolean;
}

interface CustomEvent {
  event_id: string;
  title: string;
  description: string;
  event_date: string;
  event_type: string;
}

export default function TimelineScreen() {
  const [timeline, setTimeline] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', event_type: 'appointment' });
  const [saving, setSaving] = useState(false);

  const fetchTimeline = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.TIMELINE);
      setTimeline(data);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTimeline();
    setRefreshing(false);
  };

  const addEvent = async () => {
    if (!newEvent.title || !newEvent.event_date) {
      Alert.alert('Error', 'Please fill in title and date');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.TIMELINE_EVENTS, {
        method: 'POST',
        body: newEvent,
      });
      setModalVisible(false);
      setNewEvent({ title: '', description: '', event_date: '', event_type: 'appointment' });
      await fetchTimeline();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add event');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert('Delete Event', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`${API_ENDPOINTS.TIMELINE_EVENTS}/${eventId}`, { method: 'DELETE' });
            await fetchTimeline();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete event');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Pregnancy Timeline</Text>
          {timeline?.current_week && (
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>Week {timeline.current_week}</Text>
            </View>
          )}
        </View>

        {timeline?.due_date && (
          <Text style={styles.dueDate}>Due Date: {timeline.due_date}</Text>
        )}

        {/* Add Event Button */}
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)} data-testid="add-event-btn">
          <Icon name="add-circle" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Appointment</Text>
        </TouchableOpacity>

        {/* Custom Events */}
        {timeline?.custom_events?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Events & Appointments</Text>
            {timeline.custom_events.map((event: CustomEvent) => (
              <Card key={event.event_id} style={styles.eventCard}>
                <View style={styles.eventRow}>
                  <View style={[styles.eventIcon, { backgroundColor: COLORS.primary + '20' }]}>
                    <Icon 
                      name={event.event_type === 'appointment' ? 'calendar' : 'bookmark'} 
                      size={18} 
                      color={COLORS.primary} 
                    />
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
                    {event.description && (
                      <Text style={styles.eventDesc}>{event.description}</Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => deleteEvent(event.event_id)}>
                    <Icon name="trash" size={18} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Milestones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pregnancy Milestones</Text>
          <View style={styles.timelineContainer}>
            {timeline?.milestones?.map((milestone: Milestone, index: number) => (
              <View key={milestone.week} style={styles.milestoneRow}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.timelineDot,
                    milestone.is_current && styles.timelineDotCurrent,
                    milestone.is_past && styles.timelineDotPast,
                  ]}>
                    {milestone.is_current && (
                      <Icon name="heart" size={12} color={COLORS.white} />
                    )}
                  </View>
                  {index < (timeline?.milestones?.length || 0) - 1 && (
                    <View style={[
                      styles.timelineLine,
                      milestone.is_past && styles.timelineLinePast,
                    ]} />
                  )}
                </View>
                <Card style={[
                  styles.milestoneCard,
                  milestone.is_current && styles.milestoneCardCurrent,
                ]}>
                  <View style={styles.milestoneHeader}>
                    <Text style={styles.milestoneWeek}>Week {milestone.week}</Text>
                    <Text style={styles.milestoneDate}>{formatDate(milestone.date)}</Text>
                  </View>
                  <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                  <Text style={styles.milestoneDesc}>{milestone.description}</Text>
                </Card>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Event</Text>
            
            <Text style={styles.inputLabel}>Title *</Text>
            <TextInput
              style={styles.input}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              placeholder="e.g., Prenatal Appointment"
              placeholderTextColor={COLORS.textLight}
              data-testid="event-title-input"
            />
            
            <Text style={styles.inputLabel}>Date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={newEvent.event_date}
              onChangeText={(text) => setNewEvent({ ...newEvent, event_date: text })}
              placeholder="2025-06-15"
              placeholderTextColor={COLORS.textLight}
              data-testid="event-date-input"
            />
            
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
              placeholder="Optional notes..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
            
            <Text style={styles.inputLabel}>Type</Text>
            <View style={styles.typeButtons}>
              {['appointment', 'custom'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, newEvent.event_type === type && styles.typeButtonActive]}
                  onPress={() => setNewEvent({ ...newEvent, event_type: type })}
                >
                  <Text style={[styles.typeButtonText, newEvent.event_type === type && styles.typeButtonTextActive]}>
                    {type === 'appointment' ? 'Appointment' : 'Custom Event'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addEvent} disabled={saving} data-testid="save-event-btn">
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Event'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.xs },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.textPrimary },
  weekBadge: { backgroundColor: COLORS.primary, paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusFull },
  weekBadgeText: { color: COLORS.white, fontWeight: '600', fontSize: SIZES.fontSm },
  dueDate: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, marginBottom: SIZES.lg },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, padding: SIZES.md, borderRadius: SIZES.radiusMd, marginBottom: SIZES.lg, gap: SIZES.xs },
  addButtonText: { color: COLORS.white, fontWeight: '600', fontSize: SIZES.fontMd },
  section: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.md },
  eventCard: { marginBottom: SIZES.sm },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },
  eventDate: { fontSize: SIZES.fontSm, color: COLORS.primary },
  eventDesc: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, marginTop: 2 },
  timelineContainer: { marginLeft: SIZES.md },
  milestoneRow: { flexDirection: 'row', minHeight: 100 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.border, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotCurrent: { backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12 },
  timelineDotPast: { backgroundColor: COLORS.success },
  timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border },
  timelineLinePast: { backgroundColor: COLORS.success },
  milestoneCard: { flex: 1, marginLeft: SIZES.sm, marginBottom: SIZES.md },
  milestoneCardCurrent: { borderWidth: 2, borderColor: COLORS.primary },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.xs },
  milestoneWeek: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.primary },
  milestoneDate: { fontSize: SIZES.fontSm, color: COLORS.textLight },
  milestoneTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 4 },
  milestoneDesc: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg, padding: SIZES.lg, paddingBottom: SIZES.xxl },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SIZES.lg, textAlign: 'center' },
  inputLabel: { fontSize: SIZES.fontSm, fontWeight: '600', color: COLORS.textSecondary, marginBottom: SIZES.xs },
  input: { backgroundColor: COLORS.background, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.textPrimary, marginBottom: SIZES.md, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeButtons: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.lg },
  typeButton: { flex: 1, padding: SIZES.sm, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  typeButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeButtonText: { color: COLORS.textSecondary, fontWeight: '600' },
  typeButtonTextActive: { color: COLORS.white },
  modalActions: { flexDirection: 'row', gap: SIZES.md },
  cancelBtn: { flex: 1, padding: SIZES.md, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.border, alignItems: 'center' },
  cancelBtnText: { color: COLORS.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: SIZES.md, borderRadius: SIZES.radiusMd, backgroundColor: COLORS.primary, alignItems: 'center' },
  saveBtnText: { color: COLORS.white, fontWeight: '600' },
});
