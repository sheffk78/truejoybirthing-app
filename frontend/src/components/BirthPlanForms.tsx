import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { COLORS, SIZES, FONTS } from '../constants/theme';

// Component for text input fields
const TextInputField = ({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  numberOfLines = 1,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numberOfLines?: number;
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

// Component for multi-select checkboxes
const MultiSelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: string[];
}) => {
  const selectedValues = Array.isArray(value) ? value : [];
  
  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };
  
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {options.map((option) => (
        <TouchableOpacity
          key={option}
          style={styles.checkboxRow}
          onPress={() => toggleOption(option)}
        >
          <View style={[styles.checkbox, selectedValues.includes(option) && styles.checkboxChecked]}>
            {selectedValues.includes(option) && (
              <Icon name="checkmark" size={16} color={COLORS.white} />
            )}
          </View>
          <Text style={styles.checkboxLabel}>{option}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Component for single-select radio buttons
const SingleSelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {options.map((option) => (
      <TouchableOpacity
        key={option}
        style={styles.radioRow}
        onPress={() => onChange(option)}
      >
        <View style={[styles.radio, value === option && styles.radioSelected]}>
          {value === option && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.radioLabel}>{option}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// =============================================
// COMPREHENSIVE BIRTH PLAN FORM CONFIGURATION
// Based on True Joy Birthing requirements
// =============================================

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
        placeholder: 'List people who will support you during birth (e.g., John Doe - Partner, Jane Smith - Doula)',
      },
      {
        key: 'doctorMidwife',
        type: 'text',
        label: 'Doctor/Midwife Name',
        placeholder: 'Dr./Midwife Name',
      },
      {
        key: 'birthLocation',
        type: 'singleselect',
        label: 'Where do you plan to give birth?',
        options: [
          'Hospital',
          'Birth Center',
          'Home Birth',
          'Not sure yet',
        ],
      },
      {
        key: 'hospitalName',
        type: 'text',
        label: 'Hospital/Birth Center Name (if applicable)',
        placeholder: 'Name of facility',
      },
    ],
  },

  // ============================================
  // SECTION 2: LABOR & DELIVERY PREFERENCES
  // ============================================
  labor_delivery: {
    description: 'Share your preferences for the labor environment and early stages of delivery.',
    fields: [
      {
        key: 'laborEnvironment',
        type: 'multiselect',
        label: 'Labor Environment Preferences',
        options: [
          'Dim lighting',
          'Quiet atmosphere',
          'Music playing',
          'Aromatherapy',
          'Limited visitors',
          'Freedom to move around',
          'Access to shower/tub',
          'Birth ball available',
        ],
      },
      {
        key: 'clothingPreference',
        type: 'singleselect',
        label: 'What would you like to wear during labor?',
        options: [
          'Hospital gown',
          'My own clothes/gown',
          'Birthing skirt',
          'No preference',
        ],
      },
      {
        key: 'laborPositions',
        type: 'multiselect',
        label: 'Labor Positions You Want to Try',
        options: [
          'Walking',
          'Standing',
          'Squatting',
          'Hands and knees',
          'Side lying',
          'Using birth ball',
          'In water/tub',
          'Whatever feels right',
        ],
      },
      {
        key: 'hydrationFood',
        type: 'singleselect',
        label: 'Food and Drink During Labor',
        options: [
          'Clear liquids only',
          'Light snacks if allowed',
          'Ice chips only',
          'Whatever is permitted',
        ],
      },
      {
        key: 'peoplePresent',
        type: 'textarea',
        label: 'Who would you like present during labor?',
        placeholder: 'List names and relationships',
      },
      {
        key: 'photographyPreferences',
        type: 'multiselect',
        label: 'Photography/Video Preferences',
        options: [
          'Photos during labor',
          'Photos during delivery',
          'Video during labor',
          'Video during delivery',
          'No photos or video',
          'Photos of baby only after birth',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 3: PAIN MANAGEMENT
  // ============================================
  pain_management: {
    description: 'Your preferences for managing pain during labor. Remember, you can always change your mind.',
    fields: [
      {
        key: 'painManagementApproach',
        type: 'singleselect',
        label: 'Overall Approach to Pain Management',
        options: [
          'I prefer to avoid medication if possible',
          'I am open to medication if needed',
          'I plan to use an epidural',
          'I want to decide during labor',
        ],
      },
      {
        key: 'naturalMethods',
        type: 'multiselect',
        label: 'Non-Medication Pain Relief Methods',
        options: [
          'Breathing techniques',
          'Massage',
          'Counter-pressure',
          'Hydrotherapy (shower/tub)',
          'TENS unit',
          'Birthing ball',
          'Position changes',
          'Aromatherapy',
          'Hypnobirthing techniques',
          'Meditation/visualization',
          'Hot/cold compresses',
        ],
      },
      {
        key: 'medicationOptions',
        type: 'multiselect',
        label: 'Medication Options (if needed)',
        options: [
          'IV pain medication',
          'Epidural',
          'Spinal block',
          'Local anesthesia',
          'Nitrous oxide (laughing gas)',
          'Please discuss all options with me first',
        ],
      },
      {
        key: 'epiduralPreferences',
        type: 'singleselect',
        label: 'If you choose an epidural',
        options: [
          'Light/walking epidural if available',
          'Full epidural',
          'I want to wait as long as possible',
          'Please offer when appropriate',
          'Do not offer unless I ask',
        ],
      },
      {
        key: 'painNotes',
        type: 'textarea',
        label: 'Additional Notes About Pain Management',
        placeholder: 'Any specific concerns or preferences...',
      },
    ],
  },

  // ============================================
  // SECTION 4: LABOR ENVIRONMENT & COMFORT
  // (Previously monitoring_iv)
  // ============================================
  monitoring_iv: {
    description: 'Your preferences for fetal monitoring, IVs, and other medical interventions during labor.',
    fields: [
      {
        key: 'fetalMonitoring',
        type: 'singleselect',
        label: 'Fetal Monitoring Preference',
        options: [
          'Intermittent monitoring (more freedom to move)',
          'Continuous monitoring',
          'Wireless/waterproof monitoring if available',
          'Whatever is medically recommended',
        ],
      },
      {
        key: 'ivPreference',
        type: 'singleselect',
        label: 'IV/Hep-Lock Preference',
        options: [
          'Hep-lock only (no fluids unless needed)',
          'IV fluids',
          'No IV unless medically necessary',
          'Whatever is recommended',
        ],
      },
      {
        key: 'vaginalExams',
        type: 'singleselect',
        label: 'Vaginal Exams',
        options: [
          'Only when necessary',
          'Frequent updates on progress',
          'Please ask before each exam',
          'Minimal exams preferred',
        ],
      },
      {
        key: 'artificialRupture',
        type: 'singleselect',
        label: 'Artificial Rupture of Membranes (Breaking Water)',
        options: [
          'Allow to happen naturally',
          'Okay to speed up labor',
          'Please discuss with me first',
          'Only if medically necessary',
        ],
      },
      {
        key: 'comfortMeasures',
        type: 'multiselect',
        label: 'Comfort Measures Available',
        options: [
          'Birth ball',
          'Peanut ball',
          'Rocking chair',
          'Birth stool',
          'Squat bar',
          'Warm compresses',
          'Cold compresses',
          'Fan or cool cloth',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 5: INDUCTION & BIRTH INTERVENTIONS
  // ============================================
  induction_interventions: {
    description: 'Your preferences regarding induction and medical interventions during birth.',
    fields: [
      {
        key: 'inductionPreference',
        type: 'singleselect',
        label: 'Induction Preferences',
        options: [
          'I prefer to go into labor naturally',
          'Open to induction if medically needed',
          'Planning a scheduled induction',
          'Discuss options with me before proceeding',
        ],
      },
      {
        key: 'pitocinAugmentation',
        type: 'singleselect',
        label: 'Pitocin/Augmentation',
        options: [
          'Prefer to avoid unless necessary',
          'Okay if labor stalls',
          'Please discuss with me first',
          'Whatever is medically recommended',
        ],
      },
      {
        key: 'episiotomy',
        type: 'singleselect',
        label: 'Episiotomy Preferences',
        options: [
          'Prefer to tear naturally',
          'Okay if necessary to prevent tearing',
          'Only in emergency',
          'Please discuss with me',
        ],
      },
      {
        key: 'assistedDelivery',
        type: 'singleselect',
        label: 'Assisted Delivery (Vacuum/Forceps)',
        options: [
          'Only in emergency',
          'Okay if recommended by doctor',
          'Please discuss all options with me',
          'Prefer cesarean if assisted delivery needed',
        ],
      },
      {
        key: 'cesareanPreferences',
        type: 'multiselect',
        label: 'If Cesarean Becomes Necessary',
        options: [
          'Partner present in OR',
          'Clear drape to see baby born',
          'Immediate skin-to-skin if possible',
          'Delayed cord clamping if possible',
          'Music in operating room',
          'Narrate what is happening',
          'Lower the drape at birth',
        ],
      },
      {
        key: 'interventionNotes',
        type: 'textarea',
        label: 'Additional Notes About Interventions',
        placeholder: 'Any specific concerns...',
      },
    ],
  },

  // ============================================
  // SECTION 6: PUSHING, DELIVERY & SAFE WORD
  // ============================================
  pushing_safe_word: {
    description: 'Your preferences for the pushing stage and delivery, plus your safe word for communication.',
    fields: [
      {
        key: 'pushingApproach',
        type: 'singleselect',
        label: 'Pushing Approach',
        options: [
          'Spontaneous pushing (push when I feel the urge)',
          'Directed/coached pushing',
          'Laboring down (wait for urge)',
          'Whatever feels right',
        ],
      },
      {
        key: 'pushingPositions',
        type: 'multiselect',
        label: 'Pushing Positions to Try',
        options: [
          'Semi-reclined',
          'Side lying',
          'Squatting',
          'Hands and knees',
          'Using squat bar',
          'Standing',
          'In water',
          'Whatever works best',
        ],
      },
      {
        key: 'mirrorUse',
        type: 'singleselect',
        label: 'Would you like to use a mirror?',
        options: [
          'Yes, I want to see',
          'No, I do not want to see',
          'Maybe, I will decide then',
        ],
      },
      {
        key: 'touchBaby',
        type: 'singleselect',
        label: 'Would you like to touch baby\'s head as they crown?',
        options: [
          'Yes',
          'No',
          'I will decide in the moment',
        ],
      },
      {
        key: 'perinealSupport',
        type: 'multiselect',
        label: 'Perineal Support Preferences',
        options: [
          'Warm compresses',
          'Perineal massage',
          'Oil/lubricant',
          'Hands-off approach',
          'Trust provider\'s guidance',
        ],
      },
      {
        key: 'safeWord',
        type: 'text',
        label: 'Safe Word (for communication with your team)',
        placeholder: 'e.g., "PAUSE" or "RED"',
      },
      {
        key: 'safeWordMeaning',
        type: 'textarea',
        label: 'What should happen when you use your safe word?',
        placeholder: 'e.g., "Everyone stops, I need a moment to collect myself and discuss options"',
      },
    ],
  },

  // ============================================
  // SECTION 7: POST-DELIVERY PREFERENCES
  // ============================================
  post_delivery: {
    description: 'Your preferences for immediately after birth and the golden hour.',
    fields: [
      {
        key: 'skinToSkin',
        type: 'singleselect',
        label: 'Immediate Skin-to-Skin',
        options: [
          'Yes, immediately after birth',
          'After baby is briefly assessed',
          'Partner does skin-to-skin first',
          'Flexible based on circumstances',
        ],
      },
      {
        key: 'cordClamping',
        type: 'singleselect',
        label: 'Cord Clamping',
        options: [
          'Delayed cord clamping (wait until cord stops pulsing)',
          'Delayed 1-3 minutes',
          'Immediate clamping',
          'Whatever is recommended',
        ],
      },
      {
        key: 'cordCutting',
        type: 'singleselect',
        label: 'Who would you like to cut the cord?',
        options: [
          'Partner',
          'Mother',
          'Doctor/Midwife',
          'No preference',
        ],
      },
      {
        key: 'cordBloodBanking',
        type: 'singleselect',
        label: 'Cord Blood Banking',
        options: [
          'Private cord blood banking',
          'Public cord blood donation',
          'Not banking cord blood',
          'Still deciding',
        ],
      },
      {
        key: 'placentaPlans',
        type: 'multiselect',
        label: 'Placenta Preferences',
        options: [
          'See the placenta',
          'Take placenta home',
          'Placenta encapsulation',
          'No special requests',
        ],
      },
      {
        key: 'goldenHour',
        type: 'multiselect',
        label: 'Golden Hour Preferences',
        options: [
          'Uninterrupted skin-to-skin for at least one hour',
          'Delay routine procedures',
          'Breastfeed within first hour',
          'Dim lights in room',
          'Quiet environment',
          'Limit visitors',
          'Photos welcome',
        ],
      },
      {
        key: 'announcements',
        type: 'singleselect',
        label: 'Announcing Baby\'s Arrival',
        options: [
          'We will call/text family ourselves',
          'Support person can make calls',
          'Please help us notify family',
          'Private - we will announce later',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 8: NEWBORN CARE PREFERENCES
  // ============================================
  newborn_care: {
    description: 'Your preferences for baby\'s care after birth.',
    fields: [
      {
        key: 'babyExamLocation',
        type: 'singleselect',
        label: 'Where should baby\'s exam take place?',
        options: [
          'On my chest/beside me',
          'In the warmer with parent present',
          'In nursery (if required)',
          'Whatever is standard',
        ],
      },
      {
        key: 'delayedBathing',
        type: 'singleselect',
        label: 'Baby\'s First Bath',
        options: [
          'Delay 24+ hours',
          'Delay 8-12 hours',
          'After initial bonding period',
          'Parent wants to give first bath',
          'Standard hospital timing',
        ],
      },
      {
        key: 'vernixCleaning',
        type: 'singleselect',
        label: 'Vernix (White Coating)',
        options: [
          'Leave on - let it absorb naturally',
          'Gently wipe off',
          'Standard cleaning',
        ],
      },
      {
        key: 'eyeOintment',
        type: 'singleselect',
        label: 'Eye Prophylaxis (Erythromycin)',
        options: [
          'Yes, administer',
          'Delay 1 hour for bonding',
          'Decline (discuss with provider)',
          'Follow hospital protocol',
        ],
      },
      {
        key: 'vitaminK',
        type: 'singleselect',
        label: 'Vitamin K',
        options: [
          'Yes, injection',
          'Oral vitamin K',
          'Decline (discuss with provider)',
          'Follow hospital protocol',
        ],
      },
      {
        key: 'hepatitisB',
        type: 'singleselect',
        label: 'Hepatitis B Vaccine',
        options: [
          'Yes, administer before discharge',
          'Delay until pediatrician visit',
          'Decline (discuss with provider)',
          'Still deciding',
        ],
      },
      {
        key: 'circumcision',
        type: 'singleselect',
        label: 'Circumcision (if applicable)',
        options: [
          'Yes, during hospital stay',
          'Yes, with pediatrician later',
          'No circumcision',
          'Not applicable',
        ],
      },
      {
        key: 'feedingPlan',
        type: 'singleselect',
        label: 'Feeding Plan',
        options: [
          'Exclusive breastfeeding',
          'Breastfeeding with supplementation if needed',
          'Formula feeding',
          'Combination feeding',
          'Still deciding',
        ],
      },
      {
        key: 'pacifierUse',
        type: 'singleselect',
        label: 'Pacifier Use',
        options: [
          'No pacifiers',
          'Okay after breastfeeding established',
          'Okay from the start',
          'As needed for procedures',
        ],
      },
      {
        key: 'roomingIn',
        type: 'singleselect',
        label: 'Rooming In',
        options: [
          'Baby stays with me 24/7',
          'Baby goes to nursery at night',
          'Flexible based on my needs',
        ],
      },
    ],
  },

  // ============================================
  // SECTION 9: OTHER IMPORTANT CONSIDERATIONS
  // ============================================
  other_considerations: {
    description: 'Any additional preferences, cultural or religious considerations, or special circumstances.',
    fields: [
      {
        key: 'culturalReligious',
        type: 'textarea',
        label: 'Cultural or Religious Considerations',
        placeholder: 'Any cultural, spiritual, or religious practices you would like honored...',
      },
      {
        key: 'previousBirthExperience',
        type: 'textarea',
        label: 'Previous Birth Experiences to Consider',
        placeholder: 'Any experiences from previous births that inform your preferences...',
      },
      {
        key: 'anxietiesConcerns',
        type: 'textarea',
        label: 'Special Anxieties or Concerns',
        placeholder: 'Anything your care team should know about your anxieties or fears...',
      },
      {
        key: 'medicalConditions',
        type: 'textarea',
        label: 'Medical Conditions or Allergies',
        placeholder: 'Any relevant medical conditions, allergies, or medications...',
      },
      {
        key: 'emergencyContact',
        type: 'text',
        label: 'Emergency Contact (besides partner)',
        placeholder: 'Name and phone number',
      },
      {
        key: 'additionalNotes',
        type: 'textarea',
        label: 'Anything Else Your Care Team Should Know',
        placeholder: 'Any other preferences, wishes, or information...',
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
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
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
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.xs,
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
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.xs,
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
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    flex: 1,
  },
});
