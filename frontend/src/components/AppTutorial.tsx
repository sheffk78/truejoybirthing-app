import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from './Button';
import { SIZES, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';
import {
  SprigOne,
  SprigTiny,
  SprigBud,
  DocList,
  TwoFigures,
  SAGE,
  ROSE,
  LAV,
  ORGANIC_ICONS,
  type IconProps,
} from './OrganicIcons';
import type { TutorialStep } from '../constants/tutorialData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AppTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
  roleColor?: string;
  roleName?: string;
}

// Organic icon per step id — the approved card vocabulary (auth-screens-5 Quick Tour)
const STEP_ICONS: Record<string, React.ComponentType<IconProps>> = {
  welcome: SprigBud,
  'birth-plan': DocList,
  timeline: SprigTiny,
  wellness: SprigOne,
  'find-team': TwoFigures,
  messaging: TwoFigures,
  dashboard: SprigTiny,
  clients: TwoFigures,
  contracts: DocList,
  invoices: DocList,
  visits: DocList,
  'birth-summaries': DocList,
};

const STEP_ICON_COLORS: Record<string, string> = {
  'birth-plan': ROSE,
  'find-team': LAV,
  messaging: LAV,
  clients: LAV,
};

export default function AppTutorial({
  steps,
  onComplete,
  onSkip,
  roleColor,
  roleName = 'User',
}: AppTutorialProps) {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const activeRoleColor = roleColor || colors.primary;
  const step = steps[currentStep];
  const organic = step ? STEP_ICONS[step.id] || ORGANIC_ICONS[step.icon] || SprigBud : SprigBud;
  const organicColor = (step && STEP_ICON_COLORS[step.id]) || activeRoleColor;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 0.35, duration: 150, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = onSkip;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Overline */}
      <View style={styles.overlineRow}>
        <Text style={[styles.overline, { color: colors.textLight }]}>QUICK TOUR</Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        <Animated.View style={[styles.stepContainer, { opacity: fadeAnim, width: SCREEN_WIDTH }]}>
          {/* Serif headline with accent tail (approved: 'Your week, |at a glance|') */}
          {step.title.includes('\n') ? (
            <Text style={[styles.headline, { color: colors.text }]}>
              {step.title.split('\n')[0]}
              {',\n'}
              <Text style={[styles.headlineAccent, { color: activeRoleColor }]}>
                {step.title.split('\n')[1]}
              </Text>
            </Text>
            ) : (
            <Text style={[styles.headline, { color: colors.text }]}>
              <Text style={[styles.headlineAccent, { color: activeRoleColor }]}>{step.title}</Text>
            </Text>
          )}

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>{step.description}</Text>

          {/* Organic icon divider — the step's vocabulary mark */}
          <View style={styles.iconRow}>
            {React.createElement(organic, { size: 44, color: organicColor })}
          </View>

          {/* What you'll see — approved card stack */}
          {step.tips && step.tips.length > 0 && (
            <View style={styles.cardsWrap}>
              <Text style={[styles.cardsHeader, { color: colors.textLight }]}>WHAT YOU'LL SEE</Text>
              {step.tips.map((tip, i) => {
                const CardIcon = i === 0 ? SprigTiny : i === 1 ? DocList : TwoFigures;
                const CardColor = i === 0 ? SAGE : i === 1 ? ROSE : LAV;
                const parts = tip.split('|');
                const t = parts[0];
                const d = parts[1] || '';
                return (
                  <View key={i} style={[styles.card, { backgroundColor: colors.surface }]}>
                    <View style={styles.cardIcon}>
                      {React.createElement(CardIcon, { size: 20, color: CardColor })}
                    </View>
                    <View style={styles.cardTextWrap}>
                      <Text style={[styles.cardTitle, { color: colors.text }]}>{t}</Text>
                      {d ? (
                        <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{d}</Text>
                      ) : null}
                    </View>
                  </View>
                  );
                })}
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Footer — approved: Next →, Skip tour, replay note */}
      <View style={styles.footer}>
        <View style={styles.dotsRow}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === currentStep ? activeRoleColor : colors.border },
              ]}
            />
          ))}
        </View>
        <Button title={currentStep < steps.length - 1 ? 'Next' : "Let's begin"} onPress={handleNext} style={styles.nextBtn} />
        <TouchableOpacity onPress={handleSkip} style={styles.skipTourBtn}>
          <Text style={[styles.skipTourText, { color: colors.textSecondary }]}>Skip tour</Text>
        </TouchableOpacity>
        <Text style={[styles.replayNote, { color: colors.textLight }]}>
          You can replay this tour anytime from your profile.
        </Text>
        <Text style={styles.srOnly}>{roleName} tour, step {currentStep + 1} of {steps.length}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlineRow: { paddingHorizontal: SIZES.lg, paddingTop: SIZES.lg },
  overline: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  scrollView: { flex: 1 },
  stepContainer: { flex: 1, paddingHorizontal: SIZES.xl, justifyContent: 'center' },
  headline: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    lineHeight: 40,
    marginBottom: SIZES.md,
  },
  headlineAccent: {
    fontFamily: FONTS.heading,
  },
  description: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    lineHeight: 24,
    marginBottom: SIZES.xl,
  },
  iconRow: { marginBottom: SIZES.xl },
  cardsWrap: {},
  cardsHeader: {
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.bodyBold,
    letterSpacing: 1.5,
    marginBottom: SIZES.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: SIZES.md },
  cardTextWrap: { flex: 1 },
  cardTitle: { fontSize: SIZES.fontMd, fontFamily: FONTS.bodyBold, marginBottom: 2 },
  cardDesc: { fontSize: SIZES.fontSm, fontFamily: FONTS.body, lineHeight: 19 },
  footer: { paddingHorizontal: SIZES.lg, paddingBottom: SIZES.lg },
  dotsRow: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: SIZES.lg },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  nextBtn: {},
  skipTourBtn: { alignSelf: 'center', padding: SIZES.sm, marginTop: SIZES.xs },
  skipTourText: { fontSize: SIZES.fontSm, fontFamily: FONTS.body },
  replayNote: {
    textAlign: 'center',
    fontSize: SIZES.fontXs,
    fontFamily: FONTS.body,
    marginTop: SIZES.sm,
  },
  srOnly: { height: 0, opacity: 0 },
});