import { COLORS } from './theme';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor?: string;
  tips?: string[];
}

export const MOM_TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to True Joy\nBirthing',
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
      'Your preferences|Ready to share with your team',
      'Every section matters|Take your time, save anytime',
      'Built around your week|Updates as your due date nears',
    ],
  },
  {
    id: 'timeline',
    title: 'Track Your Journey',
    description: 'Follow your pregnancy week by week with helpful milestones, tips, and reminders tailored to your due date.',
    icon: 'calendar',
    iconColor: COLORS.accent,
    tips: [
      "Your baby's growth|A tip picked for your exact week",
      'Milestones and reminders|Tailored to your due date',
      'Appointments|Add your own events and visits',
    ],
  },
  {
    id: 'wellness',
    title: 'Wellness Check-ins',
    description: 'Track your physical and emotional wellbeing throughout your pregnancy. Your feelings matter!',
    icon: 'heart-circle',
    iconColor: COLORS.secondary,
    tips: [
      'Daily check-ins|Mood and energy, tracked gently',
      'Sleep quality|Notice patterns over time',
      'Your trends|See how you have been feeling',
    ],
  },
  {
    id: 'find-team',
    title: 'Find Your Care Team',
    description: 'Browse our marketplace to discover and connect with experienced doulas, midwives and other birthing professionals in your area.',
    icon: 'people',
    iconColor: COLORS.roleDoula,
    tips: [
      'Search nearby|Filter by location and services',
      'Real experience|View provider profiles',
      'Say hello|Message providers directly',
    ],
  },
  {
    id: 'messaging',
    title: 'Stay Connected',
    description: 'Communicate directly with your care providers through our built-in messaging system.',
    icon: 'chatbubbles',
    iconColor: COLORS.primary,
    tips: [
      'Your team chat|Message everyone in one place',
      'Ask anything|Questions answered anytime',
      'Share updates|Keep your team close',
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
      'Practice at a glance|Clients, contracts, tasks',
      'Quick actions|Common work in one tap',
      'Nothing slips|Pending items surfaced',
    ],
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Keep track of all your clients, their due dates, and their journey from initial contact to postpartum.',
    icon: 'people',
    iconColor: COLORS.roleDoula,
    tips: [
      'Detailed profiles|Due dates, stories, needs',
      'Status and progress|From contact to postpartum',
      'Birth plans|Shared with their care team',
    ],
  },
  {
    id: 'contracts',
    title: 'Contracts & E-Signatures',
    description: 'Create, send, and manage contracts digitally. Clients can sign electronically for a seamless experience.',
    icon: 'create',
    iconColor: COLORS.primary,
    tips: [
      'Custom templates|Create contracts once, reuse',
      'Shareable links|Clients sign electronically',
      'Live status|Track every signature',
    ],
  },
  {
    id: 'invoices',
    title: 'Easy Invoicing',
    description: 'Generate professional invoices and keep track of payments with our simple invoicing system.',
    icon: 'receipt',
    iconColor: COLORS.accent,
    tips: [
      'Itemized invoices|Professional and clear',
      'Payment tracking|Know what is paid and due',
      'Gentle reminders|Send follow-ups in a tap',
    ],
  },
  {
    id: 'messaging',
    title: 'Client Communication',
    description: 'Message your clients directly and keep all your conversations organized in one secure place.',
    icon: 'chatbubbles',
    iconColor: COLORS.roleDoula,
    tips: [
      'Real-time messaging|Answer clients instantly',
      'Stronger relationships|Support between visits',
      'Full history|Every conversation saved',
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
      'Practice at a glance|Prenatal and postpartum',
      'Visit counts|Monthly numbers, clear',
      'Quick actions|Key work in one tap',
    ],
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Maintain detailed records for each client including their pregnancy history, care preferences, and notes.',
    icon: 'people',
    iconColor: COLORS.roleMidwife,
    tips: [
      'Detailed records|History, preferences, notes',
      'Pregnancy progression|Week by week',
      'Birth plans|Always viewable',
    ],
  },
  {
    id: 'visits',
    title: 'Visit Documentation',
    description: 'Log prenatal and postpartum visits with vital signs, measurements, and clinical notes.',
    icon: 'clipboard',
    iconColor: COLORS.primary,
    tips: [
      'Vitals|BP, weight, FHR recorded',
      'Gestational age|Tracked at every visit',
      'Visit notes|Detailed and organized',
    ],
  },
  {
    id: 'birth-summaries',
    title: 'Birth Summaries',
    description: 'Create comprehensive birth summaries documenting labor, delivery, and immediate postpartum details.',
    icon: 'document',
    iconColor: COLORS.secondary,
    tips: [
      'Full documentation|Labor through postpartum',
      'Labor progression|Every stage captured',
      'Newborn details|Recorded and saved',
    ],
  },
  {
    id: 'messaging',
    title: 'Client Communication',
    description: 'Stay connected with your clients through secure messaging. Answer questions and provide support anytime.',
    icon: 'chatbubbles',
    iconColor: COLORS.roleMidwife,
    tips: [
      'Secure messaging|Private by design',
      'Quick responses|Answer questions anytime',
      'Trust|Built between visits',
    ],
  },
];
