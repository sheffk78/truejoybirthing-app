import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import Button from './Button';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor?: string;
  tips?: string[];
}

interface AppTutorialProps {
  steps: TutorialStep[];
  onComplete: () => void;
  onSkip: () => void;
  roleColor?: string;
  roleName?: string;
}

export default function AppTutorial({
  steps,
  onComplete,
  onSkip,
  roleColor = COLORS.primary,
  roleName = 'User',
}: AppTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToStep = (index: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    setCurrentStep(index);
    scrollViewRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      goToStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      goToStep(currentStep - 1);
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newStep = Math.round(offsetX / SCREEN_WIDTH);
    if (newStep !== currentStep && newStep >= 0 && newStep < steps.length) {
      setCurrentStep(newStep);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome Tour</Text>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Dots */}
      <View style={styles.progressContainer}>
        {steps.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => goToStep(index)}
            style={[
              styles.progressDot,
              index === currentStep && { backgroundColor: roleColor, width: 24 },
            ]}
          />
        ))}
      </View>

      {/* Tutorial Steps */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {steps.map((step, index) => (
          <Animated.View
            key={step.id}
            style={[styles.stepContainer, { opacity: index === currentStep ? fadeAnim : 0.7 }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: (step.iconColor || roleColor) + '20' }]}>
              <Icon
                name={step.icon as any}
                size={64}
                color={step.iconColor || roleColor}
              />
            </View>

            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepDescription}>{step.description}</Text>

            {step.tips && step.tips.length > 0 && (
              <View style={styles.tipsContainer}>
                <Text style={styles.tipsHeader}>Quick Tips:</Text>
                {step.tips.map((tip, tipIndex) => (
                  <View key={tipIndex} style={styles.tipRow}>
                    <Icon name="checkmark-circle" size={18} color={roleColor} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ))}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={handlePrevious}
          style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
          disabled={currentStep === 0}
        >
          <Icon
            name="chevron-back"
            size={24}
            color={currentStep === 0 ? COLORS.textLight : COLORS.textPrimary}
          />
        </TouchableOpacity>

        <View style={styles.stepIndicator}>
          <Text style={styles.stepIndicatorText}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {currentStep < steps.length - 1 ? (
          <TouchableOpacity onPress={handleNext} style={styles.navButton}>
            <Icon name="chevron-forward" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ) : (
          <Button
            title="Get Started"
            onPress={onComplete}
            style={[styles.getStartedButton, { backgroundColor: roleColor }]}
            textStyle={styles.getStartedText}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.md,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  skipButton: {
    padding: SIZES.sm,
  },
  skipText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.md,
    gap: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: SIZES.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xl,
  },
  stepTitle: {
    fontSize: SIZES.fontXxl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  stepDescription: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SIZES.md,
  },
  tipsContainer: {
    marginTop: SIZES.xl,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    width: '100%',
  },
  tipsHeader: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
    gap: 8,
  },
  tipText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  stepIndicator: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicatorText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  getStartedButton: {
    paddingHorizontal: SIZES.lg,
    minWidth: 120,
  },
  getStartedText: {
    fontSize: SIZES.fontSm,
  },
});
