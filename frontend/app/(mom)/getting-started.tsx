import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../src/components/Icon';
import HBand from '../../src/components/mom/HBand';
import { useAuthStore } from '../../src/store/authStore';
import { SIZES } from '../../src/constants/theme';
import { C, F, kickerStyle } from '../../src/constants/corpus';
import { useColors } from '../../src/hooks/useThemedStyles';

const DF = F;

// Birth photos - bundled locally
const PHOTOS = {
  hero: require('../../assets/images/hero-newborn-sleeping.jpg'),
  team: require('../../assets/images/hero-water-birth.jpg'),
  family: require('../../assets/images/hero-family-moment.jpg'),
};

interface QuickStartItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: string;
  route: string;
  chipBg: string;
  chipFg: string;
}

// Approved chip accents distributed across the three steps (s7 schip vocabulary)
const getMomQuickStart = (): QuickStartItem[] => [
  {
    id: 'birth-plan',
    title: 'Create Your Birth Plan',
    description: 'Build a personalized plan that captures your preferences for labor, delivery, and postpartum care.',
    icon: 'document-text',
    action: 'Start My Plan',
    route: '/(mom)/birth-plan',
    chipBg: C.lavenderBg,
    chipFg: C.lavender,
  },
  {
    id: 'find-providers',
    title: 'Find Your Birth Team',
    description: 'Search for experienced doulas, midwives and other birthing professionals in your area who align with your birth vision.',
    icon: 'people',
    action: 'Browse Providers',
    route: '/(mom)/marketplace',
    chipBg: C.roseBg,
    chipFg: C.rose,
  },
  {
    id: 'share-plan',
    title: 'Share Your Plan',
    description: 'Once your birth plan is ready, share it with your doula, midwife, or hospital for seamless communication.',
    icon: 'share-social',
    action: 'Share Plan',
    route: '/(mom)/share-birth-plan',
    chipBg: C.sageBg,
    chipFg: C.sage,
  },
];

const TIPS = [
  {
    icon: 'bulb',
    title: 'Watch the Video Guides',
    description: 'Each birth plan section has a helpful video explaining what to consider.',
  },
  {
    icon: 'chatbubbles',
    title: 'Message Your Team',
    description: 'Once connected with a provider, use in-app messaging to stay in touch.',
  },
  {
    icon: 'calendar',
    title: 'Track Your Timeline',
    description: 'View your pregnancy timeline and important milestones on the Home screen.',
  },
];

export default function GettingStartedScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const MOM_QUICK_START = getMomQuickStart();
  const router = useRouter();
  const { user } = useAuthStore();
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  // expandedTip retained for behavior parity (tips expand on tap in a future pass)
  void expandedTip;
  void setExpandedTip;

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  const goBack = () => {
    router.canGoBack() ? router.back() : router.replace('/');
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Back affordance (m17 ghost chevron on cream) */}
        <Pressable
          style={styles.backButton}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          // @ts-ignore
          onClick={Platform.OS === 'web' ? goBack : undefined}
          testID="back-btn"
        >
          <Icon name="chevron-back" size={18} color={C.ink} />
        </Pressable>

        {/* Header on cream (batch-1 anatomy: overline → serif title → subtitle) */}
        <View style={styles.header}>
          <Text style={styles.overline}>Start Here</Text>
          <Text style={styles.title}>
            Getting <Text style={styles.titleAccent}>Started</Text>
          </Text>
          <Text style={styles.subtitle}>
            Hi, {user?.full_name?.split(' ')[0] || 'there'} — here's everything you need to
            make the most of your True Joy Birthing experience.
          </Text>
        </View>

        {/* Hero — photo band inside rounded hairline card (batch-1 anchorCard vocabulary) */}
        <View style={styles.heroCard}>
          <HBand source={PHOTOS.hero} height={150} focus="50% 30%" />
        </View>

        {/* Quick Start Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Start</Text>

          {MOM_QUICK_START.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.srow,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleNavigate(item.route)}
              // @ts-ignore
              onClick={Platform.OS === 'web' ? () => handleNavigate(item.route) : undefined}
              data-testid={`quick-start-${item.id}`}
            >
              <View style={[styles.sico, { backgroundColor: item.chipBg }]}>
                <Icon name={item.icon as any} size={18} color={item.chipFg} />
              </View>
              <View style={styles.mid}>
                <View style={styles.srowHead}>
                  <Text style={styles.srowTitle}>{item.title}</Text>
                  <View style={styles.schip}>
                    <Text style={[styles.schipText, { color: item.chipFg }]}>
                      STEP {index + 1}
                    </Text>
                  </View>
                </View>
                <Text style={styles.srowDesc} numberOfLines={3}>
                  {item.description}
                </Text>
                <View style={styles.actionPill}>
                  <Text style={styles.actionText}>{item.action}</Text>
                  <Icon name="arrow-forward" size={13} color={C.lavender} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pro Tips</Text>

          <View style={styles.tipsContainer}>
            {TIPS.map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <View style={styles.sico}>
                  <Icon name={tip.icon as any} size={18} color={C.lavender} />
                </View>
                <View style={styles.mid}>
                  <Text style={styles.tipTitle}>{tip.title}</Text>
                  <Text style={styles.tipDescription}>{tip.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need More Help?</Text>

          <Pressable
            style={({ pressed }) => [styles.srow, pressed && styles.cardPressed]}
            onPress={() => router.push('/tutorial?role=MOM')}
            // @ts-ignore
            onClick={Platform.OS === 'web' ? () => router.push('/tutorial?role=MOM') : undefined}
            testID="watch-tour-btn"
          >
            <View style={[styles.sico, { backgroundColor: C.gbandMid }]}>
              <Icon name="play-circle" size={18} color={C.rose} />
            </View>
            <View style={styles.mid}>
              <Text style={styles.srowTitle}>Watch App Tour</Text>
              <Text style={styles.srowDesc} numberOfLines={1}>
                A quick walkthrough of all the features
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} color={C.chev} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.srow, pressed && styles.cardPressed]}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open('mailto:support@truejoybirthing.com', '_blank');
              }
            }}
            // @ts-ignore
            onClick={
              Platform.OS === 'web'
                ? () => window.open('mailto:support@truejoybirthing.com', '_blank')
                : undefined
            }
            testID="contact-support-btn"
          >
            <View style={styles.sico}>
              <Icon name="mail" size={18} color={C.lavender} />
            </View>
            <View style={styles.mid}>
              <Text style={styles.srowTitle}>Contact Support</Text>
              <Text style={styles.srowDesc} numberOfLines={1}>
                We're here to help with any questions
              </Text>
            </View>
            <Icon name="chevron-forward" size={16} color={C.chev} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: C.cream,
    },
    backButton: {
      alignSelf: 'flex-start',
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: SIZES.xxl,
    },
    // heroCard — photo band inside rounded hairline card (batch-1 anchorCard)
    heroCard: {
      marginTop: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 20,
      overflow: 'hidden',
    },
    header: {
      marginBottom: 6,
    },
    overline: { ...kickerStyle(C.rose), marginBottom: 5 },
    title: {
      fontSize: 26,
      lineHeight: 30,
      fontFamily: F.serif,
      fontWeight: '700',
      color: C.ink,
    },
    titleAccent: { color: C.roseSoft, fontStyle: 'italic' },
    subtitle: {
      fontSize: 12.5,
      fontFamily: F.ui,
      color: C.gray,
      lineHeight: 18,
      marginTop: 5,
    },
    section: {
      marginBottom: SIZES.xl,
    },
    sectionTitle: {
      fontSize: 21,
      fontFamily: F.serif,
      fontWeight: '700',
      color: C.ink,
      marginBottom: 8,
    },
    // srow vocabulary: white r18 hairline card (s7 .srow)
    srow: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    cardPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.99 }],
    },
    // sico vocabulary: 34px r12 icon chip
    sico: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.lavenderBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mid: { flex: 1, minWidth: 0 },
    srowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    srowTitle: {
      fontSize: 17,
      fontFamily: F.serifSemi,
      fontWeight: '600',
      color: C.ink,
      flexShrink: 1,
    },
    schip: {
      borderRadius: 999,
      paddingVertical: 2,
      paddingHorizontal: 8,
      backgroundColor: C.track,
    },
    schipText: {
      fontSize: 9.5,
      letterSpacing: 0.6,
      fontWeight: '700',
      fontFamily: F.uiBold,
      textTransform: 'uppercase',
      color: C.grayLight,
    },
    srowDesc: {
      fontSize: 12,
      fontFamily: F.ui,
      color: C.body,
      lineHeight: 17,
      marginTop: 3,
    },
    actionPill: {
      marginTop: 8,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1.3,
      borderColor: C.lavenderBorder,
      backgroundColor: C.cardBg,
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 14,
    },
    actionText: {
      fontSize: 11.5,
      fontWeight: '700',
      fontFamily: F.uiBold,
      color: C.lavender,
    },
    tipsContainer: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 18,
      paddingVertical: 4,
      paddingHorizontal: 14,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingVertical: 11,
      borderBottomWidth: 1,
      borderBottomColor: C.hairline,
    },
    tipTitle: {
      fontSize: 15,
      fontFamily: F.serifSemi,
      fontWeight: '600',
      color: C.ink,
    },
    tipDescription: {
      fontSize: 11.5,
      fontFamily: F.ui,
      color: C.gray,
      lineHeight: 16,
      marginTop: 2,
    },
  });