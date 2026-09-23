import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { C, F, kickerStyle } from '../../src/constants/designRefresh';

const DF = F;

const SELF_CARE_OPTIONS = [
  'Rest when baby sleeps', 'Short walks', 'Warm baths', 'Reading',
  'Meditation', 'Light stretching', 'Journaling', 'Video calls with friends'
];

const WARNING_SIGNS = [
  'Heavy bleeding', 'High fever', 'Severe headache', 'Chest pain',
  'Difficulty breathing', 'Thoughts of self-harm', 'Extreme sadness'
];

export default function PostpartumScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const [plan, setPlan] = useState<any>({});
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form fields
  const [supportPeople, setSupportPeople] = useState('');
  const [mealPrepPlans, setMealPrepPlans] = useState('');
  const [recoveryGoals, setRecoveryGoals] = useState('');
  const [mentalHealthResources, setMentalHealthResources] = useState('');
  const [babyFeedingPlan, setBabyFeedingPlan] = useState('');
  const [visitorPolicy, setVisitorPolicy] = useState('');
  const [selectedSelfCare, setSelectedSelfCare] = useState<string[]>([]);
  const [selectedWarningSigns, setSelectedWarningSigns] = useState<string[]>([]);
  const [emergencyContact1, setEmergencyContact1] = useState({ name: '', phone: '' });
  const [emergencyContact2, setEmergencyContact2] = useState({ name: '', phone: '' });
  const [notes, setNotes] = useState('');

  const fetchPlan = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.POSTPARTUM_PLAN);
      setPlan(data);
      // Populate form fields
      setSupportPeople((data.support_people || []).join(', '));
      setMealPrepPlans(data.meal_prep_plans || '');
      setRecoveryGoals(data.recovery_goals || '');
      setMentalHealthResources(data.mental_health_resources || '');
      setBabyFeedingPlan(data.baby_feeding_plan || '');
      setVisitorPolicy(data.visitor_policy || '');
      setSelectedSelfCare(data.self_care_activities || []);
      setSelectedWarningSigns(data.warning_signs_to_watch || []);
      setNotes(data.notes || '');

      const contacts = data.emergency_contacts || [];
      if (contacts[0]) setEmergencyContact1(contacts[0]);
      if (contacts[1]) setEmergencyContact2(contacts[1]);
    } catch (error) {
      console.error('Error fetching postpartum plan:', error);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPlan();
    setRefreshing(false);
  };

  const savePlan = async () => {
    setSaving(true);
    try {
      const emergencyContacts = [];
      if (emergencyContact1.name && emergencyContact1.phone) {
        emergencyContacts.push(emergencyContact1);
      }
      if (emergencyContact2.name && emergencyContact2.phone) {
        emergencyContacts.push(emergencyContact2);
      }

      await apiRequest(API_ENDPOINTS.POSTPARTUM_PLAN, {
        method: 'PUT',
        body: {
          support_people: supportPeople.split(',').map(s => s.trim()).filter(s => s),
          meal_prep_plans: mealPrepPlans,
          recovery_goals: recoveryGoals,
          mental_health_resources: mentalHealthResources,
          baby_feeding_plan: babyFeedingPlan,
          visitor_policy: visitorPolicy,
          self_care_activities: selectedSelfCare,
          warning_signs_to_watch: selectedWarningSigns,
          emergency_contacts: emergencyContacts,
          notes,
        },
      });
      setEditMode(false);
      Alert.alert('Success', 'Postpartum plan saved!');
      await fetchPlan();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (item: string, selected: string[], setSelected: (items: string[]) => void) => {
    if (selected.includes(item)) {
      setSelected(selected.filter(s => s !== item));
    } else {
      setSelected([...selected, item]);
    }
  };

  const hasContent = plan.support_people?.length > 0 || plan.meal_prep_plans || plan.recovery_goals;
  void hasContent;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.lavender} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header — overline + serif title + subtitle, edit pill below (batch-1 anatomy) */}
        <View style={styles.header}>
          <Text style={styles.overline}>Fourth Trimester</Text>
          <Text style={styles.title}>
            Postpartum <Text style={styles.titleAccent}>Plan</Text>
          </Text>
          <Text style={styles.subtitle}>Prepare for your fourth trimester</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(!editMode)}
            testID="edit-postpartum-btn"
            accessibilityRole="button"
            accessibilityLabel={editMode ? 'Done editing' : 'Edit postpartum plan'}
          >
            <Icon name={editMode ? 'close' : 'create'} size={14} color={C.lavender} />
            <Text style={styles.editButtonText}>{editMode ? 'Done' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Support People */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="people" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Support Network</Text>
          </View>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={supportPeople}
              onChangeText={setSupportPeople}
              placeholder="Who will help? (e.g., Partner, Mom, Sister)"
              placeholderTextColor={C.grayLight}
            />
          ) : (
            <Text style={styles.fieldValue}>
              {supportPeople || 'Not specified'}
            </Text>
          )}
        </View>

        {/* Meal Prep */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="restaurant" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Meal Prep Plans</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={mealPrepPlans}
              onChangeText={setMealPrepPlans}
              placeholder="Freezer meals, meal train, delivery services..."
              placeholderTextColor={C.grayLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{mealPrepPlans || 'Not specified'}</Text>
          )}
        </View>

        {/* Baby Feeding */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="heart" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Baby Feeding Plan</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={babyFeedingPlan}
              onChangeText={setBabyFeedingPlan}
              placeholder="Breastfeeding, formula, combo feeding plans..."
              placeholderTextColor={C.grayLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{babyFeedingPlan || 'Not specified'}</Text>
          )}
        </View>

        {/* Recovery Goals */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="fitness" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Recovery Goals</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={recoveryGoals}
              onChangeText={setRecoveryGoals}
              placeholder="Rest, healing, taking it slow..."
              placeholderTextColor={C.grayLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{recoveryGoals || 'Not specified'}</Text>
          )}
        </View>

        {/* Visitor Policy */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="home" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Visitor Policy</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={visitorPolicy}
              onChangeText={setVisitorPolicy}
              placeholder="When can visitors come? Any rules?"
              placeholderTextColor={C.grayLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{visitorPolicy || 'Not specified'}</Text>
          )}
        </View>

        {/* Self Care Activities */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="sunny" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Self-Care Activities</Text>
          </View>
          <View style={styles.chipContainer}>
            {SELF_CARE_OPTIONS.map((activity) => {
              const on = selectedSelfCare.includes(activity);
              return (
                <TouchableOpacity
                  key={activity}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff, !editMode && styles.chipDisabled]}
                  onPress={() => editMode && toggleItem(activity, selectedSelfCare, setSelectedSelfCare)}
                  disabled={!editMode}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{activity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Warning Signs — rose is the approved warn accent (s7 .warn) */}
        <View style={[styles.section, styles.sectionWarn]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sico, styles.sicoWarn]}>
              <Icon name="warning" size={17} color={C.rose} />
            </View>
            <Text style={[styles.sectionTitle, { color: C.rose }]}>Warning Signs to Watch</Text>
          </View>
          <Text style={styles.warningText}>
            Seek medical help immediately if you experience any of these:
          </Text>
          <View style={styles.chipContainer}>
            {WARNING_SIGNS.map((sign) => {
              const on = selectedWarningSigns.includes(sign);
              return (
                <TouchableOpacity
                  key={sign}
                  style={[styles.chip, on ? styles.warnChipOn : styles.chipOff, !editMode && styles.chipDisabled]}
                  onPress={() => editMode && toggleItem(sign, selectedWarningSigns, setSelectedWarningSigns)}
                  disabled={!editMode}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.chipText, on && styles.warnChipTextOn]}>{sign}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="call" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          </View>
          {editMode ? (
            <>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact1.name}
                  onChangeText={(text) => setEmergencyContact1({ ...emergencyContact1, name: text })}
                  placeholder="Name"
                  placeholderTextColor={C.grayLight}
                />
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact1.phone}
                  onChangeText={(text) => setEmergencyContact1({ ...emergencyContact1, phone: text })}
                  placeholder="Phone"
                  placeholderTextColor={C.grayLight}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact2.name}
                  onChangeText={(text) => setEmergencyContact2({ ...emergencyContact2, name: text })}
                  placeholder="Name (optional)"
                  placeholderTextColor={C.grayLight}
                />
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact2.phone}
                  onChangeText={(text) => setEmergencyContact2({ ...emergencyContact2, phone: text })}
                  placeholder="Phone"
                  placeholderTextColor={C.grayLight}
                  keyboardType="phone-pad"
                />
              </View>
            </>
          ) : (
            <View>
              {emergencyContact1.name && (
                <Text style={styles.fieldValue}>{emergencyContact1.name}: {emergencyContact1.phone}</Text>
              )}
              {emergencyContact2.name && (
                <Text style={styles.fieldValue}>{emergencyContact2.name}: {emergencyContact2.phone}</Text>
              )}
              {!emergencyContact1.name && !emergencyContact2.name && (
                <Text style={styles.fieldValue}>Not specified</Text>
              )}
            </View>
          )}
        </View>

        {/* Additional Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sico}>
              <Icon name="document-text" size={17} color={C.lavender} />
            </View>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other important information..."
              placeholderTextColor={C.grayLight}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.fieldValue}>{notes || 'Not specified'}</Text>
          )}
        </View>

        {/* Save Button — abtn: lavender pill */}
        {editMode && (
          <TouchableOpacity
            style={styles.saveButton}
            onPress={savePlan}
            disabled={saving}
            testID="save-postpartum-btn"
            accessibilityRole="button"
            accessibilityLabel="Save postpartum plan"
          >
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Postpartum Plan'}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles(() =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.cream },
    scrollContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: SIZES.xxl },
    header: {
      marginBottom: 18,
    },
    overline: { ...kickerStyle(C.rose), marginBottom: 5 },
    title: {
      fontSize: 26,
      lineHeight: 30,
      fontFamily: DF.serif,
      fontWeight: '700',
      color: C.ink,
    },
    titleAccent: { color: C.roseSoft, fontStyle: 'italic' },
    subtitle: { fontSize: 12.5, fontFamily: DF.ui, color: C.gray, marginTop: 4 },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderWidth: 1.4,
      borderColor: C.lavenderBorder,
      backgroundColor: C.cardBg,
      borderRadius: 999,
      paddingVertical: 9,
      paddingHorizontal: 16,
      marginTop: 10,
      alignSelf: 'flex-start',
    },
    editButtonText: {
      fontSize: 11.5,
      fontWeight: '700',
      fontFamily: DF.uiBold,
      color: C.lavender,
    },
    // fieldbox section: white r18 hairline card
    section: {
      backgroundColor: C.white,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      padding: 14,
      marginBottom: 10,
    },
    sectionWarn: {
      backgroundColor: C.gbandMid,
      borderColor: C.roseSoft,
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, gap: 10 },
    sico: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.lavenderBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sicoWarn: { backgroundColor: C.roseBg },
    sectionTitle: {
      fontSize: 17,
      fontFamily: DF.serifSemi,
      fontWeight: '600',
      color: C.ink,
      flex: 1,
    },
    input: {
      backgroundColor: C.cardBg,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 11,
      fontSize: 13,
      fontFamily: DF.ui,
      color: C.ink,
      borderWidth: 1,
      borderColor: C.border,
    },
    textArea: { minHeight: 80, textAlignVertical: 'top' },
    fieldValue: { fontSize: 13, fontFamily: DF.ui, color: C.body, lineHeight: 19 },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    chipOff: { backgroundColor: C.cardBg },
    chipOn: {
      backgroundColor: C.halo,
      borderWidth: 1,
      borderColor: C.lavenderSoft,
    },
    chipDisabled: { opacity: 0.72 },
    chipText: { fontSize: 11, fontFamily: DF.uiSemi, fontWeight: '600', color: C.grayLight },
    chipTextOn: { color: C.lavender, fontFamily: DF.uiBold, fontWeight: '700' },
    warnChipOn: {
      backgroundColor: C.roseBg,
      borderWidth: 1,
      borderColor: C.roseSoft,
    },
    warnChipTextOn: { color: C.rose, fontFamily: DF.uiBold, fontWeight: '700' },
    warningText: {
      fontSize: 11,
      fontFamily: DF.uiSemi,
      fontWeight: '600',
      color: C.rose,
      marginBottom: 9,
      lineHeight: 15,
    },
    contactRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    contactInput: { flex: 1 },
    saveButton: {
      marginTop: 14,
      backgroundColor: C.lavender,
      borderRadius: 999,
      paddingVertical: 13,
      paddingHorizontal: 18,
      alignItems: 'center',
    },
    saveButtonText: {
      color: C.white,
      fontSize: 13,
      fontWeight: '600',
      fontFamily: DF.uiSemi,
    },
  }));