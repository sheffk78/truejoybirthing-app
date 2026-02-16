import { TutorialStep } from '../components/AppTutorial';
import { COLORS } from './theme';

export const MOM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to True Joy Birthing',
    description: 'Your personal companion for creating the birth experience you envision. Let us show you around!',
    icon: 'heart',
    iconColor: COLORS.secondary,
  },
  {
    id: 'birth-plan',
    title: 'Create Your Birth Plan',
    description: 'Build a comprehensive, personalized birth plan that covers everything from labor preferences to postpartum care.',
    icon: 'document-text',
    iconColor: COLORS.primary,
    tips: [
      'Take your time with each section',
      'You can save and return anytime',
      'Share your plan with your care team',
    ],
  },
  {
    id: 'timeline',
    title: 'Track Your Journey',
    description: 'Follow your pregnancy week by week with helpful milestones, tips, and reminders tailored to your due date.',
    icon: 'calendar',
    iconColor: COLORS.accent,
    tips: [
      'Add custom events and appointments',
      'Get weekly pregnancy updates',
      'Never miss important milestones',
    ],
  },
  {
    id: 'wellness',
    title: 'Wellness Check-ins',
    description: 'Track your physical and emotional wellbeing throughout your pregnancy. Your feelings matter!',
    icon: 'heart-circle',
    iconColor: COLORS.secondary,
    tips: [
      'Daily mood and energy tracking',
      'Sleep quality monitoring',
      'View your wellness trends over time',
    ],
  },
  {
    id: 'find-team',
    title: 'Find Your Care Team',
    description: 'Browse our marketplace to discover and connect with experienced doulas and midwives in your area.',
    icon: 'people',
    iconColor: COLORS.roleDoula,
    tips: [
      'Filter by location and services',
      'View provider profiles and experience',
      'Message providers directly',
    ],
  },
  {
    id: 'messaging',
    title: 'Stay Connected',
    description: 'Communicate directly with your care providers through our built-in messaging system.',
    icon: 'chatbubbles',
    iconColor: COLORS.primary,
    tips: [
      'Ask questions anytime',
      'Share updates with your team',
      'Keep all conversations in one place',
    ],
  },
];

export const DOULA_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome, Doula!',
    description: 'True Joy Birthing helps you manage your practice and provide exceptional support to your clients.',
    icon: 'ribbon',
    iconColor: COLORS.roleDoula,
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'Get a quick overview of your practice - active clients, pending contracts, and upcoming tasks all in one place.',
    icon: 'grid',
    iconColor: COLORS.roleDoula,
    tips: [
      'View client statistics at a glance',
      'Quick access to common actions',
      'Stay on top of pending items',
    ],
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Keep track of all your clients, their due dates, and their journey from initial contact to postpartum.',
    icon: 'people',
    iconColor: COLORS.roleDoula,
    tips: [
      'Add detailed client profiles',
      'Track client status and progress',
      'Access shared birth plans',
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts & E-Signatures',
    description: 'Create, send, and manage contracts digitally. Clients can sign electronically for a seamless experience.',
    icon: 'create',
    iconColor: COLORS.primary,
    tips: [
      'Create custom contract templates',
      'Send contracts via shareable link',
      'Track signature status',
    ],
  },
  {
    id: 'invoices',
    title: 'Easy Invoicing',
    description: 'Generate professional invoices and keep track of payments with our simple invoicing system.',
    icon: 'receipt',
    iconColor: COLORS.accent,
    tips: [
      'Create itemized invoices',
      'Track payment status',
      'Send invoice reminders',
    ],
  },
  {
    id: 'messaging',
    title: 'Client Communication',
    description: 'Message your clients directly and keep all your conversations organized in one secure place.',
    icon: 'chatbubbles',
    iconColor: COLORS.roleDoula,
    tips: [
      'Real-time messaging',
      'Build strong client relationships',
      'Keep conversation history',
    ],
  },
];

export const MIDWIFE_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome, Midwife!',
    description: 'True Joy Birthing streamlines your practice management so you can focus on providing excellent care.',
    icon: 'medkit',
    iconColor: COLORS.roleMidwife,
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'See your practice at a glance - prenatal clients, recent visits, and birth statistics all in one view.',
    icon: 'grid',
    iconColor: COLORS.roleMidwife,
    tips: [
      'Track prenatal and postpartum clients',
      'Monitor monthly visit counts',
      'Quick access to key actions',
    ],
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Maintain detailed records for each client including their pregnancy history, care preferences, and notes.',
    icon: 'people',
    iconColor: COLORS.roleMidwife,
    tips: [
      'Comprehensive client profiles',
      'Track pregnancy progression',
      'View client birth plans',
    ],
  },
  {
    id: 'visits',
    title: 'Visit Documentation',
    description: 'Log prenatal and postpartum visits with vital signs, measurements, and clinical notes.',
    icon: 'clipboard',
    iconColor: COLORS.primary,
    tips: [
      'Record vitals: BP, weight, FHR',
      'Track gestational age',
      'Add detailed visit notes',
    ],
  },
  {
    id: 'birth-summaries',
    title: 'Birth Summaries',
    description: 'Create comprehensive birth summaries documenting labor, delivery, and immediate postpartum details.',
    icon: 'document',
    iconColor: COLORS.secondary,
    tips: [
      'Complete birth documentation',
      'Record labor progression',
      'Document newborn details',
    ],
  },
  {
    id: 'messaging',
    title: 'Client Communication',
    description: 'Stay connected with your clients through secure messaging. Answer questions and provide support anytime.',
    icon: 'chatbubbles',
    iconColor: COLORS.roleMidwife,
    tips: [
      'Secure messaging platform',
      'Respond to client questions',
      'Build trusting relationships',
    ],
  },
];
