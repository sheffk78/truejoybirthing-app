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
      >
        <View style={[styles.radio, value === option && styles.radioSelected]}>
          {value === option && <View style={styles.radioInner} />}
        </View>
        <Text style={styles.radioLabel}>{option}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Section Form Configurations
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
  about_me: {
    description: 'Share information about yourself and your support system to help your care team understand your unique needs.',
    fields: [
      {
        key: 'supportPeople',
        type: 'textarea',
        label: 'Who will be with you during labor?',
        placeholder: 'e.g., Partner (John), Mother, Doula (Sarah)',
      },
      {
        key: 'birthExperience',
        type: 'singleselect',
        label: 'Is this your first birth?',
        options: ['Yes, this is my first baby', 'No, I have given birth before'],
      },
      {
        key: 'birthVision',
        type: 'textarea',
        label: 'Describe your ideal birth experience',
        placeholder: 'What does a positive birth experience look like to you?',
      },
      {
        key: 'fears',
        type: 'textarea',
        label: 'Any fears or concerns?',
        placeholder: 'Share any worries you have so we can address them...',
      },
      {
        key: 'specialConsiderations',
        type: 'multiselect',
        label: 'Special considerations (select all that apply)',
        options: [
          'Religious/spiritual preferences',
          'Cultural traditions to observe',
          'History of trauma',
          'Anxiety disorder',
          'Previous birth trauma',
          'Physical disability',
          'Sensory sensitivities',
          'None of the above',
        ],
      },
      {
        key: 'allergies',
        type: 'textarea',
        label: 'Allergies or medical conditions',
        placeholder: 'List any allergies or conditions your team should know about...',
      },
    ],
  },
  
  labor_delivery: {
    description: 'Share your preferences for the labor and delivery process. Remember, flexibility is key as birth can be unpredictable.',
    fields: [
      {
        key: 'laborEnvironment',
        type: 'multiselect',
        label: 'Labor environment preferences',
        options: [
          'Dim lighting',
          'Music playing',
          'Quiet/minimal talking',
          'Freedom to move around',
          'Access to shower/tub',
          'Aromatherapy',
          'Limited visitors',
          'Door kept closed',
        ],
      },
      {
        key: 'laborPositions',
        type: 'multiselect',
        label: 'Positions you\'d like to try during labor',
        options: [
          'Walking/standing',
          'Sitting on birth ball',
          'Hands and knees',
          'Side-lying',
          'Squatting',
          'In the shower/tub',
          'Whatever feels right in the moment',
        ],
      },
      {
        key: 'hydration',
        type: 'singleselect',
        label: 'Food and drink during labor',
        options: [
          'I want to eat and drink as desired',
          'Clear liquids only is fine',
          'Ice chips only is fine',
          'I\'ll follow my provider\'s recommendation',
        ],
      },
      {
        key: 'cervicalChecks',
        type: 'singleselect',
        label: 'Cervical checks',
        options: [
          'Minimal - only when necessary',
          'Regular intervals are fine',
          'I\'d prefer to decline unless medically needed',
          'Provider\'s discretion',
        ],
      },
      {
        key: 'membraneRupture',
        type: 'singleselect',
        label: 'Artificial rupture of membranes (breaking water)',
        options: [
          'I prefer to let it happen naturally',
          'Okay to speed labor if needed',
          'Only if medically necessary',
          'Discuss with me first',
        ],
      },
    ],
  },
  
  pain_management: {
    description: 'Everyone experiences labor differently. Share your preferences for managing discomfort during labor.',
    fields: [
      {
        key: 'painPhilosophy',
        type: 'singleselect',
        label: 'Your approach to pain management',
        options: [
          'I want to try for an unmedicated birth',
          'I\'m open to medication if needed',
          'I plan to get an epidural',
          'I want to see how it goes',
        ],
      },
      {
        key: 'naturalMethods',
        type: 'multiselect',
        label: 'Non-medication comfort measures you\'d like to try',
        options: [
          'Breathing techniques',
          'Massage',
          'Hot/cold compresses',
          'Hydrotherapy (shower/tub)',
          'Birth ball',
          'Position changes',
          'Music/guided meditation',
          'TENS unit',
          'Aromatherapy',
          'Hypnobirthing techniques',
        ],
      },
      {
        key: 'medicationOptions',
        type: 'multiselect',
        label: 'Medication options you\'re open to',
        options: [
          'Epidural',
          'Nitrous oxide (laughing gas)',
          'IV pain medication',
          'Local anesthesia for stitches',
          'None - I prefer unmedicated',
        ],
      },
      {
        key: 'epiduralTiming',
        type: 'singleselect',
        label: 'If choosing epidural, when would you like it?',
        options: [
          'As early as possible',
          'When I ask for it',
          'Try natural methods first',
          'Not applicable - no epidural',
        ],
      },
      {
        key: 'painNotes',
        type: 'textarea',
        label: 'Additional notes about pain management',
        placeholder: 'Any other preferences or concerns...',
      },
    ],
  },
  
  monitoring_iv: {
    description: 'Discuss your preferences for fetal monitoring and IV access during labor.',
    fields: [
      {
        key: 'fetalMonitoring',
        type: 'singleselect',
        label: 'Fetal heart rate monitoring preference',
        options: [
          'Intermittent monitoring (allows more movement)',
          'Continuous monitoring is fine',
          'Wireless/waterproof monitor if available',
          'Follow provider\'s recommendation',
        ],
      },
      {
        key: 'ivAccess',
        type: 'singleselect',
        label: 'IV/Hep-lock preference',
        options: [
          'Hep-lock only (no continuous fluids)',
          'IV fluids are fine',
          'Prefer no IV unless necessary',
          'Provider\'s discretion',
        ],
      },
      {
        key: 'ivPlacement',
        type: 'singleselect',
        label: 'IV placement preference (if needed)',
        options: [
          'Non-dominant hand preferred',
          'Forearm if possible',
          'No preference',
        ],
      },
      {
        key: 'monitoringNotes',
        type: 'textarea',
        label: 'Additional notes',
        placeholder: 'Any other preferences about monitoring or IV...',
      },
    ],
  },
  
  induction_interventions: {
    description: 'Share your thoughts on induction methods and medical interventions if they become necessary.',
    fields: [
      {
        key: 'inductionFeelings',
        type: 'singleselect',
        label: 'If induction is recommended',
        options: [
          'I\'d like to discuss all options first',
          'I trust my provider\'s judgment',
          'I prefer to wait for natural labor if safe',
          'I\'m open to induction when the time is right',
        ],
      },
      {
        key: 'inductionMethods',
        type: 'multiselect',
        label: 'Induction methods you\'re open to',
        options: [
          'Membrane sweep',
          'Foley bulb/balloon',
          'Cervical ripening medication',
          'Pitocin',
          'Breaking water',
          'Natural methods first (walking, nipple stimulation)',
          'Discuss options when the time comes',
        ],
      },
      {
        key: 'episiotomy',
        type: 'singleselect',
        label: 'Episiotomy preference',
        options: [
          'Prefer to avoid - allow natural tearing',
          'Only if absolutely necessary',
          'Provider\'s discretion',
          'No strong preference',
        ],
      },
      {
        key: 'assistedDelivery',
        type: 'singleselect',
        label: 'If assisted delivery is needed (vacuum/forceps)',
        options: [
          'Please discuss with me first',
          'Trust provider\'s judgment in emergency',
          'Prefer cesarean over forceps',
          'No preference',
        ],
      },
      {
        key: 'cesarean',
        type: 'textarea',
        label: 'If cesarean becomes necessary, my preferences are:',
        placeholder: 'e.g., Partner present, clear drape, immediate skin-to-skin if possible...',
      },
    ],
  },
  
  pushing_safe_word: {
    description: 'Share your preferences for the pushing stage and establish a safe word if you\'d like one.',
    fields: [
      {
        key: 'pushingPosition',
        type: 'multiselect',
        label: 'Pushing positions you\'d like to try',
        options: [
          'Semi-reclined in bed',
          'Side-lying',
          'Hands and knees',
          'Squatting',
          'Using squat bar',
          'Standing/supported squat',
          'In water (if available)',
          'Whatever feels right',
        ],
      },
      {
        key: 'pushingGuidance',
        type: 'singleselect',
        label: 'Pushing guidance preference',
        options: [
          'Coach-directed (told when to push)',
          'Mother-directed (push when I feel the urge)',
          'Combination of both',
          'No preference',
        ],
      },
      {
        key: 'mirrorUse',
        type: 'singleselect',
        label: 'Would you like a mirror to see baby\'s arrival?',
        options: ['Yes', 'No', 'Maybe - ask me in the moment'],
      },
      {
        key: 'touchBaby',
        type: 'singleselect',
        label: 'Would you like to touch baby\'s head as they crown?',
        options: ['Yes', 'No', 'Maybe - ask me in the moment'],
      },
      {
        key: 'safeWord',
        type: 'text',
        label: 'Safe word (optional)',
        placeholder: 'A word that means "I need everything to stop and talk to me"',
      },
      {
        key: 'safeWordMeaning',
        type: 'textarea',
        label: 'What should happen when you use your safe word?',
        placeholder: 'e.g., Everyone stops, room gets quiet, partner checks in with me...',
      },
    ],
  },
  
  post_delivery: {
    description: 'Share your preferences for immediately after your baby is born.',
    fields: [
      {
        key: 'cordClamping',
        type: 'singleselect',
        label: 'Umbilical cord clamping',
        options: [
          'Delayed cord clamping (wait until cord stops pulsing)',
          'Immediate clamping is fine',
          'Provider\'s recommendation',
        ],
      },
      {
        key: 'cordCutting',
        type: 'singleselect',
        label: 'Who will cut the umbilical cord?',
        options: [
          'Partner/support person',
          'Provider',
          'Mother (me)',
          'No preference',
        ],
      },
      {
        key: 'skinToSkin',
        type: 'singleselect',
        label: 'Immediate skin-to-skin contact',
        options: [
          'Yes - place baby on my chest immediately',
          'Yes - but okay to do quick health check first',
          'Partner does skin-to-skin if I can\'t',
          'No strong preference',
        ],
      },
      {
        key: 'goldenHour',
        type: 'multiselect',
        label: 'During the first hour after birth (golden hour)',
        options: [
          'Minimize interruptions',
          'Delay routine procedures',
          'Dim lights',
          'Quiet environment',
          'Initiate breastfeeding',
          'Delay visitors',
          'Take photos/videos',
        ],
      },
      {
        key: 'placentaDelivery',
        type: 'singleselect',
        label: 'Placenta delivery',
        options: [
          'Natural/physiological delivery',
          'Active management with medication is fine',
          'Provider\'s recommendation',
        ],
      },
      {
        key: 'placentaPlans',
        type: 'multiselect',
        label: 'Placenta plans',
        options: [
          'I\'d like to see it',
          'Keep for encapsulation',
          'No special plans',
          'Hospital can dispose of it',
        ],
      },
    ],
  },
  
  newborn_care: {
    description: 'Share your preferences for your baby\'s care in the first hours and days.',
    fields: [
      {
        key: 'babyLocation',
        type: 'singleselect',
        label: 'Where should baby stay?',
        options: [
          'Room with me 24/7',
          'Nursery at night for rest',
          'Provider\'s recommendation',
          'Decide based on how I feel',
        ],
      },
      {
        key: 'feedingPlan',
        type: 'singleselect',
        label: 'Feeding plan',
        options: [
          'Breastfeeding only',
          'Breastfeeding with supplementation if needed',
          'Formula feeding',
          'Combination feeding',
          'Undecided',
        ],
      },
      {
        key: 'feedingSupport',
        type: 'multiselect',
        label: 'Feeding support needed',
        options: [
          'Lactation consultant visit',
          'Help with latching',
          'Pumping support',
          'Formula preparation guidance',
          'No assistance needed',
        ],
      },
      {
        key: 'newbornProcedures',
        type: 'multiselect',
        label: 'Newborn procedures consent',
        options: [
          'Vitamin K injection',
          'Erythromycin eye ointment',
          'Hepatitis B vaccine',
          'Hearing screening',
          'Metabolic screening (heel prick)',
          'Want to discuss each before proceeding',
        ],
      },
      {
        key: 'bathing',
        type: 'singleselect',
        label: 'First bath',
        options: [
          'Delay 24+ hours',
          'Within first few hours is fine',
          'I want to give the first bath',
          'Partner wants to give first bath',
          'No preference',
        ],
      },
      {
        key: 'circumcision',
        type: 'singleselect',
        label: 'Circumcision (if applicable)',
        options: [
          'Yes, we want circumcision',
          'No circumcision',
          'Still deciding',
          'Not applicable',
        ],
      },
      {
        key: 'pacifier',
        type: 'singleselect',
        label: 'Pacifier use',
        options: [
          'No pacifiers please',
          'Okay if needed to calm baby',
          'No preference',
        ],
      },
    ],
  },
  
  other_considerations: {
    description: 'Any additional preferences, requests, or information for your care team.',
    fields: [
      {
        key: 'photography',
        type: 'multiselect',
        label: 'Photography/Video',
        options: [
          'Professional birth photographer present',
          'Partner/support person taking photos',
          'Video recording of birth',
          'Photos of baby immediately after',
          'No photos during labor/delivery',
        ],
      },
      {
        key: 'students',
        type: 'singleselect',
        label: 'Medical students/residents',
        options: [
          'Students may be present',
          'Please ask first each time',
          'No students please',
          'No preference',
        ],
      },
      {
        key: 'visitors',
        type: 'textarea',
        label: 'Visitor preferences during labor/after birth',
        placeholder: 'Who is allowed to visit and when...',
      },
      {
        key: 'religiousCultural',
        type: 'textarea',
        label: 'Religious or cultural practices',
        placeholder: 'Any ceremonies, prayers, or traditions you\'d like to observe...',
      },
      {
        key: 'music',
        type: 'text',
        label: 'Music preferences',
        placeholder: 'Playlist name, genre, or specific requests...',
      },
      {
        key: 'otherRequests',
        type: 'textarea',
        label: 'Any other requests or information',
        placeholder: 'Anything else you\'d like your care team to know...',
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
