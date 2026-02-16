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
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const SELF_CARE_OPTIONS = [
  'Rest when baby sleeps', 'Short walks', 'Warm baths', 'Reading',
  'Meditation', 'Light stretching', 'Journaling', 'Video calls with friends'
];

const WARNING_SIGNS = [
  'Heavy bleeding', 'High fever', 'Severe headache', 'Chest pain',
  'Difficulty breathing', 'Thoughts of self-harm', 'Extreme sadness'
];

export default function PostpartumScreen() {
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
          <View>
            <Text style={styles.title}>Postpartum Plan</Text>
            <Text style={styles.subtitle}>Prepare for your fourth trimester</Text>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditMode(!editMode)}
            data-testid="edit-postpartum-btn"
          >
            <Icon name={editMode ? 'close' : 'create'} size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Support People */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="people" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Support Network</Text>
          </View>
          {editMode ? (
            <TextInput
              style={styles.input}
              value={supportPeople}
              onChangeText={setSupportPeople}
              placeholder="Who will help? (e.g., Partner, Mom, Sister)"
              placeholderTextColor={COLORS.textLight}
            />
          ) : (
            <Text style={styles.fieldValue}>
              {supportPeople || 'Not specified'}
            </Text>
          )}
        </Card>

        {/* Meal Prep */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="restaurant" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Meal Prep Plans</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={mealPrepPlans}
              onChangeText={setMealPrepPlans}
              placeholder="Freezer meals, meal train, delivery services..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{mealPrepPlans || 'Not specified'}</Text>
          )}
        </Card>

        {/* Baby Feeding */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="heart" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Baby Feeding Plan</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={babyFeedingPlan}
              onChangeText={setBabyFeedingPlan}
              placeholder="Breastfeeding, formula, combo feeding plans..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{babyFeedingPlan || 'Not specified'}</Text>
          )}
        </Card>

        {/* Recovery Goals */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="fitness" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Recovery Goals</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={recoveryGoals}
              onChangeText={setRecoveryGoals}
              placeholder="Rest, healing, taking it slow..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{recoveryGoals || 'Not specified'}</Text>
          )}
        </Card>

        {/* Visitor Policy */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="home" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Visitor Policy</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={visitorPolicy}
              onChangeText={setVisitorPolicy}
              placeholder="When can visitors come? Any rules?"
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
            />
          ) : (
            <Text style={styles.fieldValue}>{visitorPolicy || 'Not specified'}</Text>
          )}
        </Card>

        {/* Self Care Activities */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="sunny" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Self-Care Activities</Text>
          </View>
          <View style={styles.chipContainer}>
            {SELF_CARE_OPTIONS.map((activity) => (
              <TouchableOpacity
                key={activity}
                style={[
                  styles.chip,
                  selectedSelfCare.includes(activity) && styles.chipActive,
                  !editMode && styles.chipDisabled
                ]}
                onPress={() => editMode && toggleItem(activity, selectedSelfCare, setSelectedSelfCare)}
                disabled={!editMode}
              >
                <Text style={[
                  styles.chipText,
                  selectedSelfCare.includes(activity) && styles.chipTextActive
                ]}>
                  {activity}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Warning Signs */}
        <Card style={[styles.section, { backgroundColor: COLORS.error + '08' }]}>
          <View style={styles.sectionHeader}>
            <Icon name="warning" size={20} color={COLORS.error} />
            <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Warning Signs to Watch</Text>
          </View>
          <Text style={styles.warningText}>
            Seek medical help immediately if you experience any of these:
          </Text>
          <View style={styles.chipContainer}>
            {WARNING_SIGNS.map((sign) => (
              <TouchableOpacity
                key={sign}
                style={[
                  styles.warningChip,
                  selectedWarningSigns.includes(sign) && styles.warningChipActive,
                  !editMode && styles.chipDisabled
                ]}
                onPress={() => editMode && toggleItem(sign, selectedWarningSigns, setSelectedWarningSigns)}
                disabled={!editMode}
              >
                <Text style={[
                  styles.warningChipText,
                  selectedWarningSigns.includes(sign) && styles.warningChipTextActive
                ]}>
                  {sign}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Emergency Contacts */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="call" size={20} color={COLORS.primary} />
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
                  placeholderTextColor={COLORS.textLight}
                />
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact1.phone}
                  onChangeText={(text) => setEmergencyContact1({ ...emergencyContact1, phone: text })}
                  placeholder="Phone"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.contactRow}>
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact2.name}
                  onChangeText={(text) => setEmergencyContact2({ ...emergencyContact2, name: text })}
                  placeholder="Name (optional)"
                  placeholderTextColor={COLORS.textLight}
                />
                <TextInput
                  style={[styles.input, styles.contactInput]}
                  value={emergencyContact2.phone}
                  onChangeText={(text) => setEmergencyContact2({ ...emergencyContact2, phone: text })}
                  placeholder="Phone"
                  placeholderTextColor={COLORS.textLight}
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
        </Card>

        {/* Additional Notes */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Additional Notes</Text>
          </View>
          {editMode ? (
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any other important information..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.fieldValue}>{notes || 'Not specified'}</Text>
          )}
        </Card>

        {/* Save Button */}
        {editMode && (
          <Button
            title={saving ? 'Saving...' : 'Save Postpartum Plan'}
            onPress={savePlan}
            disabled={saving}
            fullWidth
            style={styles.saveButton}
            data-testid="save-postpartum-btn"
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SIZES.md, paddingBottom: SIZES.xxl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SIZES.lg },
  title: { fontSize: SIZES.fontXxl, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textSecondary },
  editButton: { padding: SIZES.sm, backgroundColor: COLORS.primary + '15', borderRadius: SIZES.radiusMd },
  section: { marginBottom: SIZES.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SIZES.sm, gap: SIZES.sm },
  sectionTitle: { fontSize: SIZES.fontMd, fontWeight: '600', color: COLORS.textPrimary },
  input: { backgroundColor: COLORS.background, borderRadius: SIZES.radiusMd, padding: SIZES.md, fontSize: SIZES.fontMd, color: COLORS.textPrimary, borderWidth: 1, borderColor: COLORS.border },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  fieldValue: { fontSize: SIZES.fontMd, color: COLORS.textSecondary },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SIZES.xs },
  chip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipDisabled: { opacity: 0.7 },
  chipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.white },
  warningText: { fontSize: SIZES.fontSm, color: COLORS.error, marginBottom: SIZES.sm },
  warningChip: { paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm, borderRadius: SIZES.radiusFull, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.error + '50' },
  warningChipActive: { backgroundColor: COLORS.error, borderColor: COLORS.error },
  warningChipText: { fontSize: SIZES.fontSm, color: COLORS.error },
  warningChipTextActive: { color: COLORS.white },
  contactRow: { flexDirection: 'row', gap: SIZES.sm, marginBottom: SIZES.sm },
  contactInput: { flex: 1 },
  saveButton: { marginTop: SIZES.lg },
});
