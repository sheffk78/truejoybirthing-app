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
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { formatDateLocal } from '../../src/utils/date';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, kickerStyle, trimesterOf, BAND_HOME } from '../../src/constants/corpus';
import GrowthSprig from '../../src/components/GrowthSprig'; // 10/07 drift fix: growth motif wired in
import { getPregnancyIllustration } from '../../src/constants/pregnancyIllustrations';

const DF = F;

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

  // 10/07: date handling now inline in the picker sheet (Confirm Date button);
  // the old auto-commit handleDateChange caused the Android-style instant close
  // and is retired. Android uses the same inline sheet (spinner display).

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
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateParts = (dateStr: string) => {
    if (!dateStr) return { month: '', day: '' };
    const date = new Date(dateStr);
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      day: date.toLocaleDateString('en-US', { day: 'numeric' }),
    };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.overline}>Your Journey</Text>
          <Text style={styles.title}>
            Pregnancy <Text style={styles.titleAccent}>Timeline</Text>
          </Text>
          {timeline?.due_date && (
            <Text style={styles.subtitle}>Due {timeline.due_date} · everything in one line</Text>
          )}
        </View>

        {/* Where you are — week anchor card */}
        {timeline?.current_week && (
          <View style={styles.anchorCard}>
            <Image
              source={getPregnancyIllustration(timeline.current_week) ?? BAND_HOME}
              style={styles.anchorArt}
              resizeMode="cover"
            />
            <View style={styles.anchorBody}>
              <View style={styles.anchorRow}>
                <Text style={styles.anchorTitle}>Where you are</Text>
                <Text style={styles.anchorWeek}>
                  WEEK {timeline.current_week}
                  {timeline.due_date ? ` · ${formatDate(timeline.due_date)}` : ''}
                </Text>
              </View>
              <Text style={styles.anchorDesc}>
                {trimesterOf(timeline.current_week)}
                {timeline.current_day != null ? ` · day ${timeline.current_day} of week ${timeline.current_week}` : ''}
                {timeline.due_date ? ` — due ${timeline.due_date}` : ''}
              </Text>
              {timeline?.custom_events?.length > 0 && (
                <View style={styles.nextRow}>
                  <View style={styles.nextThumb}>
                    <Icon name="calendar" size={18} color={C.lavender} />
                  </View>
                  <Text style={styles.nextText} numberOfLines={2}>
                    Next: {timeline.custom_events[0].title} · {formatDate(timeline.custom_events[0].event_date)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Baby this week — Jeff 10/01: timeline was thin; weekly baby content
            (size comparison + what's happening) from the shared editorial set */}
        {timeline?.baby_development && (
          <View style={styles.babyCard} data-testid="baby-week-card">
            <Text style={styles.babyKicker}>BABY THIS WEEK</Text>
            <Text style={styles.babyTitle}>{timeline.baby_development.title}</Text>
            {!!timeline.baby_development.size_note && (
              <Text style={styles.babySize}>
                {timeline.baby_development.food ? `About the size of a ${timeline.baby_development.food} · ` : ''}
                {timeline.baby_development.size_note}
              </Text>
            )}
            <Text style={styles.babyDesc}>{timeline.baby_development.description}</Text>
          </View>
        )}

        {/* Trimester progress — position in the 40-week journey at a glance */}
        {timeline?.current_week && (
          <View style={styles.triCard} data-testid="trimester-progress">
            <View style={styles.triHead}>
              <Text style={styles.babyKicker}>PROGRESS</Text>
              <Text style={styles.triWeeks}>
                {40 - timeline.current_week > 0 ? `${40 - timeline.current_week} weeks to go` : 'Full term'}
              </Text>
            </View>
            <View style={styles.triBar}>
              <View style={[styles.triSeg, timeline.current_week >= 1 && styles.triSegOn]} />
              <View style={[styles.triSeg, timeline.current_week >= 14 && styles.triSegOn]} />
              <View style={[styles.triSeg, timeline.current_week >= 28 && styles.triSegOn]} />
            </View>
            <View style={styles.triLabels}>
              <Text style={styles.triLabel}>{trimesterOf(6).split(' ')[0]} · wk 1-13</Text>
              <Text style={styles.triLabel}>2nd · wk 14-27</Text>
              <Text style={styles.triLabel}>3rd · wk 28-40</Text>
            </View>
          </View>
        )}

        {/* Entry row — Add My Own opens the custom-event modal (restored 10/07, was orphaned); Book Provider → appointments */}
        <View style={styles.addRow}>
          <TouchableOpacity
            style={styles.addGhostButton}
            onPress={() => setModalVisible(true)}
            data-testid="add-event-btn"
          >
            <Text style={styles.addGhostText}>+ Add My Own</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addGhostButton}
            onPress={() => router.push('/(mom)/appointments')}
            data-testid="schedule-btn"
          >
            <Text style={styles.addGhostText}>+ Book Provider</Text>
          </TouchableOpacity>
        </View>

        {/* Custom Events */}
        {timeline?.custom_events?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your events & appointments</Text>
            {timeline.custom_events.map((event: CustomEvent) => {
              const parts = formatDateParts(event.event_date);
              return (
                <View key={event.event_id} style={styles.eventRowCard}>
                  <View style={styles.eventDateBox}>
                    <Text style={styles.eventMonth}>{parts.month}</Text>
                    <Text style={styles.eventDay}>{parts.day}</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    {event.description ? (
                      <Text style={styles.eventWho} numberOfLines={1}>{event.description}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.etypeChip, event.event_type === 'appointment' ? styles.etypeAppt : styles.etypeClass]}>
                    <Text style={[styles.etypeText, { color: event.event_type === 'appointment' ? C.lavender : C.rose }]}>
                      {event.event_type === 'appointment' ? 'Appt' : 'Class'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteEvent(event.event_id)} style={styles.deleteBtn}>
                    <Icon name="trash" size={16} color={C.chev} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Milestones — horizontal strip */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Pregnancy milestones</Text>
            <GrowthSprig stage={(timeline?.current_week ?? 0) <= 13 ? 'sprout' : (timeline?.current_week ?? 0) <= 27 ? 'leafing' : 'blossom'} size={18} stroke={'#D8A0C4'} fill={'#EBD3E4'} style={{ marginLeft: 8 }} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.milesRow}>
            {timeline?.milestones?.map((milestone: Milestone) => (
              <View
                key={milestone.week}
                style={[
                  styles.mCard,
                  milestone.is_current && styles.mCardCurrent,
                  milestone.is_past && styles.mCardPast,
                ]}
              >
                <Text style={[styles.mCardWk, milestone.is_current && styles.mCardWkCur]}>
                  WK {milestone.week}
                </Text>
                <Text style={styles.mCardTitle} numberOfLines={2}>{milestone.title}</Text>
                <Text style={styles.mCardDate}>{milestone.is_current ? `You're here · ${formatDate(milestone.date)}` : formatDate(milestone.date)}</Text>
              </View>
            ))}
          </ScrollView>
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
                placeholderTextColor={C.grayLight}
                testID="event-title-input"
                data-testid="event-title-input"
              />

              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => {
                  if (showDatePicker) {
                    // 10/07 QA: the row doubles as the close affordance — the
                    // Confirm tap can land in the wheel zone while the settling
                    // layout shifts the button, leaving the picker stuck open;
                    // toggling from the row always works.
                    setShowDatePicker(false);
                    return;
                  }
                  // Drop the title keyboard first — otherwise it covers the inline
                  // picker + Confirm button (10/07 QA finding) and taps land on keys.
                  Keyboard.dismiss();
                  // Initialize the wheel to the chosen date (or today) so it never snaps
                  const initDate = newEvent.event_date ? new Date(`${newEvent.event_date}T12:00:00`) : new Date();
                  setSelectedDate(initDate);
                  // Commit the draft immediately: a wheel picker always holds a
                  // value, so the row never sits in placeholder state while the
                  // picker is open (10/07: empty date made Save a dead no-POST).
                  setNewEvent((prev: any) => ({ ...prev, event_date: formatDateLocal(initDate) }));
                  setShowDatePicker(true);
                }}
                testID="event-date-picker-btn"
                data-testid="event-date-picker-btn"
              >
                <Icon name="calendar" size={20} color={C.lavender} />
                <Text style={[styles.dateButtonText, !newEvent.event_date && styles.dateButtonPlaceholder]}>
                  {newEvent.event_date ? formatDisplayDate(newEvent.event_date) : 'Select appointment date'}
                </Text>
                <Icon name="chevron-down" size={20} color={C.chev} />
              </TouchableOpacity>

              {/* Inline spinner picker — appears in-flow under the date row when
                  open (10/07: nested Modal never presented on iOS; in-flow never
                  has that presentation problem). No double-modal involved. */}
              {showDatePicker && (
                <View style={styles.inlinePickerWrap}>
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="spinner"
                    onChange={(event: any, date?: Date) => {
                      if (date) {
                        setSelectedDate(date);
                        // Commit live so every wheel settle is captured — never
                        // rely on the Confirm tap alone (10/07: it can be
                        // swallowed while the layout settles).
                        setNewEvent((prev: any) => ({ ...prev, event_date: formatDateLocal(date) }));
                      }
                    }}
                    style={{ width: '100%', height: 200 }}
                  />
                  <TouchableOpacity
                    style={styles.confirmDateBtn}
                    onPress={() => {
                      setNewEvent((prev: any) => ({ ...prev, event_date: formatDateLocal(selectedDate) }));
                      setShowDatePicker(false);
                    }}
                    testID="confirm-date-btn"
                    data-testid="confirm-date-btn"
                  >
                    <Text style={styles.confirmDateText}>Confirm Date</Text>
                  </TouchableOpacity>
                </View>
              )}
              {/* 10/07 QA: spacer holds the modal tall while the picker opens/closes so
                  the layout above (date row) never shifts mid-tap; removed when closed */}
              {showDatePicker && <View style={{ height: 8 }} />}

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newEvent.description}
                onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                placeholder="Optional notes..."
                placeholderTextColor={C.grayLight}
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
              <TouchableOpacity style={styles.saveBtn} onPress={addEvent} disabled={saving} testID="save-event-btn" data-testid="save-event-btn">
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 10/07: standalone picker modal removed — picker now renders inline inside
          the Add-Event modal (above); nested-Modal presentation never showed on iOS. */}
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: { flex: 1, backgroundColor: C.cream },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: SIZES.xxl },
  header: { marginBottom: 6 },
  overline: { ...kickerStyle(C.rose), marginBottom: 5 },
  title: { fontFamily: DF.serif, fontWeight: '700', fontSize: 26, lineHeight: 30, color: C.ink },
  titleAccent: { color: C.roseSoft },
  subtitle: { fontSize: 12.5, fontFamily: DF.ui, color: C.gray, marginTop: 4 },

    babyCard: {
    marginTop: SIZES.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: SIZES.md,
  },
  babyKicker: {
    fontSize: 10,
    fontFamily: DF.uiBold,
    letterSpacing: 1.2,
    color: C.lavender,
  },
  babyTitle: {
    fontFamily: DF.serif,
    fontWeight: '700',
    fontSize: 19,
    color: C.ink,
    marginTop: 4,
  },
  babySize: {
    fontSize: 11,
    fontFamily: DF.uiBold,
    color: C.rose,
    marginTop: 3,
  },
  babyDesc: {
    fontSize: 11,
    lineHeight: 18,
    fontFamily: DF.ui,
    color: C.body,
    marginTop: 6,
  },
  triCard: {
    marginTop: SIZES.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: SIZES.md,
  },
  triHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triWeeks: {
    fontSize: 11,
    fontFamily: DF.uiBold,
    color: C.lavender,
  },
  triBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  triSeg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  triSegOn: {
    backgroundColor: C.lavender,
  },
  triLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  triLabel: {
    fontSize: 10,
    fontFamily: DF.ui,
    color: C.grayLight,
  },
  anchorCard: {
    marginTop: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    overflow: 'hidden',
  },
  anchorArt: { width: '100%', height: 150 },
  anchorBody: { paddingVertical: 13, paddingHorizontal: 16, paddingBottom: 15 },
  anchorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  anchorTitle: { fontFamily: DF.serif, fontWeight: '700', fontSize: 21, color: C.ink },
  anchorWeek: { fontSize: 11, fontWeight: '700', fontFamily: DF.uiBold, color: C.lavender },
  anchorDesc: { fontSize: 11, lineHeight: 18, fontFamily: DF.ui, color: C.body, marginTop: 5 },
  nextRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9, gap: 10 },
  nextThumb: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.lavenderBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { flex: 1, fontSize: 11.5, fontWeight: '600', fontFamily: DF.uiSemi, color: C.lavender },
  // 10/07: inline picker styles (in-flow under the date row)
  inlinePickerWrap: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.cardBg,
    padding: 8,
    alignItems: 'center',
  },
  confirmDateBtn: {
    marginTop: 6,
    alignSelf: 'stretch',
    backgroundColor: C.lavender,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  confirmDateText: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: DF.uiSemi,
    color: '#FFFFFF',
  },
  addRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  addGhostButton: {
    flex: 1,
    marginTop: 0,
    borderWidth: 1.4,
    borderColor: C.lavenderSoft,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignItems: 'center',
    backgroundColor: C.cardBg,
  },
  addGhostText: { fontSize: 12.5, fontWeight: '600', fontFamily: DF.uiSemi, color: C.lavender },
  section: { marginTop: 16 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: { fontFamily: DF.serif, fontWeight: '700', fontSize: 21, color: C.ink, marginBottom: 8 },
  eventRowCard: {
    backgroundColor: colors.surface,
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
  eventDateBox: { width: 44, alignItems: 'center' },
  eventMonth: { fontSize: 9.5, letterSpacing: 1.4, fontWeight: '700', fontFamily: DF.uiBold, color: C.rose, textTransform: 'uppercase' },
  eventDay: { fontFamily: DF.serif, fontWeight: '700', fontSize: 22, color: C.ink, lineHeight: 24 },
  eventInfo: { flex: 1, minWidth: 0 },
  eventTitle: { fontFamily: DF.serifSemi, fontWeight: '600', fontSize: 17, color: C.ink },
  eventWho: { fontSize: 11.5, fontFamily: DF.ui, color: C.gray, marginTop: 2 },
  etypeChip: { borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
  etypeAppt: { backgroundColor: C.lavenderBg },
  etypeClass: { backgroundColor: C.gbandMid },
  etypeText: { fontSize: 9.5, letterSpacing: 0.6, fontWeight: '700', fontFamily: DF.uiBold, textTransform: 'uppercase' },
  deleteBtn: { padding: 6 },
  milesRow: { gap: 10, paddingRight: 20 },
  mCard: {
    width: 86,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  mCardPast: { opacity: 0.72 },
  mCardCurrent: { borderColor: C.roseSoft, backgroundColor: C.gbandMid },
  mCardWk: { fontSize: 9.5, letterSpacing: 1.2, fontWeight: '700', fontFamily: DF.uiBold, color: C.lavenderSoft, textTransform: 'uppercase' },
  mCardWkCur: { color: C.rose },
  mCardTitle: { fontFamily: DF.serifSemi, fontWeight: '600', fontSize: 15, color: C.ink, marginTop: 3, lineHeight: 18 },
  mCardDate: { fontSize: 10.5, fontFamily: DF.ui, color: C.gray, marginTop: 3 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(42,42,42,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.lg, paddingBottom: SIZES.xxl, maxHeight: '80%' },
  modalScroll: { maxHeight: 350 },
  modalTitle: { fontFamily: DF.serif, fontWeight: '700', fontSize: 21, color: C.ink, marginBottom: SIZES.lg, textAlign: 'center' },
  inputLabel: { fontSize: 12.5, fontWeight: '600', fontFamily: DF.uiSemi, color: C.gray, marginBottom: SIZES.xs },
  input: { backgroundColor: colors.surface, borderRadius: 14, padding: SIZES.md, fontSize: 13.5, fontFamily: DF.ui, color: C.ink, marginBottom: SIZES.md, borderWidth: 1, borderColor: C.border },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 52,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  dateButtonText: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: DF.ui,
    color: C.ink,
    marginLeft: SIZES.sm,
  },
  dateButtonPlaceholder: {
    color: C.grayLight,
  },
  modalActions: { flexDirection: 'row', gap: SIZES.md },
  cancelBtn: { flex: 1, padding: SIZES.md, borderRadius: 999, backgroundColor: C.track, alignItems: 'center' },
  cancelBtnText: { color: C.gray, fontWeight: '600', fontFamily: DF.uiSemi },
  saveBtn: { flex: 1, padding: SIZES.md, borderRadius: 999, backgroundColor: C.lavender, alignItems: 'center' },
  saveBtnText: { color: C.white, fontWeight: '600', fontFamily: DF.uiSemi },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(42,42,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.lg,
  },
  dateModalContent: {
    backgroundColor: C.cardBg,
    borderRadius: 20,
    padding: SIZES.lg,
    width: '100%',
    maxWidth: 400,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  dateModalTitle: {
    fontSize: 21,
    fontFamily: DF.serif,
    fontWeight: '700',
    color: C.ink,
  },
  webCalendarWrapper: {
    marginVertical: SIZES.md,
  },
}));