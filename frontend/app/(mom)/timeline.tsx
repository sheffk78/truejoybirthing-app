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
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

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
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const [timeline, setTimeline] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', event_type: 'appointment' });
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const formatted = date.toISOString().split('T')[0];
      setNewEvent({ ...newEvent, event_date: formatted });
    }
  };

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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

        {/* Schedule with Provider Button */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => router.push('/(mom)/appointments')} 
          data-testid="schedule-btn"
        >
          <Icon name="calendar" size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Schedule with Provider</Text>
        </TouchableOpacity>

        {/* Custom Events */}
        {timeline?.custom_events?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Events & Appointments</Text>
            {timeline.custom_events.map((event: CustomEvent) => (
              <Card key={event.event_id} style={styles.eventCard}>
                <View style={styles.eventRow}>
                  <View style={[styles.eventIcon, { backgroundColor: colors.primary + '20' }]}>
                    <Icon 
                      name={event.event_type === 'appointment' ? 'calendar' : 'bookmark'} 
                      size={18} 
                      color={colors.primary} 
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
                    <Icon name="trash" size={18} color={colors.error} />
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
                      <Icon name="heart" size={12} color={colors.white} />
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
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Appointment</Text>
            
            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                value={newEvent.title}
                onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
                placeholder="e.g., Prenatal Checkup"
                placeholderTextColor={colors.textLight}
                data-testid="event-title-input"
              />
              
              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
                data-testid="event-date-picker-btn"
              >
                <Icon name="calendar" size={20} color={colors.primary} />
                <Text style={[styles.dateButtonText, !newEvent.event_date && styles.dateButtonPlaceholder]}>
                  {newEvent.event_date ? formatDisplayDate(newEvent.event_date) : 'Select appointment date'}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newEvent.description}
                onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                placeholder="Optional notes..."
                placeholderTextColor={colors.textLight}
                multiline
                numberOfLines={3}
              />
              
              {/* Extra padding for keyboard */}
              <View style={{ height: 40 }} />
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addEvent} disabled={saving} data-testid="save-event-btn">
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Modal */}
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
                    <Icon name="close" size={24} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.webCalendarWrapper}>
                  <input
                    type="date"
                    value={newEvent.event_date || ''}
                    onChange={(e: any) => {
                      setNewEvent({ ...newEvent, event_date: e.target.value });
                      if (e.target.value) {
                        setSelectedDate(new Date(e.target.value));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: 16,
                      fontSize: 18,
                      border: `2px solid ${colors.primary}`,
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
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
          />
        )
      )}
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SIZES.xs },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700', color: colors.text },
  weekBadge: { backgroundColor: colors.primary, paddingHorizontal: SIZES.md, paddingVertical: SIZES.xs, borderRadius: SIZES.radiusFull },
  weekBadgeText: { color: colors.white, fontWeight: '600', fontSize: SIZES.fontSm },
  dueDate: { fontSize: SIZES.fontMd, color: colors.textSecondary, marginBottom: SIZES.lg },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: SIZES.md, borderRadius: SIZES.radiusMd, marginBottom: SIZES.lg, gap: SIZES.xs },
  addButtonText: { color: colors.white, fontWeight: '600', fontSize: SIZES.fontMd },
  section: { marginBottom: SIZES.lg },
  sectionTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: colors.text, marginBottom: SIZES.md },
  eventCard: { marginBottom: SIZES.sm },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start' },
  eventIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: colors.text },
  eventDate: { fontSize: SIZES.fontSm, color: colors.primary },
  eventDesc: { fontSize: SIZES.fontSm, color: colors.textSecondary, marginTop: 2 },
  timelineContainer: { marginLeft: SIZES.md },
  milestoneRow: { flexDirection: 'row', minHeight: 100 },
  timelineLeft: { width: 30, alignItems: 'center' },
  timelineDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  timelineDotCurrent: { backgroundColor: colors.primary, width: 24, height: 24, borderRadius: 12 },
  timelineDotPast: { backgroundColor: colors.success },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border },
  timelineLinePast: { backgroundColor: colors.success },
  milestoneCard: { flex: 1, marginLeft: SIZES.sm, marginBottom: SIZES.md },
  milestoneCardCurrent: { borderWidth: 2, borderColor: colors.primary },
  milestoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SIZES.xs },
  milestoneWeek: { fontSize: SIZES.fontSm, fontWeight: '600', color: colors.primary },
  milestoneDate: { fontSize: SIZES.fontSm, color: colors.textLight },
  milestoneTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: colors.text, marginBottom: 4 },
  milestoneDesc: { fontSize: SIZES.fontSm, color: colors.textSecondary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg, padding: SIZES.lg, paddingBottom: SIZES.xxl, maxHeight: '80%' },
  modalScroll: { maxHeight: 350 },
  modalTitle: { fontSize: SIZES.fontLg, fontWeight: '600', color: colors.text, marginBottom: SIZES.lg, textAlign: 'center' },
  inputLabel: { fontSize: SIZES.fontSm, fontWeight: '600', color: colors.textSecondary, marginBottom: SIZES.xs },
  input: { backgroundColor: colors.background, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, color: colors.text, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.border },
  datePickerWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: SIZES.radiusMd, padding: SIZES.md, marginBottom: SIZES.md, borderWidth: 1, borderColor: colors.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  typeButtons: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.lg },
  typeButton: { flex: 1, padding: SIZES.sm, borderRadius: SIZES.radiusMd, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  typeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeButtonText: { color: colors.textSecondary, fontWeight: '600' },
  typeButtonTextActive: { color: colors.white },
  modalActions: { flexDirection: 'row', gap: SIZES.md },
  cancelBtn: { flex: 1, padding: SIZES.md, borderRadius: SIZES.radiusMd, backgroundColor: colors.border, alignItems: 'center' },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, padding: SIZES.md, borderRadius: SIZES.radiusMd, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { color: colors.white, fontWeight: '600' },
  datePickerButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.background, 
    borderRadius: SIZES.radiusMd, 
    padding: SIZES.md, 
    marginBottom: SIZES.md, 
    borderWidth: 1, 
    borderColor: colors.border,
    minHeight: 52,
  },
  dateButtonText: { 
    flex: 1, 
    fontSize: SIZES.fontMd, 
    color: colors.text, 
    marginLeft: SIZES.sm 
  },
  dateButtonPlaceholder: { 
    color: colors.textLight 
  },
  dateModalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: SIZES.lg 
  },
  dateModalContent: { 
    backgroundColor: colors.white, 
    borderRadius: SIZES.radiusLg, 
    padding: SIZES.lg, 
    width: '100%', 
    maxWidth: 400 
  },
  dateModalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: SIZES.lg 
  },
  dateModalTitle: { 
    fontSize: SIZES.fontLg, 
    fontFamily: FONTS.heading, 
    color: colors.text 
  },
  webCalendarWrapper: { 
    marginVertical: SIZES.md 
  },
}));
