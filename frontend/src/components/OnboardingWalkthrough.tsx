import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const { width } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

interface OnboardingWalkthroughProps {
  role: 'MOM' | 'DOULA' | 'MIDWIFE';
  onComplete: () => void;
}

const STEPS_BY_ROLE: Record<string, OnboardingStep[]> = {
  MOM: [
    {
      id: '1',
      title: 'Create Your Birth Plan',
      description: 'Build a personalized birth plan that captures your preferences, values, and wishes for your special day.',
      icon: 'document-text',
      color: COLORS.secondary,
    },
    {
      id: '2',
      title: 'Build Your Birth Team',
      description: 'Find and connect with experienced doulas and midwives in your area who align with your vision.',
      icon: 'people-circle',
      color: COLORS.primary,
    },
    {
      id: '3',
      title: 'Track Your Journey',
      description: 'Monitor your wellness, track milestones, and stay connected with your care team throughout pregnancy.',
      icon: 'heart-circle',
      color: COLORS.accent,
    },
  ],
  DOULA: [
    {
      id: '1',
      title: 'Complete Your Profile',
      description: 'Showcase your experience, certifications, and philosophy to help moms find the perfect match.',
      icon: 'person-circle',
      color: COLORS.primary,
    },
    {
      id: '2',
      title: 'Manage Your Clients',
      description: 'Keep track of your clients, appointments, contracts, and invoices all in one place.',
      icon: 'briefcase',
      color: COLORS.secondary,
    },
    {
      id: '3',
      title: 'Collaborate on Birth Plans',
      description: 'Review and contribute to your clients\' birth plans, adding your professional insights.',
      icon: 'document-text',
      color: COLORS.accent,
    },
  ],
  MIDWIFE: [
    {
      id: '1',
      title: 'Set Up Your Practice',
      description: 'Add your credentials, services, and availability so expecting families can find you.',
      icon: 'medkit',
      color: COLORS.accent,
    },
    {
      id: '2',
      title: 'Track Client Care',
      description: 'Log prenatal visits, monitor health metrics, and maintain comprehensive care records.',
      icon: 'clipboard',
      color: COLORS.primary,
    },
    {
      id: '3',
      title: 'Support Birth Plans',
      description: 'Review birth preferences and help clients make informed decisions about their care.',
      icon: 'heart-half',
      color: COLORS.secondary,
    },
  ],
};

export default function OnboardingWalkthrough({ role, onComplete }: OnboardingWalkthroughProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  
  const steps = STEPS_BY_ROLE[role] || STEPS_BY_ROLE.MOM;
  
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
  
  const renderStep = ({ item, index }: { item: OnboardingStep; index: number }) => (
    <View style={styles.stepContainer}>
      {/* Icon Circle */}
      <View style={[styles.iconCircle, { backgroundColor: item.color + '20' }]}>
        <LinearGradient
          colors={[item.color, item.color + 'CC']}
          style={styles.iconInner}
        >
          <Icon name={item.icon as any} size={48} color="#FFFFFF" />
        </LinearGradient>
      </View>
      
      {/* Step Number */}
      <View style={styles.stepBadge}>
        <Text style={styles.stepBadgeText}>Step {index + 1} of {steps.length}</Text>
      </View>
      
      {/* Title */}
      <Text style={styles.stepTitle}>{item.title}</Text>
      
      {/* Description */}
      <Text style={styles.stepDescription}>{item.description}</Text>
    </View>
  );
  
  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {steps.map((_, index) => {
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
                backgroundColor: steps[currentIndex]?.color || COLORS.primary,
              },
            ]}
          />
        );
      })}
    </View>
  );
  
  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <Pressable style={styles.skipButton} onPress={handleSkip} data-testid="onboarding-skip-btn">
        <Text style={styles.skipText}>Skip</Text>
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
            { backgroundColor: steps[currentIndex]?.color || COLORS.primary },
            pressed && styles.buttonPressed,
          ]}
          onPress={handleNext}
          data-testid="onboarding-continue-btn"
        >
          <Text style={styles.continueText}>
            {currentIndex === steps.length - 1 ? "Let's Go!" : 'Continue'}
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
    backgroundColor: COLORS.background,
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
    color: COLORS.textSecondary,
  },
  stepContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.xl,
    paddingTop: 100,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SIZES.xl,
  },
  iconInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadge: {
    backgroundColor: COLORS.subtle,
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginBottom: SIZES.md,
  },
  stepBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.md,
  },
  stepDescription: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: SIZES.md,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.xs,
    marginBottom: SIZES.xl,
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
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
