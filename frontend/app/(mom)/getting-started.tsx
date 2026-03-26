import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '../../src/components/Icon';
import { useAuthStore } from '../../src/store/authStore';
import { SIZES, FONTS } from '../../src/constants/theme';
import { useColors, createThemedStyles, ThemeColors } from '../../src/hooks/useThemedStyles';

// Birth photos
const PHOTOS = {
  hero: require('../../assets/images/hero-newborn.jpg'),
  team: require('../../assets/images/water-birth-team.jpg'),
  family: require('../../assets/images/family-moment.jpg'),
};

interface QuickStartItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: string;
  route: string;
}

const getMomQuickStart = (colors: ThemeColors): QuickStartItem[] => [
  {
    id: 'birth-plan',
    title: 'Create Your Birth Plan',
    description: 'Build a personalized plan that captures your preferences for labor, delivery, and postpartum care.',
    icon: 'document-text',
    color: colors.secondary,
    action: 'Start My Plan',
    route: '/(mom)/birth-plan',
  },
  {
    id: 'find-providers',
    title: 'Find Your Birth Team',
    description: 'Search for experienced doulas and midwives in your area who align with your birth vision.',
    icon: 'people',
    color: colors.primary,
    action: 'Browse Providers',
    route: '/(mom)/marketplace',
  },
  {
    id: 'share-plan',
    title: 'Share Your Plan',
    description: 'Once your birth plan is ready, share it with your doula, midwife, or hospital for seamless communication.',
    icon: 'share-social',
    color: colors.accent,
    action: 'Share Plan',
    route: '/(mom)/share-birth-plan',
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
  const MOM_QUICK_START = getMomQuickStart(colors);
  const router = useRouter();
  const { user } = useAuthStore();
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  
  const handleNavigate = (route: string) => {
    router.push(route as any);
  };
  
  return (
    <View style={styles.container}>
      {/* Hero Section with Photo */}
      <ImageBackground
        source={PHOTOS.hero}
        style={styles.heroSection}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(159, 131, 182, 0.5)',
            'rgba(254, 252, 255, 0.9)',
            colors.background,
          ]}
          locations={[0, 0.6, 1]}
          style={styles.heroGradient}
        >
          <SafeAreaView edges={['top']}>
            {/* Back Button */}
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              // @ts-ignore
              onClick={Platform.OS === 'web' ? () => router.back() : undefined}
              data-testid="back-btn"
            >
              <Icon name="arrow-back" size={24} color={colors.text} />
            </Pressable>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hi, {user?.full_name?.split(' ')[0] || 'there'}!</Text>
          <Text style={styles.title}>Getting Started</Text>
          <Text style={styles.subtitle}>
            Here's everything you need to make the most of your True Joy Birthing experience.
          </Text>
        </View>
        
        {/* Quick Start Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
          
          {MOM_QUICK_START.map((item, index) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.quickStartCard,
                pressed && styles.cardPressed,
              ]}
              onPress={() => handleNavigate(item.route)}
              // @ts-ignore
              onClick={Platform.OS === 'web' ? () => handleNavigate(item.route) : undefined}
              data-testid={`quick-start-${item.id}`}
            >
              {/* Step Number */}
              <View style={[styles.stepNumber, { backgroundColor: item.color + '20' }]}>
                <Text style={[styles.stepNumberText, { color: item.color }]}>{index + 1}</Text>
              </View>
              
              {/* Content */}
              <View style={styles.quickStartContent}>
                <View style={styles.quickStartHeader}>
                  <Icon name={item.icon as any} size={22} color={item.color} />
                  <Text style={styles.quickStartTitle}>{item.title}</Text>
                </View>
                <Text style={styles.quickStartDescription}>{item.description}</Text>
                
                {/* Action Button */}
                <View style={[styles.actionButton, { backgroundColor: item.color }]}>
                  <Text style={styles.actionButtonText}>{item.action}</Text>
                  <Icon name="arrow-forward" size={16} color="#FFFFFF" />
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
              <View key={index} style={styles.tipCard}>
                <View style={styles.tipIconContainer}>
                  <Icon name={tip.icon as any} size={20} color={colors.primary} />
                </View>
                <View style={styles.tipContent}>
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
            style={({ pressed }) => [
              styles.helpCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push('/tutorial?role=MOM')}
            // @ts-ignore
            onClick={Platform.OS === 'web' ? () => router.push('/tutorial?role=MOM') : undefined}
          >
            <Icon name="play-circle" size={32} color={colors.primary} />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Watch App Tour</Text>
              <Text style={styles.helpDescription}>A quick walkthrough of all the features</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </Pressable>
          
          <Pressable
            style={({ pressed }) => [
              styles.helpCard,
              pressed && styles.cardPressed,
            ]}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open('mailto:support@truejoybirthing.com', '_blank');
              }
            }}
            // @ts-ignore
            onClick={Platform.OS === 'web' ? () => window.open('mailto:support@truejoybirthing.com', '_blank') : undefined}
          >
            <Icon name="mail" size={32} color={colors.accent} />
            <View style={styles.helpContent}>
              <Text style={styles.helpTitle}>Contact Support</Text>
              <Text style={styles.helpDescription}>We're here to help with any questions</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.textLight} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroSection: {
    height: 180,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroGradient: {
    flex: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: SIZES.md,
    marginTop: SIZES.sm,
  },
  scrollView: {
    flex: 1,
    marginTop: 120,
  },
  scrollContent: {
    paddingHorizontal: SIZES.md,
    paddingBottom: 120,
  },
  header: {
    marginBottom: SIZES.xl,
  },
  greeting: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  section: {
    marginBottom: SIZES.xl,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: colors.text,
    marginBottom: SIZES.md,
  },
  quickStartCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    marginBottom: SIZES.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#4A3B4E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  stepNumberText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
  },
  quickStartContent: {
    flex: 1,
  },
  quickStartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    marginBottom: 6,
  },
  quickStartTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.text,
  },
  quickStartDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: SIZES.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs + 2,
    borderRadius: SIZES.radiusFull,
    gap: 6,
  },
  actionButtonText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tipsContainer: {
    backgroundColor: colors.primary + '08',
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary + '15',
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.sm,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tipDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    marginBottom: SIZES.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  helpContent: {
    flex: 1,
    marginLeft: SIZES.md,
  },
  helpTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: colors.text,
  },
  helpDescription: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
  },
}));
