// NewbornExamSection.tsx - Comprehensive Newborn Physical Exam for Midwives
// Features: Collapsible sections, toggles, and detailed system-by-system examination

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../Icon';
import Card from '../Card';
import Button from '../Button';
import { apiRequest } from '../../utils/api';
import { SIZES, FONTS } from '../../constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../hooks/useThemedStyles';

// ============== TYPES ==============
interface SystemExam {
  status: string; // 'normal' | 'abnormal' | 'not_assessed'
  notes?: string;
}

interface NewbornExam {
  exam_id?: string;
  client_id: string;
  provider_id?: string;
  
  // Header & Basics
  baby_name?: string;
  parent_names?: string;
  date_of_birth?: string;
  exam_datetime?: string;
  baby_age_hours?: number;
  place_of_birth?: string;
  exam_location?: string;
  examiner_name?: string;
  examiner_credentials?: string;
  
  // Birth and Risk Summary
  gestational_age_weeks?: number;
  gestational_age_days?: number;
  type_of_birth?: string;
  risk_flags?: string[];
  risk_flags_notes?: string;
  
  // Vital Signs
  temperature?: number;
  temperature_unit?: string;
  heart_rate?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  perfusion_status?: string;
  perfusion_notes?: string;
  
  // Measurements & Growth
  current_weight?: number;
  current_weight_unit?: string;
  birth_weight?: number;
  birth_weight_unit?: string;
  length?: number;
  length_unit?: string;
  head_circumference?: number;
  head_circumference_unit?: string;
  growth_plotted?: boolean;
  growth_notes?: string;
  
  // General Appearance
  color?: string;
  color_notes?: string;
  tone?: string;
  tone_notes?: string;
  activity_alertness?: string;
  activity_notes?: string;
  breathing_effort?: string;
  breathing_notes?: string;
  
  // System-by-System Exams
  exam_skin?: SystemExam;
  exam_head_face?: SystemExam;
  exam_eyes?: SystemExam;
  exam_ears?: SystemExam;
  exam_nose_mouth?: SystemExam;
  exam_neck_clavicles?: SystemExam;
  exam_chest_lungs?: SystemExam;
  exam_heart?: SystemExam;
  exam_abdomen_umbilicus?: SystemExam;
  exam_genitourinary_anus?: SystemExam;
  exam_hips_limbs?: SystemExam;
  exam_back_spine?: SystemExam;
  exam_neurologic_reflexes?: SystemExam;
  
  // Feeding, Elimination, Behavior
  feeding_method?: string;
  feeding_quality?: string;
  feeding_notes?: string;
  voids_24h?: string;
  stools_24h?: string;
  parent_concerns?: string;
  
  // Assessment, Education, Plan
  overall_assessment?: string;
  red_flag_findings?: string;
  parent_questions?: string;
  education_given?: string[];
  education_notes?: string;
  plan_notes?: string;
  next_visit_datetime?: string;
  
  // Meta
  is_draft?: boolean;
  created_at?: string;
  updated_at?: string;
}

interface NewbornExamSectionProps {
  clientId: string;
  primaryColor: string;
  onRefresh?: () => void;
}

// ============== CONSTANTS ==============
const PLACE_OF_BIRTH_OPTIONS = [
  { value: 'home', label: 'Home' },
  { value: 'birth_center', label: 'Birth Center' },
  { value: 'hospital', label: 'Hospital' },
  { value: 'other', label: 'Other' },
];

const TYPE_OF_BIRTH_OPTIONS = [
  { value: 'spontaneous_vaginal', label: 'Spontaneous Vaginal' },
  { value: 'vbac', label: 'VBAC' },
  { value: 'assisted', label: 'Assisted' },
  { value: 'cesarean', label: 'Cesarean' },
  { value: 'other', label: 'Other' },
];

const RISK_FLAGS = [
  { value: 'gbs_positive', label: 'GBS+' },
  { value: 'prom_18h', label: 'PROM >18h' },
  { value: 'maternal_fever', label: 'Mat. Fever' },
  { value: 'meconium', label: 'Meconium' },
  { value: 'preterm', label: 'Preterm' },
  { value: 'growth_restriction', label: 'Growth Restriction' },
  { value: 'large_baby', label: 'Large Baby' },
  { value: 'other', label: 'Other' },
];

const PERFUSION_OPTIONS = [
  { value: 'normal', label: 'Normal (<3s)' },
  { value: 'delayed', label: 'Delayed (>3s)' },
];

const COLOR_OPTIONS = [
  { value: 'normal_pink', label: 'Normal Pink' },
  { value: 'acrocyanosis', label: 'Acrocyanosis' },
  { value: 'jaundice', label: 'Jaundice' },
  { value: 'pale', label: 'Pale' },
  { value: 'other', label: 'Other' },
];

const TONE_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'low', label: 'Low' },
  { value: 'high', label: 'High' },
];

const ACTIVITY_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'sleepy', label: 'Sleepy' },
  { value: 'irritable', label: 'Irritable' },
  { value: 'lethargic', label: 'Lethargic' },
];

const BREATHING_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'mild_work', label: 'Mild Work' },
  { value: 'distress', label: 'Distress' },
];

const getExamStatusOptions = (colors: ThemeColors) => [
  { value: 'normal', label: 'Normal', color: colors.success },
  { value: 'abnormal', label: 'Abnormal', color: colors.error },
  { value: 'not_assessed', label: 'N/A', color: colors.textLight },
];

const SYSTEM_EXAMS = [
  { key: 'exam_skin', label: 'Skin', icon: 'body-outline' },
  { key: 'exam_head_face', label: 'Head & Face', icon: 'happy-outline' },
  { key: 'exam_eyes', label: 'Eyes', icon: 'eye-outline' },
  { key: 'exam_ears', label: 'Ears', icon: 'ear-outline' },
  { key: 'exam_nose_mouth', label: 'Nose & Mouth', icon: 'nutrition-outline' },
  { key: 'exam_neck_clavicles', label: 'Neck & Clavicles', icon: 'fitness-outline' },
  { key: 'exam_chest_lungs', label: 'Chest & Lungs', icon: 'pulse-outline' },
  { key: 'exam_heart', label: 'Heart', icon: 'heart-outline' },
  { key: 'exam_abdomen_umbilicus', label: 'Abdomen & Umbilicus', icon: 'radio-button-on-outline' },
  { key: 'exam_genitourinary_anus', label: 'Genitourinary & Anus', icon: 'body-outline' },
  { key: 'exam_hips_limbs', label: 'Hips & Limbs', icon: 'walk-outline' },
  { key: 'exam_back_spine', label: 'Back & Spine', icon: 'barbell-outline' },
  { key: 'exam_neurologic_reflexes', label: 'Neurologic & Reflexes', icon: 'flash-outline' },
];

const FEEDING_METHOD_OPTIONS = [
  { value: 'breast', label: 'Breast' },
  { value: 'formula', label: 'Formula' },
  { value: 'combo', label: 'Combo' },
  { value: 'other', label: 'Other' },
];

const FEEDING_QUALITY_OPTIONS = [
  { value: 'effective', label: 'Effective' },
  { value: 'some_difficulty', label: 'Some Difficulty' },
  { value: 'major_concerns', label: 'Major Concerns' },
];

const getAssessmentOptions = (colors: ThemeColors) => [
  { value: 'healthy', label: 'Healthy Newborn', color: colors.success },
  { value: 'routine_followup', label: 'Routine Follow-up Needed', color: colors.warning },
  { value: 'urgent_followup', label: 'Urgent Follow-up Needed', color: colors.error },
  { value: 'emergency_transfer', label: 'Emergency Transfer', color: colors.error },
];

const EDUCATION_OPTIONS = [
  { value: 'normal_appearance', label: 'Normal Newborn Appearance' },
  { value: 'feeding_basics', label: 'Feeding Basics' },
  { value: 'cord_care', label: 'Cord Care' },
  { value: 'safe_sleep', label: 'Safe Sleep' },
  { value: 'when_to_call', label: 'When to Call' },
  { value: 'routine_followup', label: 'Routine Follow-up' },
  { value: 'other', label: 'Other' },
];

// ============== MAIN COMPONENT ==============
export default function NewbornExamSection({ clientId, primaryColor, onRefresh }: NewbornExamSectionProps) {
  const colors = useColors();
  const styles = getStyles(colors);
  
  // Get color-dependent options
  const EXAM_STATUS_OPTIONS = getExamStatusOptions(colors);
  const ASSESSMENT_OPTIONS = getAssessmentOptions(colors);
  
  // State
  const [exams, setExams] = useState<NewbornExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExam, setEditingExam] = useState<NewbornExam | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    header: true,
    birth_risk: false,
    vitals: false,
    measurements: false,
    appearance: false,
    systems: false,
    feeding: false,
    assessment: false,
  });
  
  // Form state
  const [formData, setFormData] = useState<Partial<NewbornExam>>({});
  const [systemExams, setSystemExams] = useState<Record<string, SystemExam>>({});

  // ============== DATA FETCHING ==============
  const fetchExams = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const data = await apiRequest(`/newborn-exam/client/${clientId}`);
      setExams(data || []);
    } catch (error: any) {
      console.error('Error fetching newborn exams:', error);
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  // ============== HELPERS ==============
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const resetForm = () => {
    setFormData({});
    setSystemExams({
      exam_skin: { status: 'normal', notes: '' },
      exam_head_face: { status: 'normal', notes: '' },
      exam_eyes: { status: 'normal', notes: '' },
      exam_ears: { status: 'normal', notes: '' },
      exam_nose_mouth: { status: 'normal', notes: '' },
      exam_neck_clavicles: { status: 'normal', notes: '' },
      exam_chest_lungs: { status: 'normal', notes: '' },
      exam_heart: { status: 'normal', notes: '' },
      exam_abdomen_umbilicus: { status: 'normal', notes: '' },
      exam_genitourinary_anus: { status: 'normal', notes: '' },
      exam_hips_limbs: { status: 'normal', notes: '' },
      exam_back_spine: { status: 'normal', notes: '' },
      exam_neurologic_reflexes: { status: 'normal', notes: '' },
    });
    setEditingExam(null);
  };

  const populateForm = (exam: NewbornExam) => {
    setFormData({
      baby_name: exam.baby_name,
      parent_names: exam.parent_names,
      date_of_birth: exam.date_of_birth,
      exam_datetime: exam.exam_datetime,
      baby_age_hours: exam.baby_age_hours,
      place_of_birth: exam.place_of_birth,
      exam_location: exam.exam_location,
      examiner_name: exam.examiner_name,
      examiner_credentials: exam.examiner_credentials,
      gestational_age_weeks: exam.gestational_age_weeks,
      gestational_age_days: exam.gestational_age_days,
      type_of_birth: exam.type_of_birth,
      risk_flags: exam.risk_flags || [],
      risk_flags_notes: exam.risk_flags_notes,
      temperature: exam.temperature,
      temperature_unit: exam.temperature_unit || 'F',
      heart_rate: exam.heart_rate,
      respiratory_rate: exam.respiratory_rate,
      oxygen_saturation: exam.oxygen_saturation,
      perfusion_status: exam.perfusion_status,
      perfusion_notes: exam.perfusion_notes,
      current_weight: exam.current_weight,
      current_weight_unit: exam.current_weight_unit || 'lbs',
      birth_weight: exam.birth_weight,
      birth_weight_unit: exam.birth_weight_unit || 'lbs',
      length: exam.length,
      length_unit: exam.length_unit || 'in',
      head_circumference: exam.head_circumference,
      head_circumference_unit: exam.head_circumference_unit || 'in',
      growth_plotted: exam.growth_plotted,
      growth_notes: exam.growth_notes,
      color: exam.color,
      color_notes: exam.color_notes,
      tone: exam.tone,
      tone_notes: exam.tone_notes,
      activity_alertness: exam.activity_alertness,
      activity_notes: exam.activity_notes,
      breathing_effort: exam.breathing_effort,
      breathing_notes: exam.breathing_notes,
      feeding_method: exam.feeding_method,
      feeding_quality: exam.feeding_quality,
      feeding_notes: exam.feeding_notes,
      voids_24h: exam.voids_24h,
      stools_24h: exam.stools_24h,
      parent_concerns: exam.parent_concerns,
      overall_assessment: exam.overall_assessment,
      red_flag_findings: exam.red_flag_findings,
      parent_questions: exam.parent_questions,
      education_given: exam.education_given || [],
      education_notes: exam.education_notes,
      plan_notes: exam.plan_notes,
      next_visit_datetime: exam.next_visit_datetime,
      is_draft: exam.is_draft,
    });
    
    // Populate system exams
    const systemData: Record<string, SystemExam> = {};
    SYSTEM_EXAMS.forEach(({ key }) => {
      systemData[key] = (exam as any)[key] || { status: 'normal', notes: '' };
    });
    setSystemExams(systemData);
  };

  const openCreateModal = () => {
    resetForm();
    setExpandedSections({
      header: true,
      birth_risk: false,
      vitals: false,
      measurements: false,
      appearance: false,
      systems: false,
      feeding: false,
      assessment: false,
    });
    setShowModal(true);
  };

  const openEditModal = (exam: NewbornExam) => {
    setEditingExam(exam);
    populateForm(exam);
    setShowModal(true);
  };

  const handleSave = async (asDraft: boolean = true) => {
    setSaving(true);
    try {
      const data: any = {
        client_id: clientId,
        ...formData,
        ...systemExams,
        is_draft: asDraft,
      };

      // Remove undefined values
      Object.keys(data).forEach(key => {
        if (data[key] === undefined || data[key] === '') {
          delete data[key];
        }
      });

      if (editingExam?.exam_id) {
        // Update
        await apiRequest(`/newborn-exam/${editingExam.exam_id}`, {
          method: 'PUT',
          body: data,
        });
      } else {
        // Create
        await apiRequest('/newborn-exam', {
          method: 'POST',
          body: data,
        });
      }

      if (Platform.OS === 'web') {
        window.alert(asDraft ? 'Draft saved' : 'Exam saved and finalized');
      } else {
        Alert.alert('Success', asDraft ? 'Draft saved' : 'Exam saved and finalized');
      }
      
      setShowModal(false);
      resetForm();
      fetchExams();
      onRefresh?.();
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert(`Error: ${error.message || 'Failed to save exam'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to save exam');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (examId: string) => {
    const confirmDelete = () => {
      apiRequest(`/newborn-exam/${examId}`, { method: 'DELETE' })
        .then(() => {
          fetchExams();
          onRefresh?.();
        })
        .catch((error: any) => {
          if (Platform.OS === 'web') {
            window.alert(`Error: ${error.message || 'Failed to delete'}`);
          } else {
            Alert.alert('Error', error.message || 'Failed to delete');
          }
        });
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Delete this newborn exam?')) {
        confirmDelete();
      }
    } else {
      Alert.alert('Delete Exam', 'Are you sure you want to delete this exam?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const getLabel = (options: { value: string; label: string }[], value?: string) => {
    return options.find(o => o.value === value)?.label || value || '';
  };

  // ============== RENDER HELPERS ==============
  const renderCollapsibleSection = (
    title: string,
    sectionKey: string,
    icon: string,
    children: React.ReactNode
  ) => (
    <View style={styles.collapsibleSection}>
      <TouchableOpacity
        style={styles.collapsibleHeader}
        onPress={() => toggleSection(sectionKey)}
        data-testid={`section-${sectionKey}`}
      >
        <View style={styles.collapsibleTitleRow}>
          <Icon name={icon as any} size={20} color={primaryColor} />
          <Text style={styles.collapsibleTitle}>{title}</Text>
        </View>
        <Icon
          name={expandedSections[sectionKey] ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
      {expandedSections[sectionKey] && (
        <View style={styles.collapsibleContent}>{children}</View>
      )}
    </View>
  );

  const renderOptionButtons = (
    options: { value: string; label: string; color?: string }[],
    selectedValue: string | undefined,
    onSelect: (val: string) => void,
    small: boolean = false
  ) => (
    <View style={[styles.optionsRow, small && styles.optionsRowSmall]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[
            styles.optionButton,
            small && styles.optionButtonSmall,
            selectedValue === opt.value && [
              styles.optionButtonSelected,
              { backgroundColor: opt.color || primaryColor, borderColor: opt.color || primaryColor },
            ],
          ]}
          onPress={() => onSelect(selectedValue === opt.value ? '' : opt.value)}
        >
          <Text
            style={[
              styles.optionButtonText,
              small && styles.optionButtonTextSmall,
              selectedValue === opt.value && styles.optionButtonTextSelected,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderMultiSelect = (
    options: { value: string; label: string }[],
    selectedValues: string[],
    onToggle: (val: string) => void
  ) => (
    <View style={styles.optionsRow}>
      {options.map((opt) => {
        const isSelected = selectedValues.includes(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.optionButton,
              styles.optionButtonSmall,
              isSelected && [
                styles.optionButtonSelected,
                { backgroundColor: primaryColor, borderColor: primaryColor },
              ],
            ]}
            onPress={() => onToggle(opt.value)}
          >
            <Text
              style={[
                styles.optionButtonText,
                styles.optionButtonTextSmall,
                isSelected && styles.optionButtonTextSelected,
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderSystemExamRow = (systemKey: string, label: string, icon: string) => {
    const exam = systemExams[systemKey] || { status: 'normal', notes: '' };
    return (
      <View key={systemKey} style={styles.systemExamRow}>
        <View style={styles.systemExamHeader}>
          <View style={styles.systemExamLabel}>
            <Icon name={icon as any} size={16} color={colors.textSecondary} />
            <Text style={styles.systemExamLabelText}>{label}</Text>
          </View>
          <View style={styles.systemExamStatusButtons}>
            {EXAM_STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.statusButton,
                  exam.status === opt.value && { backgroundColor: opt.color, borderColor: opt.color },
                ]}
                onPress={() =>
                  setSystemExams(prev => ({
                    ...prev,
                    [systemKey]: { ...prev[systemKey], status: opt.value },
                  }))
                }
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    exam.status === opt.value && styles.statusButtonTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        {exam.status === 'abnormal' && (
          <TextInput
            style={[styles.input, styles.inputSmall]}
            placeholder="Describe findings..."
            placeholderTextColor={colors.textLight}
            value={exam.notes || ''}
            onChangeText={(text) =>
              setSystemExams(prev => ({
                ...prev,
                [systemKey]: { ...prev[systemKey], notes: text },
              }))
            }
          />
        )}
      </View>
    );
  };

  // ============== SUMMARY CARD ==============
  const renderExamCard = (exam: NewbornExam) => (
    <Card key={exam.exam_id} style={styles.examCard} data-testid={`exam-${exam.exam_id}`}>
      <View style={styles.examCardHeader}>
        <View style={styles.examCardInfo}>
          <View style={styles.examCardTitleRow}>
            <Icon name="person" size={18} color={primaryColor} />
            <Text style={styles.examCardName}>{exam.baby_name || 'Baby'}</Text>
          </View>
          <Text style={styles.examCardDate}>{formatDateTime(exam.exam_datetime)}</Text>
        </View>
        <View style={styles.examCardActions}>
          {exam.is_draft && (
            <View style={[styles.draftBadge, { backgroundColor: colors.warning + '20' }]}>
              <Text style={[styles.draftBadgeText, { color: colors.warning }]}>Draft</Text>
            </View>
          )}
          {exam.overall_assessment && (
            <View
              style={[
                styles.assessmentBadge,
                {
                  backgroundColor:
                    (ASSESSMENT_OPTIONS.find(o => o.value === exam.overall_assessment)?.color ||
                      colors.textLight) + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.assessmentBadgeText,
                  {
                    color:
                      ASSESSMENT_OPTIONS.find(o => o.value === exam.overall_assessment)?.color ||
                      colors.textLight,
                  },
                ]}
              >
                {getLabel(ASSESSMENT_OPTIONS, exam.overall_assessment)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.examCardDetails}>
        {exam.current_weight && (
          <View style={styles.examCardDetail}>
            <Icon name="scale-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.examCardDetailText}>
              {exam.current_weight} {exam.current_weight_unit || 'lbs'}
            </Text>
          </View>
        )}
        {exam.temperature && (
          <View style={styles.examCardDetail}>
            <Icon name="thermometer-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.examCardDetailText}>
              {exam.temperature}°{exam.temperature_unit || 'F'}
            </Text>
          </View>
        )}
        {exam.heart_rate && (
          <View style={styles.examCardDetail}>
            <Icon name="heart-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.examCardDetailText}>{exam.heart_rate} bpm</Text>
          </View>
        )}
      </View>

      <View style={styles.examCardFooter}>
        <TouchableOpacity
          style={[styles.examActionButton, { borderColor: primaryColor }]}
          onPress={() => openEditModal(exam)}
        >
          <Icon name="create-outline" size={16} color={primaryColor} />
          <Text style={[styles.examActionButtonText, { color: primaryColor }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.examActionButton, { borderColor: colors.error }]}
          onPress={() => handleDelete(exam.exam_id!)}
        >
          <Icon name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.examActionButtonText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  // ============== MAIN RENDER ==============
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon name="clipboard-outline" size={22} color={primaryColor} />
          <Text style={styles.sectionTitle}>Newborn Exams</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: primaryColor }]}
          onPress={openCreateModal}
          data-testid="add-newborn-exam-btn"
        >
          <Icon name="add" size={18} color={colors.white} />
          <Text style={styles.addButtonText}>New Exam</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={primaryColor} style={{ marginVertical: 20 }} />
      ) : exams.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Icon name="clipboard-outline" size={48} color={colors.textLight} />
          <Text style={styles.emptyTitle}>No Newborn Exams</Text>
          <Text style={styles.emptyText}>
            Add a comprehensive newborn physical exam for this client's baby.
          </Text>
          <Button
            title="Start Newborn Exam"
            onPress={openCreateModal}
            style={{ marginTop: SIZES.md }}
          />
        </Card>
      ) : (
        <View style={styles.examsList}>{exams.map(renderExamCard)}</View>
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingExam ? 'Edit Newborn Exam' : 'New Newborn Exam'}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* SECTION 1: Header & Basics */}
            {renderCollapsibleSection('Header & Basics', 'header', 'person-outline', (
              <View>
                <Text style={styles.fieldLabel}>Baby's Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter baby's name"
                  placeholderTextColor={colors.textLight}
                  value={formData.baby_name || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, baby_name: text }))}
                />

                <Text style={styles.fieldLabel}>Parent Names</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Parent(s) name(s)"
                  placeholderTextColor={colors.textLight}
                  value={formData.parent_names || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, parent_names: text }))}
                />

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.fieldLabel}>Date of Birth</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textLight}
                      value={formData.date_of_birth || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, date_of_birth: text }))}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.fieldLabel}>Age at Exam (hours)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 24"
                      placeholderTextColor={colors.textLight}
                      value={formData.baby_age_hours?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, baby_age_hours: text ? parseFloat(text) : undefined }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Place of Birth</Text>
                {renderOptionButtons(PLACE_OF_BIRTH_OPTIONS, formData.place_of_birth, (val) => setFormData(prev => ({ ...prev, place_of_birth: val })))}

                <Text style={styles.fieldLabel}>Exam Location</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Where is this exam taking place?"
                  placeholderTextColor={colors.textLight}
                  value={formData.exam_location || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, exam_location: text }))}
                />

                <Text style={styles.fieldLabel}>Examiner Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your name"
                  placeholderTextColor={colors.textLight}
                  value={formData.examiner_name || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, examiner_name: text }))}
                />

                <Text style={styles.fieldLabel}>Credentials</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., CPM, CNM, LM"
                  placeholderTextColor={colors.textLight}
                  value={formData.examiner_credentials || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, examiner_credentials: text }))}
                />
              </View>
            ))}

            {/* SECTION 2: Birth and Risk Summary */}
            {renderCollapsibleSection('Birth & Risk Summary', 'birth_risk', 'warning-outline', (
              <View>
                <Text style={styles.fieldLabel}>Gestational Age</Text>
                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Weeks"
                      placeholderTextColor={colors.textLight}
                      value={formData.gestational_age_weeks?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, gestational_age_weeks: text ? parseInt(text) : undefined }))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <TextInput
                      style={styles.input}
                      placeholder="Days"
                      placeholderTextColor={colors.textLight}
                      value={formData.gestational_age_days?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, gestational_age_days: text ? parseInt(text) : undefined }))}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Type of Birth</Text>
                {renderOptionButtons(TYPE_OF_BIRTH_OPTIONS, formData.type_of_birth, (val) => setFormData(prev => ({ ...prev, type_of_birth: val })))}

                <Text style={styles.fieldLabel}>Risk Flags</Text>
                {renderMultiSelect(RISK_FLAGS, formData.risk_flags || [], (val) => {
                  const current = formData.risk_flags || [];
                  const updated = current.includes(val)
                    ? current.filter(v => v !== val)
                    : [...current, val];
                  setFormData(prev => ({ ...prev, risk_flags: updated }));
                })}

                {formData.risk_flags?.includes('other') && (
                  <>
                    <Text style={styles.fieldLabel}>Other Risk Notes</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe other risk factors..."
                      placeholderTextColor={colors.textLight}
                      value={formData.risk_flags_notes || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, risk_flags_notes: text }))}
                      multiline
                      numberOfLines={2}
                    />
                  </>
                )}
              </View>
            ))}

            {/* SECTION 3: Vital Signs */}
            {renderCollapsibleSection('Vital Signs', 'vitals', 'pulse-outline', (
              <View>
                <View style={styles.rowInputs}>
                  <View style={styles.twoThirdsInput}>
                    <Text style={styles.fieldLabel}>Temperature</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g., 98.6"
                      placeholderTextColor={colors.textLight}
                      value={formData.temperature?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, temperature: text ? parseFloat(text) : undefined }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    {renderOptionButtons(
                      [{ value: 'F', label: '°F' }, { value: 'C', label: '°C' }],
                      formData.temperature_unit || 'F',
                      (val) => setFormData(prev => ({ ...prev, temperature_unit: val })),
                      true
                    )}
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Heart Rate</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="bpm"
                      placeholderTextColor={colors.textLight}
                      value={formData.heart_rate?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, heart_rate: text ? parseInt(text) : undefined }))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Resp Rate</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="/min"
                      placeholderTextColor={colors.textLight}
                      value={formData.respiratory_rate?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, respiratory_rate: text ? parseInt(text) : undefined }))}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>O2 Sat</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="%"
                      placeholderTextColor={colors.textLight}
                      value={formData.oxygen_saturation?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, oxygen_saturation: text ? parseInt(text) : undefined }))}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Perfusion (Cap Refill)</Text>
                {renderOptionButtons(PERFUSION_OPTIONS, formData.perfusion_status, (val) => setFormData(prev => ({ ...prev, perfusion_status: val })))}

                {formData.perfusion_status === 'delayed' && (
                  <TextInput
                    style={[styles.input, styles.inputSmall]}
                    placeholder="Notes on delayed perfusion..."
                    placeholderTextColor={colors.textLight}
                    value={formData.perfusion_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, perfusion_notes: text }))}
                  />
                )}
              </View>
            ))}

            {/* SECTION 4: Measurements & Growth */}
            {renderCollapsibleSection('Measurements & Growth', 'measurements', 'resize-outline', (
              <View>
                <View style={styles.rowInputs}>
                  <View style={styles.twoThirdsInput}>
                    <Text style={styles.fieldLabel}>Current Weight</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Weight"
                      placeholderTextColor={colors.textLight}
                      value={formData.current_weight?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, current_weight: text ? parseFloat(text) : undefined }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    {renderOptionButtons(
                      [{ value: 'lbs', label: 'lbs' }, { value: 'kg', label: 'kg' }],
                      formData.current_weight_unit || 'lbs',
                      (val) => setFormData(prev => ({ ...prev, current_weight_unit: val })),
                      true
                    )}
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.twoThirdsInput}>
                    <Text style={styles.fieldLabel}>Birth Weight</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Birth weight"
                      placeholderTextColor={colors.textLight}
                      value={formData.birth_weight?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, birth_weight: text ? parseFloat(text) : undefined }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    {renderOptionButtons(
                      [{ value: 'lbs', label: 'lbs' }, { value: 'kg', label: 'kg' }],
                      formData.birth_weight_unit || 'lbs',
                      (val) => setFormData(prev => ({ ...prev, birth_weight_unit: val })),
                      true
                    )}
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.twoThirdsInput}>
                    <Text style={styles.fieldLabel}>Length</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Length"
                      placeholderTextColor={colors.textLight}
                      value={formData.length?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, length: text ? parseFloat(text) : undefined }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    {renderOptionButtons(
                      [{ value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }],
                      formData.length_unit || 'in',
                      (val) => setFormData(prev => ({ ...prev, length_unit: val })),
                      true
                    )}
                  </View>
                </View>

                <View style={styles.rowInputs}>
                  <View style={styles.twoThirdsInput}>
                    <Text style={styles.fieldLabel}>Head Circumference</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Head circ"
                      placeholderTextColor={colors.textLight}
                      value={formData.head_circumference?.toString() || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, head_circumference: text ? parseFloat(text) : undefined }))}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.thirdInput}>
                    <Text style={styles.fieldLabel}>Unit</Text>
                    {renderOptionButtons(
                      [{ value: 'in', label: 'in' }, { value: 'cm', label: 'cm' }],
                      formData.head_circumference_unit || 'in',
                      (val) => setFormData(prev => ({ ...prev, head_circumference_unit: val })),
                      true
                    )}
                  </View>
                </View>

                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Growth Plotted?</Text>
                  <Switch
                    value={formData.growth_plotted || false}
                    onValueChange={(val) => setFormData(prev => ({ ...prev, growth_plotted: val }))}
                    trackColor={{ false: colors.border, true: primaryColor + '50' }}
                    thumbColor={formData.growth_plotted ? primaryColor : colors.textLight}
                  />
                </View>

                <Text style={styles.fieldLabel}>Growth Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Notes on growth percentiles, concerns..."
                  placeholderTextColor={colors.textLight}
                  value={formData.growth_notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, growth_notes: text }))}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            {/* SECTION 5: General Appearance */}
            {renderCollapsibleSection('General Appearance', 'appearance', 'eye-outline', (
              <View>
                <Text style={styles.fieldLabel}>Color</Text>
                {renderOptionButtons(COLOR_OPTIONS, formData.color, (val) => setFormData(prev => ({ ...prev, color: val })))}
                {(formData.color === 'jaundice' || formData.color === 'other') && (
                  <TextInput
                    style={[styles.input, styles.inputSmall]}
                    placeholder="Color notes..."
                    placeholderTextColor={colors.textLight}
                    value={formData.color_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, color_notes: text }))}
                  />
                )}

                <Text style={styles.fieldLabel}>Tone</Text>
                {renderOptionButtons(TONE_OPTIONS, formData.tone, (val) => setFormData(prev => ({ ...prev, tone: val })))}
                {formData.tone && formData.tone !== 'normal' && (
                  <TextInput
                    style={[styles.input, styles.inputSmall]}
                    placeholder="Tone notes..."
                    placeholderTextColor={colors.textLight}
                    value={formData.tone_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, tone_notes: text }))}
                  />
                )}

                <Text style={styles.fieldLabel}>Activity & Alertness</Text>
                {renderOptionButtons(ACTIVITY_OPTIONS, formData.activity_alertness, (val) => setFormData(prev => ({ ...prev, activity_alertness: val })))}
                {formData.activity_alertness && formData.activity_alertness !== 'normal' && (
                  <TextInput
                    style={[styles.input, styles.inputSmall]}
                    placeholder="Activity notes..."
                    placeholderTextColor={colors.textLight}
                    value={formData.activity_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, activity_notes: text }))}
                  />
                )}

                <Text style={styles.fieldLabel}>Breathing Effort</Text>
                {renderOptionButtons(BREATHING_OPTIONS, formData.breathing_effort, (val) => setFormData(prev => ({ ...prev, breathing_effort: val })))}
                {formData.breathing_effort && formData.breathing_effort !== 'easy' && (
                  <TextInput
                    style={[styles.input, styles.inputSmall]}
                    placeholder="Breathing notes..."
                    placeholderTextColor={colors.textLight}
                    value={formData.breathing_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, breathing_notes: text }))}
                  />
                )}
              </View>
            ))}

            {/* SECTION 6: System-by-System Exam */}
            {renderCollapsibleSection('System-by-System Exam', 'systems', 'body-outline', (
              <View>
                <Text style={styles.systemExamNote}>
                  Tap Normal, Abnormal, or N/A for each system. Add notes for abnormal findings.
                </Text>
                {SYSTEM_EXAMS.map(({ key, label, icon }) => renderSystemExamRow(key, label, icon))}
              </View>
            ))}

            {/* SECTION 7: Feeding, Elimination, Behavior */}
            {renderCollapsibleSection('Feeding & Elimination', 'feeding', 'restaurant-outline', (
              <View>
                <Text style={styles.fieldLabel}>Feeding Method</Text>
                {renderOptionButtons(FEEDING_METHOD_OPTIONS, formData.feeding_method, (val) => setFormData(prev => ({ ...prev, feeding_method: val })))}

                <Text style={styles.fieldLabel}>Feeding Quality</Text>
                {renderOptionButtons(FEEDING_QUALITY_OPTIONS, formData.feeding_quality, (val) => setFormData(prev => ({ ...prev, feeding_quality: val })))}

                {formData.feeding_quality && formData.feeding_quality !== 'effective' && (
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Feeding concerns/notes..."
                    placeholderTextColor={colors.textLight}
                    value={formData.feeding_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, feeding_notes: text }))}
                    multiline
                    numberOfLines={2}
                  />
                )}

                <View style={styles.rowInputs}>
                  <View style={styles.halfInput}>
                    <Text style={styles.fieldLabel}>Voids (24h)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="# voids"
                      placeholderTextColor={colors.textLight}
                      value={formData.voids_24h || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, voids_24h: text }))}
                    />
                  </View>
                  <View style={styles.halfInput}>
                    <Text style={styles.fieldLabel}>Stools (24h)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="# stools"
                      placeholderTextColor={colors.textLight}
                      value={formData.stools_24h || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, stools_24h: text }))}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Parent Concerns</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Any concerns from parents?"
                  placeholderTextColor={colors.textLight}
                  value={formData.parent_concerns || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, parent_concerns: text }))}
                  multiline
                  numberOfLines={2}
                />
              </View>
            ))}

            {/* SECTION 8: Assessment, Education, Plan */}
            {renderCollapsibleSection('Assessment & Plan', 'assessment', 'checkmark-circle-outline', (
              <View>
                <Text style={styles.fieldLabel}>Overall Assessment</Text>
                {renderOptionButtons(ASSESSMENT_OPTIONS, formData.overall_assessment, (val) => setFormData(prev => ({ ...prev, overall_assessment: val })))}

                {formData.overall_assessment && formData.overall_assessment !== 'healthy' && (
                  <>
                    <Text style={styles.fieldLabel}>Red Flag Findings</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Document any red flags..."
                      placeholderTextColor={colors.textLight}
                      value={formData.red_flag_findings || ''}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, red_flag_findings: text }))}
                      multiline
                      numberOfLines={3}
                    />
                  </>
                )}

                <Text style={styles.fieldLabel}>Parent Questions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Questions from parents..."
                  placeholderTextColor={colors.textLight}
                  value={formData.parent_questions || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, parent_questions: text }))}
                  multiline
                  numberOfLines={2}
                />

                <Text style={styles.fieldLabel}>Education Given</Text>
                {renderMultiSelect(EDUCATION_OPTIONS, formData.education_given || [], (val) => {
                  const current = formData.education_given || [];
                  const updated = current.includes(val)
                    ? current.filter(v => v !== val)
                    : [...current, val];
                  setFormData(prev => ({ ...prev, education_given: updated }));
                })}

                {formData.education_given?.includes('other') && (
                  <TextInput
                    style={[styles.input, styles.inputSmall]}
                    placeholder="Other education topics..."
                    placeholderTextColor={colors.textLight}
                    value={formData.education_notes || ''}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, education_notes: text }))}
                  />
                )}

                <Text style={styles.fieldLabel}>Plan / Next Steps</Text>
                <TextInput
                  style={[styles.input, styles.textAreaLarge]}
                  placeholder="Document the plan and any follow-up needed..."
                  placeholderTextColor={colors.textLight}
                  value={formData.plan_notes || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, plan_notes: text }))}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Next Visit</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2024-03-20 10:00 AM"
                  placeholderTextColor={colors.textLight}
                  value={formData.next_visit_datetime || ''}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, next_visit_datetime: text }))}
                />
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Save Draft"
              variant="outline"
              onPress={() => handleSave(true)}
              loading={saving}
              style={{ flex: 1, marginRight: SIZES.sm }}
            />
            <Button
              title="Save & Finalize"
              onPress={() => handleSave(false)}
              loading={saving}
              style={{ flex: 1 }}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ============== STYLES ==============
const getStyles = createThemedStyles((colors) => ({
  section: {
    marginTop: SIZES.md,
    marginBottom: SIZES.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginLeft: SIZES.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
  },
  addButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.white,
    marginLeft: 4,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SIZES.xl,
  },
  emptyTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginTop: SIZES.md,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.xs,
    paddingHorizontal: SIZES.lg,
  },
  examsList: {
    gap: SIZES.sm,
  },
  examCard: {
    marginBottom: 0,
  },
  examCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  examCardInfo: {
    flex: 1,
  },
  examCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
  },
  examCardName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  examCardDate: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  examCardActions: {
    flexDirection: 'row',
    gap: SIZES.xs,
  },
  draftBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  draftBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
  },
  assessmentBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 2,
    borderRadius: SIZES.radiusFull,
  },
  assessmentBadgeText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyMedium,
  },
  examCardDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.md,
    marginBottom: SIZES.sm,
  },
  examCardDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  examCardDetailText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  examCardFooter: {
    flexDirection: 'row',
    gap: SIZES.sm,
    marginTop: SIZES.sm,
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  examActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    gap: 4,
  },
  examActionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SIZES.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  // Collapsible sections
  collapsibleSection: {
    backgroundColor: colors.white,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.sm,
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: colors.background,
  },
  collapsibleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  collapsibleTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.subheading,
    color: colors.text,
  },
  collapsibleContent: {
    padding: SIZES.md,
    paddingTop: SIZES.sm,
  },
  // Form styles
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyMedium,
    color: colors.textSecondary,
    marginBottom: SIZES.xs,
    marginTop: SIZES.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusSm,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
    backgroundColor: colors.white,
  },
  inputSmall: {
    marginTop: SIZES.xs,
    padding: SIZES.sm,
    fontSize: SIZES.fontSm,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  halfInput: {
    flex: 1,
  },
  thirdInput: {
    flex: 1,
  },
  twoThirdsInput: {
    flex: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.xs,
  },
  optionsRowSmall: {
    gap: 4,
  },
  optionButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginBottom: SIZES.xs,
  },
  optionButtonSmall: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  optionButtonTextSmall: {
    fontSize: SIZES.fontXs,
  },
  optionButtonTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyMedium,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.sm,
    marginTop: SIZES.sm,
  },
  toggleLabel: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  // System exam styles
  systemExamNote: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textLight,
    fontStyle: 'italic',
    marginBottom: SIZES.md,
  },
  systemExamRow: {
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  systemExamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  systemExamLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    flex: 1,
  },
  systemExamLabelText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  systemExamStatusButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  statusButton: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  statusButtonText: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
  statusButtonTextSelected: {
    color: colors.white,
    fontFamily: FONTS.bodyMedium,
  },
}));
