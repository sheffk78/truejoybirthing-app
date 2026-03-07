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
import { SIZES, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

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
  roleColor,
  roleName = 'User',
}: AppTutorialProps) {
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Use provided roleColor or default to primary
  const activeRoleColor = roleColor || colors.primary;

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Welcome Tour</Text>
        <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
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
              { backgroundColor: colors.border },
              index === currentStep && { backgroundColor: activeRoleColor, width: 24 },
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
            <View style={[styles.iconCircle, { backgroundColor: (step.iconColor || activeRoleColor) + '20' }]}>
              <Icon
                name={step.icon as any}
                size={64}
                color={step.iconColor || activeRoleColor}
              />
            </View>

            <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>{step.description}</Text>

            {step.tips && step.tips.length > 0 && (
              <View style={[styles.tipsContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.tipsHeader, { color: colors.text }]}>Quick Tips:</Text>
                {step.tips.map((tip, tipIndex) => (
                  <View key={tipIndex} style={styles.tipRow}>
                    <Icon name="checkmark-circle" size={18} color={activeRoleColor} />
                    <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        ))}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={[styles.navigationContainer, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          onPress={handlePrevious}
          style={[
            styles.navButton, 
            { backgroundColor: colors.surface, borderColor: colors.border },
            currentStep === 0 && styles.navButtonDisabled
          ]}
          disabled={currentStep === 0}
        >
          <Icon
            name="chevron-back"
            size={24}
            color={currentStep === 0 ? colors.textLight : colors.text}
          />
        </TouchableOpacity>

        <View style={styles.stepIndicator}>
          <Text style={[styles.stepIndicatorText, { color: colors.textSecondary }]}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        {currentStep < steps.length - 1 ? (
          <TouchableOpacity onPress={handleNext} style={[styles.navButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <Button
            title="Get Started"
            onPress={onComplete}
            style={[styles.getStartedButton, { backgroundColor: activeRoleColor }]}
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
  },
  skipButton: {
    padding: SIZES.sm,
  },
  skipText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
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
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  stepDescription: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: SIZES.md,
  },
  tipsContainer: {
    marginTop: SIZES.xl,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.md,
    width: '100%',
  },
  tipsHeader: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
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
    flex: 1,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.lg,
    borderTopWidth: 1,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
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
  },
  getStartedButton: {
    paddingHorizontal: SIZES.lg,
    minWidth: 120,
  },
  getStartedText: {
    fontSize: SIZES.fontSm,
  },
});
