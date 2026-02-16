import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { COLORS, SIZES } from '../constants/theme';

// Types
interface FieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
}

interface MultiSelectProps extends FieldProps {
  options: string[];
}

interface SingleSelectProps extends FieldProps {
  options: string[];
}

// Reusable Components
export const TextInputField: React.FC<FieldProps & { multiline?: boolean; numberOfLines?: number }> = ({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numberOfLines = 1,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={[styles.textInput, multiline && styles.textArea]}
      value={value || ''}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={COLORS.textLight}
      multiline={multiline}
      numberOfLines={numberOfLines}
    />
  </View>
);

export const MultiSelectField: React.FC<MultiSelectProps> = ({
  label,
  value = [],
  onChange,
  options,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        style={styles.checkboxRow}
        onPress={() => {
          const current = value || [];
          if (current.includes(option)) {
            onChange(current.filter((o: string) => o !== option));
          } else {
            onChange([...current, option]);
          }
        }}
        data-testid={`checkbox-${option.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <View style={[styles.checkbox, value?.includes(option) && styles.checkboxChecked]}>
          {value?.includes(option) && <Icon name="checkmark" size={14} color={COLORS.white} />}
        </View>
        <Text style={styles.checkboxLabel}>{option}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

export const SingleSelectField: React.FC<SingleSelectProps> = ({
  label,
  value,
  onChange,
  options,
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        style={styles.radioRow}
        onPress={() => onChange(option)}
        data-testid={`radio-${option.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <View style={[styles.radio, value === option && styles.radioSelected]}>
          {value === option && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.radioLabel}>{option}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ============================================
// SECTION FORM CONFIGURATIONS
// Based on "True Joy Birthing Fillout Form FINAL.pdf"
// ============================================

export const SECTION_FORMS: Record<string, {
  description: string;
  fields: Array<{
    key: string;
    type: 'text' | 'textarea' | 'multiselect' | 'singleselect';
    label: string;
    placeholder?: string;
    options?: string[];
  }>;
}> = {
  // ============================================
  // SECTION 1: ABOUT ME & MY PREFERENCES
  // ============================================
  about_me: {
    description: 'This information helps your healthcare team understand who you are and who will be supporting you during birth.',
    fields: [
      {
        key: 'motherName',
        type: 'text',
        label: "Mother's Name",
        placeholder: 'Your full name',
      },
      {
        key: 'partnerName',
        type: 'text',
        label: "Partner's Name (if applicable)",
        placeholder: "Partner's name",
      },
      {
        key: 'emailAddress',
        type: 'text',
        label: 'Email Address',
        placeholder: 'your.email@example.com',
      },
      {
        key: 'phoneNumber',
        type: 'text',
        label: 'Phone Number',
        placeholder: '(555) 123-4567',
      },
      {
        key: 'dueDate',
        type: 'text',
        label: 'Due Date',
        placeholder: 'MM/DD/YYYY',
      },
      {
        key: 'birthSupport',
        type: 'textarea',
        label: 'Birth Support (and relationship)',
        placeholder: 'e.g., John Doe (Partner), Jane Smith (Doula), Mary Doe (Mother)',
      },
      {
        key: 'doctorName',
        type: 'text',
        label: "Doctor's Name",
        placeholder: 'Dr. Name',
      },
    ],
  },

  // ============================================
  // SECTION 2: LABOR & DELIVERY PREFERENCES
  // ============================================
  labor_delivery: {
    description: 'Share your preferences for the labor environment and early stages of delivery. These help your care team create a comfortable space for you.',
    fields: [
      {
        key: 'clothingPreference',
        type: 'multiselect',
        label: 'Clothing Preference',
        options: [
          'Hospital Gown',
          'My Own Clothes',
        ],
      },
      {
        key: 'fetalMonitoring',
        type: 'multiselect',
        label: 'Fetal Monitoring (check all that apply)',
        options: [
          'Continuous External Monitoring (Belly Band)',
          'Bluetooth Fetal Monitoring (If available)',
          'Intermittent External Monitoring (Doppler)',
          'Internal Fetal Monitoring (Internal Electrode)',
        ],
      },
      {
        key: 'fetalMonitoringNotes',
        type: 'textarea',
        label: 'Fetal Monitoring - Additional Notes',
        placeholder: 'Explain any specific preferences for monitoring...',
      },
      {
        key: 'ivSalineLock',
        type: 'multiselect',
        label: 'IV/Saline Lock Preference',
        options: [
          'IV Access',
          'Saline Lock Only',
          'No IV/Saline Lock',
        ],
      },
      {
        key: 'ivRationale',
        type: 'textarea',
        label: 'If selecting No IV/Saline Lock, please explain rationale',
        placeholder: 'Your reasoning...',
      },
      {
        key: 'eatingDrinking',
        type: 'singleselect',
        label: 'Eating and Drinking During Labor',
        options: ['Yes', 'No'],
      },
      {
        key: 'eatingDrinkingNotes',
        type: 'textarea',
        label: 'Eating/Drinking - Specify Preferences',
        placeholder: 'What foods/drinks would you like available?',
      },
    ],
  },

  // ============================================
  // SECTION 3: PAIN MANAGEMENT
  // (Separated from Labor for better organization)
  // ============================================
  pain_management: {
    description: 'Everyone experiences labor differently. Share your preferences for managing discomfort during labor. Rank in order of preference if applicable.',
    fields: [
      {
        key: 'painManagement',
        type: 'multiselect',
        label: 'Pain Management Preferences (rank in order of preference)',
        options: [
          'None',
          'Epidural',
          'Nitrous Oxide (not standard)',
          'Other',
        ],
      },
      {
        key: 'painManagementOther',
        type: 'textarea',
        label: 'Other Pain Management - Specify',
        placeholder: 'Describe other pain management methods you prefer...',
      },
    ],
  },

  // ============================================
  // SECTION 4: MONITORING & IV / SALINE LOCK
  // (Labor Environment continued)
  // ============================================
  monitoring_iv: {
    description: 'Share your preferences for your labor environment including lighting, sounds, aromatherapy, and comfort measures.',
    fields: [
      {
        key: 'laborEnvironment',
        type: 'multiselect',
        label: 'Labor Environment Preferences (check all that apply)',
        options: [
          'Lighting',
          'Specific Sounds/Music',
          'Aromatherapy',
          'Comfort Items (e.g., blanket, pillow)',
          'Other Environmental Preferences',
        ],
      },
      {
        key: 'environmentDescription',
        type: 'textarea',
        label: 'Describe your ideal environment',
        placeholder: 'e.g., Dim lights, calming music, lavender essential oil...',
      },
      {
        key: 'counterPressure',
        type: 'singleselect',
        label: 'Counter Pressure',
        options: ['Yes', 'No'],
      },
      {
        key: 'counterPressureDescription',
        type: 'textarea',
        label: 'Counter Pressure Details',
        placeholder: 'Specify location, pressure level, continuous or intermittent. Ex.: "Yes, firm counter pressure on my lower back during contractions."',
      },
      {
        key: 'physicalTouch',
        type: 'singleselect',
        label: 'Physical Touch (head massage, back rubs, holding hands, etc.)',
        options: ['Yes', 'No'],
      },
      {
        key: 'physicalTouchDetails',
        type: 'textarea',
        label: 'Physical Touch - Specify Preferences',
        placeholder: 'What type of touch would you find comforting?',
      },
    ],
  },

  // ============================================
  // SECTION 5: INDUCTION & BIRTH INTERVENTIONS
  // ============================================
  induction_interventions: {
    description: 'Share your thoughts on induction methods and medical interventions if they become medically necessary. Rank in order of preference.',
    fields: [
      {
        key: 'inductionInterventions',
        type: 'multiselect',
        label: 'Induction Interventions (if medically necessary) - Rank in order of preference',
        options: [
          'Membrane Sweep',
          'Amniotomy (Artificial Rupture of Membranes)',
          'Cytotec',
          'Pitocin',
          'Balloon Foley',
          'Other',
        ],
      },
      {
        key: 'inductionOther',
        type: 'textarea',
        label: 'Other Induction Method - Specify',
        placeholder: 'Describe other induction methods you prefer...',
      },
      {
        key: 'birthingInterventions',
        type: 'multiselect',
        label: 'Birthing Interventions (if medically necessary) - Rank in order of preference',
        options: [
          'Forceps',
          'Vacuum Extraction',
          'Episiotomy',
          'Other',
        ],
      },
      {
        key: 'birthingOther',
        type: 'textarea',
        label: 'Other Birthing Intervention - Specify',
        placeholder: 'Describe other interventions you prefer...',
      },
      {
        key: 'movementDuringLabor',
        type: 'multiselect',
        label: 'Movement During Labor',
        options: [
          'Free movement (walk, change positions as needed)',
          'Primarily in bed',
          'Exercise ball',
          'Peanut ball',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 6: PUSHING & SAFE WORD
  // ============================================
  pushing_safe_word: {
    description: 'Share your preferences for cervical checks, pushing, and establish a safe word for communication with your care team.',
    fields: [
      {
        key: 'cervicalChecks',
        type: 'singleselect',
        label: 'Cervical Checks',
        options: [
          'Yes, only when asked for',
          'Yes (specify frequency below)',
          "Yes, but don't want to know the dilation",
          'No',
        ],
      },
      {
        key: 'cervicalCheckFrequency',
        type: 'text',
        label: 'Cervical Check Frequency (if applicable)',
        placeholder: 'e.g., Every 4 hours',
      },
      {
        key: 'pushing',
        type: 'singleselect',
        label: 'Pushing Preference',
        options: [
          'Mother-Led Pushing (intuitive pushing)',
          'Coached Pushing (guided by healthcare provider or birth coach)',
        ],
      },
      {
        key: 'mirrorDuringDelivery',
        type: 'singleselect',
        label: 'Mirror During Delivery',
        options: ['Yes', 'No'],
      },
      {
        key: 'photographyVideography',
        type: 'singleselect',
        label: 'Photography/Videography',
        options: [
          'Photos Only',
          'Video Only',
          'Both Photos and Video',
          'Neither',
        ],
      },
      {
        key: 'safeWord',
        type: 'text',
        label: 'Safe Word',
        placeholder: 'A word that indicates you need to switch to medicated birth if coping becomes difficult',
      },
      {
        key: 'birthWordPreference',
        type: 'text',
        label: 'Any Birth Word Preference',
        placeholder: 'Ex. Contractions being called surges or waves',
      },
    ],
  },

  // ============================================
  // SECTION 7: POST-DELIVERY PREFERENCES
  // ============================================
  post_delivery: {
    description: 'Share your preferences for immediately after your baby is born, including skin-to-skin, cord care, and placenta options.',
    fields: [
      {
        key: 'immediateSkinToSkin',
        type: 'singleselect',
        label: 'Immediate Skin-to-Skin',
        options: ['Yes', 'No'],
      },
      {
        key: 'delayedCordClamping',
        type: 'multiselect',
        label: 'Delayed Cord Clamping',
        options: [
          'Yes',
          'No',
          'After specified time',
          'Until placenta is completely drained and cord is limp and white',
        ],
      },
      {
        key: 'cuttingTheCord',
        type: 'singleselect',
        label: 'Who Cuts the Cord',
        options: [
          'Partner',
          'Myself',
          'Other (specify below)',
        ],
      },
      {
        key: 'cordCuttingOther',
        type: 'text',
        label: 'Other Person to Cut Cord - Specify',
        placeholder: 'Name of person',
      },
      {
        key: 'placentaDelivery',
        type: 'singleselect',
        label: 'Placenta Delivery',
        options: [
          'Spontaneous (natural delivery)',
          'Dr. Assisted',
          'Pitocin-assisted (if medically indicated)',
        ],
      },
      {
        key: 'placentaRetention',
        type: 'singleselect',
        label: 'Placenta Retention',
        options: [
          'Discard Placenta',
          'Keep Placenta',
        ],
      },
      {
        key: 'postpartumPitocin',
        type: 'singleselect',
        label: 'Postpartum Pitocin',
        options: ['Yes', 'No'],
      },
      {
        key: 'postpartumPitocinRationale',
        type: 'textarea',
        label: 'If selecting No for Postpartum Pitocin, please explain rationale',
        placeholder: 'Your reasoning...',
      },
      {
        key: 'goldenHour',
        type: 'textarea',
        label: 'Golden Hour Preferences',
        placeholder: 'Describe your preferences for undisturbed bonding time immediately following birth...',
      },
      {
        key: 'feedingMethod',
        type: 'singleselect',
        label: 'Feeding Method',
        options: [
          'Breastfeeding',
          'Bottle Feeding (specify type of formula below)',
          'Both',
        ],
      },
      {
        key: 'formulaType',
        type: 'text',
        label: 'Formula Type (if applicable)',
        placeholder: 'Brand/type of formula',
      },
    ],
  },

  // ============================================
  // SECTION 8: NEWBORN CARE PREFERENCES
  // ============================================
  newborn_care: {
    description: 'Share your preferences for your baby\'s care in the first hours and days after birth.',
    fields: [
      {
        key: 'antibacterialEyeOintment',
        type: 'singleselect',
        label: 'Antibacterial Eye Ointment',
        options: ['Yes', 'No'],
      },
      {
        key: 'hepatitisBVaccine',
        type: 'singleselect',
        label: 'Hepatitis B Vaccine',
        options: ['Yes', 'No'],
      },
      {
        key: 'vitaminKShot',
        type: 'singleselect',
        label: 'Vitamin K Shot',
        options: ['Yes', 'No'],
      },
      {
        key: 'vernixCleaning',
        type: 'singleselect',
        label: 'Vernix Cleaning',
        options: ['Leave', 'Wipe off'],
      },
      {
        key: 'circumcision',
        type: 'multiselect',
        label: 'Circumcision (if applicable)',
        options: [
          'Yes',
          'No',
          'In hospital',
          "At doctor's office",
        ],
      },
      {
        key: 'newbornCareLocation',
        type: 'singleselect',
        label: 'Newborn Care Location',
        options: [
          'Rooming-in (baby stays with mother)',
          'Nursery (baby stays in nursery)',
          'Both - at my request',
        ],
      },
      {
        key: 'babyFootprints',
        type: 'singleselect',
        label: 'Baby Footprints',
        options: ['Yes', 'No'],
      },
    ],
  },

  // ============================================
  // SECTION 9: OTHER CONSIDERATIONS
  // ============================================
  other_considerations: {
    description: 'Any additional preferences, requests, or information for your care team. This birth plan is a guide to assist communication with your healthcare provider. Medical needs may necessitate changes to the plan.',
    fields: [
      {
        key: 'otherPreferences',
        type: 'textarea',
        label: 'Any Other Important Preferences or Considerations',
        placeholder: 'Share any additional wishes, concerns, or information that your healthcare team should know...',
      },
      {
        key: 'religiousCultural',
        type: 'textarea',
        label: 'Religious or Cultural Practices',
        placeholder: 'Any ceremonies, prayers, or traditions you\'d like to observe...',
      },
      {
        key: 'allergies',
        type: 'textarea',
        label: 'Allergies or Medical Conditions',
        placeholder: 'List any allergies or conditions your team should know about...',
      },
      {
        key: 'visitors',
        type: 'textarea',
        label: 'Visitor Preferences',
        placeholder: 'Who is allowed to visit and when...',
      },
      {
        key: 'photographyNotes',
        type: 'textarea',
        label: 'Photography/Videography Notes',
        placeholder: 'Any specific requests about photos or videos...',
      },
      {
        key: 'musicPreferences',
        type: 'text',
        label: 'Music Preferences',
        placeholder: 'Playlist name, genre, or specific requests...',
      },
    ],
  },
};

// Render field based on type
export const renderField = (
  field: typeof SECTION_FORMS[string]['fields'][number],
  data: Record<string, any>,
  onChange: (key: string, value: any) => void
) => {
  const { key, type, label, placeholder, options } = field;
  const value = data[key];
  
  switch (type) {
    case 'text':
      return (
        <TextInputField
          key={key}
          label={label}
          value={value}
          onChange={(v) => onChange(key, v)}
          placeholder={placeholder}
        />
      );
    case 'textarea':
      return (
        <TextInputField
          key={key}
          label={label}
          value={value}
          onChange={(v) => onChange(key, v)}
          placeholder={placeholder}
          multiline
          numberOfLines={4}
        />
      );
    case 'multiselect':
      return (
        <MultiSelectField
          key={key}
          label={label}
          value={value}
          onChange={(v) => onChange(key, v)}
          options={options || []}
        />
      );
    case 'singleselect':
      return (
        <SingleSelectField
          key={key}
          label={label}
          value={value}
          onChange={(v) => onChange(key, v)}
          options={options || []}
        />
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  fieldContainer: {
    marginBottom: SIZES.lg,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    flex: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.xs,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
