import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  Animated,
  Easing,
  Platform,
  ImageBackground,
} from 'react-native';

import { Icon } from './Icon';
import { SIZES, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';
import { SprigTwo, DocList, TwoFigures, SAGE, ROSE, LAV } from './OrganicIcons';
import CreamFade from './CreamFade';

// ─────────────────────────────────────────────────────────────────────
// OnboardingWalkthrough — v2 (approved mock 2026-09-16, Jeff verdict
// msg 1549840227433062421: "The 2nd page with step 1 of 3 is great")
// ─────────────────────────────────────────────────────────────────────
// v2 layout changes (matches screen-walkthrough.png):
//   • Photo is full-bleed and taller (62% of screen) with the content
//     card overlapping INTO the photo's cream fade — kills the white
//     gap Jeff flagged. Card is transparent; text sits in the fade.
//   • Step chip = "STEP N OF 3" with a sprig accent, transparent bg.
//   • Serif headline with rose/lavender accent phrase.
//   • Slide-enter animation: content fades + rises as each slide
//     becomes active (native driver, 420ms).
// Press feedback (approved animation spec): buttons scale 0.97 on
// press; dots grow 8→24 and color-shift per slide.
// ─────────────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  /** Highlighted tail phrase rendered in the slide's accent color */
  accentTail: string;
  description: string;
  icon: string;
  colorKey: 'secondary' | 'primary' | 'accent';
  image: number;
}

interface OnboardingWalkthroughProps {
  role: 'MOM' | 'DOULA' | 'MIDWIFE' | 'LACTATION';
  onComplete: () => void;
}

// Birth photos - bundled locally
const BIRTH_PHOTOS = {
  skinToSkin: require('../../assets/images/hero-skin-to-skin.jpg'),
  waterBirth1: require('../../assets/images/hero-water-birth-2.jpg'),
  waterBirth2: require('../../assets/images/hero-water-birth.jpg'),
  familyMoment: require('../../assets/images/hero-family-moment.jpg'),
  newbornSleeping: require('../../assets/images/hero-newborn-sleeping.jpg'),
};

const STEPS_BY_ROLE: Record<string, OnboardingStep[]> = {
  MOM: [
    {
      id: '1',
      title: 'Create Your',
      accentTail: 'Birth Plan',
      description: 'Build a personalized birth plan that captures your preferences, values, and wishes for your special day.',
      icon: 'document-text',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.familyMoment,
    },
    {
      id: '2',
      title: 'Build Your',
      accentTail: 'Birth Team',
      description: 'Find and connect with experienced doulas, midwives and other birthing professionals in your area who align with your vision.',
      icon: 'people-circle',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.waterBirth2,
    },
    {
      id: '3',
      title: 'Experience Your',
      accentTail: 'Journey',
      description: 'Track your wellness, celebrate milestones, and stay connected with your care team throughout pregnancy.',
      icon: 'heart-circle',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.skinToSkin,
    },
  ],
  DOULA: [
    {
      id: '1',
      title: 'Complete Your',
      accentTail: 'Profile',
      description: 'Showcase your experience, certifications, and philosophy to help moms find the perfect match.',
      icon: 'person-circle',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.waterBirth2,
    },
    {
      id: '2',
      title: 'Manage Your',
      accentTail: 'Clients',
      description: 'Keep track of your clients, appointments, contracts, and invoices all in one place.',
      icon: 'briefcase',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.familyMoment,
    },
    {
      id: '3',
      title: 'Support',
      accentTail: 'Birth Plans',
      description: "Review and contribute to your clients' birth plans, adding your professional insights.",
      icon: 'document-text',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.skinToSkin,
    },
  ],
  MIDWIFE: [
    {
      id: '1',
      title: 'Set Up Your',
      accentTail: 'Practice',
      description: 'Add your credentials, services, and availability so expecting families can find you.',
      icon: 'medkit',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.waterBirth1,
    },
    {
      id: '2',
      title: 'Track',
      accentTail: 'Client Care',
      description: 'Log prenatal visits, monitor health metrics, and maintain comprehensive care records.',
      icon: 'clipboard',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.familyMoment,
    },
    {
      id: '3',
      title: 'Guide',
      accentTail: 'Birth Journeys',
      description: 'Review birth preferences and help clients make informed decisions about their care.',
      icon: 'heart-half',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.newbornSleeping,
    },
  ],
  LACTATION: [
    {
      id: '1',
      title: 'Complete Your',
      accentTail: 'Profile',
      description: 'Showcase your credentials, services, and availability to help families find the right lactation support.',
      icon: 'water',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.newbornSleeping,
    },
    {
      id: '2',
      title: 'Manage Your',
      accentTail: 'Clients',
      description: 'Track consultations, follow-up visits, contracts, and invoices all in one place.',
      icon: 'briefcase',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.familyMoment,
    },
    {
      id: '3',
      title: 'Support',
      accentTail: 'Feeding Journeys',
      description: 'Review birth plans and contribute your lactation expertise to help families reach their feeding goals.',
      icon: 'heart-circle',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.skinToSkin,
    },
  ],
};

// Cream canvas tone baked for the photo-fade blend (matches theme background)
const CREAM = '#FAF8F5';
// Height of the transparent content card that overlaps into the photo fade
const CONTENT_RISE = 72;

export default function OnboardingWalkthrough({ role, onComplete }: OnboardingWalkthroughProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const colors = useColors();

  // Per-slide enter animation: fade + rise when a slide becomes current
  const enterAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentIndex, enterAnim]);

  const enterTranslate = enterAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  const steps = STEPS_BY_ROLE[role] || STEPS_BY_ROLE.MOM;

  // Map colorKey to actual colors
  const getStepColor = (colorKey: 'secondary' | 'primary' | 'accent') => {
    switch(colorKey) {
      case 'secondary': return colors.secondary;
      case 'primary': return colors.primary;
      case 'accent': return colors.accent;
      default: return colors.primary;
    }
  };

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => {
    const stepColor = getStepColor(item.colorKey);
    const isCurrent = index === currentIndex;

    return (
      <View style={styles.stepContainer}>
        {/* Full-bleed photo — tall, bleeding under the content card */}
        <View style={styles.photoContainer}>
          <ImageBackground
            source={item.image}
            style={styles.stepImage}
            resizeMode="cover"
          >
            {/* Color wash from the slide's accent */}
            <View style={[styles.photoGradient, { backgroundColor: `${stepColor}26` }]} />
            {/* Cream fade at the photo's bottom edge — text begins here */}
            <CreamFade height={150} />
          </ImageBackground>
        </View>

        {/* Content card — transparent, rises INTO the photo fade */}
        <View style={styles.stepContent}>
          <Animated.View
            style={[
              styles.stepContentInner,
              isCurrent
                ? { opacity: enterAnim, transform: [{ translateY: enterTranslate }] }
                : { opacity: 0.35 },
            ]}
          >
            {/* Step chip: organic icon + STEP N OF 3 */}
            <View style={styles.stepChip}>
              {item.icon === 'document-text' ? (
                <DocList size={15} color={ROSE} />
              ) : item.icon === 'people-circle' ? (
                <TwoFigures size={15} color={LAV} />
              ) : (
                <SprigTwo size={15} color={SAGE} opacity={0.85} />
              )}
              <Text style={[styles.stepChipText, { color: stepColor }]}>
                STEP {index + 1} OF {steps.length}
              </Text>
            </View>

            {/* Sprig divider */}
            <View style={styles.sprigDivider}>
              <View style={[styles.sprigLine, { backgroundColor: `${stepColor}55` }]} />
              <Text style={[styles.sprigGlyph, { color: stepColor }]}>❧</Text>
              <View style={[styles.sprigLine, { backgroundColor: `${stepColor}55` }]} />
            </View>

            {/* Serif headline with accent tail */}
            <Text style={styles.stepTitle}>
              {item.title}{' '}
              <Text style={[styles.stepTitleAccent, { color: stepColor }]}>{item.accentTail}</Text>
            </Text>

            {/* Description */}
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {item.description}
            </Text>
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {steps.map((step, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];

        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });

        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                width: dotWidth,
                opacity,
                backgroundColor: getStepColor(steps[currentIndex]?.colorKey || 'primary'),
              },
            ]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip Button */}
      <Pressable
        style={({ pressed }) => [styles.skipButton, pressed && { opacity: 0.6 }]}
        onPress={handleSkip}
        // @ts-ignore - onClick for web compatibility
        onClick={Platform.OS === 'web' ? handleSkip : undefined}
        data-testid="onboarding-skip-btn"
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip ahead</Text>
      </Pressable>

      {/* Steps Carousel */}
      <FlatList
        ref={flatListRef}
        data={steps}
        renderItem={renderStep}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Dots */}
      {renderDots()}

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.continueButton,
            { backgroundColor: getStepColor(steps[currentIndex]?.colorKey || 'primary') },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNext}
          // @ts-ignore - onClick for web compatibility
          onClick={Platform.OS === 'web' ? handleNext : undefined}
          data-testid="onboarding-continue-btn"
        >
          <Text style={styles.continueText}>
            {currentIndex === steps.length - 1 ? 'Set up my profile' : 'Continue'}
          </Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: SIZES.lg,
    zIndex: 10,
    padding: SIZES.sm,
  },
  skipText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
  stepContainer: {
    width: width,
    flex: 1,
  },
  photoContainer: {
    ...StyleSheet.absoluteFillObject,
    height: height * 0.62, // approved v2: taller photo, content overlaps its fade
    zIndex: 0,
  },
  stepImage: {
    flex: 1,
  },
  photoGradient: {
    flex: 1,
  },
  // Cream blend strip: photo melts into the canvas where text begins
  photoCreamFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
    backgroundColor: CREAM,
    opacity: 0.9,
  },
  stepContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: height * 0.62 - CONTENT_RISE, // card overlaps INTO the photo's fade
    bottom: 0,
    paddingHorizontal: SIZES.xl,
    alignItems: 'center',
    zIndex: 2,
  },
  stepContentInner: {
    alignItems: 'center',
    width: '100%',
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.xs,
    marginBottom: SIZES.sm,
  },
  stepChipText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  sprigDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
    marginBottom: SIZES.md,
  },
  sprigLine: {
    width: 28,
    height: 1.5,
    borderRadius: 1,
  },
  sprigGlyph: {
    fontSize: 14,
  },
  stepTitle: {
    fontSize: 30,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    textAlign: 'center',
    color: '#2A2A2A',
    marginBottom: SIZES.sm,
  },
  stepTitleAccent: {
    color: '#B87AA0', // overridden inline per-slide
  },
  stepDescription: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: SIZES.sm,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.xs,
    marginBottom: SIZES.lg,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: SIZES.lg,
    paddingBottom: SIZES.xxl,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.md + 2,
    borderRadius: SIZES.radiusFull,
    gap: SIZES.sm,
  },
  continueText: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.97 }],
  },
});