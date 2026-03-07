import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
  Animated,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { SIZES, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

const { width, height } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  colorKey: 'secondary' | 'primary' | 'accent';
  image: string;
}

interface OnboardingWalkthroughProps {
  role: 'MOM' | 'DOULA' | 'MIDWIFE';
  onComplete: () => void;
}

// Birth photos from user
const BIRTH_PHOTOS = {
  skinToSkin: 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/vp8xh1cu_IMG_0160.jpg',
  waterBirth1: 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/xzxgnokb_IMG_8612.jpg',
  waterBirth2: 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/9z5rmv0g_IMG_8613.jpg',
  familyMoment: 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/fg673ifm_IMG_8684.jpg',
  newbornSleeping: 'https://customer-assets.emergentagent.com/job_def95b5c-4fae-4e77-a6e4-2b57d8a6155e/artifacts/nubpbqis_IMG_9108.jpg',
};

const STEPS_BY_ROLE: Record<string, OnboardingStep[]> = {
  MOM: [
    {
      id: '1',
      title: 'Create Your Birth Plan',
      description: 'Build a personalized birth plan that captures your preferences, values, and wishes for your special day.',
      icon: 'document-text',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.newbornSleeping,
    },
    {
      id: '2',
      title: 'Build Your Birth Team',
      description: 'Find and connect with experienced doulas and midwives in your area who align with your vision.',
      icon: 'people-circle',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.waterBirth2,
    },
    {
      id: '3',
      title: 'Experience Your Journey',
      description: 'Track your wellness, celebrate milestones, and stay connected with your care team throughout pregnancy.',
      icon: 'heart-circle',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.skinToSkin,
    },
  ],
  DOULA: [
    {
      id: '1',
      title: 'Complete Your Profile',
      description: 'Showcase your experience, certifications, and philosophy to help moms find the perfect match.',
      icon: 'person-circle',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.waterBirth2,
    },
    {
      id: '2',
      title: 'Manage Your Clients',
      description: 'Keep track of your clients, appointments, contracts, and invoices all in one place.',
      icon: 'briefcase',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.familyMoment,
    },
    {
      id: '3',
      title: 'Support Birth Plans',
      description: 'Review and contribute to your clients\' birth plans, adding your professional insights.',
      icon: 'document-text',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.skinToSkin,
    },
  ],
  MIDWIFE: [
    {
      id: '1',
      title: 'Set Up Your Practice',
      description: 'Add your credentials, services, and availability so expecting families can find you.',
      icon: 'medkit',
      colorKey: 'accent',
      image: BIRTH_PHOTOS.waterBirth1,
    },
    {
      id: '2',
      title: 'Track Client Care',
      description: 'Log prenatal visits, monitor health metrics, and maintain comprehensive care records.',
      icon: 'clipboard',
      colorKey: 'primary',
      image: BIRTH_PHOTOS.familyMoment,
    },
    {
      id: '3',
      title: 'Guide Birth Journeys',
      description: 'Review birth preferences and help clients make informed decisions about their care.',
      icon: 'heart-half',
      colorKey: 'secondary',
      image: BIRTH_PHOTOS.newbornSleeping,
    },
  ],
};

export default function OnboardingWalkthrough({ role, onComplete }: OnboardingWalkthroughProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const colors = useColors();
  
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
    
    return (
      <View style={styles.stepContainer}>
        {/* Photo with gradient overlay */}
        <View style={styles.photoContainer}>
          <ImageBackground
            source={{ uri: item.image }}
            style={styles.stepImage}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                `${stepColor}40`,
                `${stepColor}20`,
                'rgba(254,252,255,0.9)',
                colors.background,
              ]}
              locations={[0, 0.3, 0.7, 1]}
              style={styles.photoGradient}
            />
          </ImageBackground>
        </View>
        
        {/* Content */}
        <View style={styles.stepContent}>
          {/* Step Badge */}
          <View style={[styles.stepBadge, { backgroundColor: stepColor + '20' }]}>
            <Icon name={item.icon as any} size={16} color={stepColor} />
            <Text style={[styles.stepBadgeText, { color: stepColor }]}>
              Step {index + 1} of {steps.length}
            </Text>
          </View>
          
          {/* Title */}
          <Text style={[styles.stepTitle, { color: colors.text }]}>{item.title}</Text>
          
          {/* Description */}
          <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>{item.description}</Text>
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
        style={styles.skipButton} 
        onPress={handleSkip} 
        // @ts-ignore - onClick for web compatibility
        onClick={Platform.OS === 'web' ? handleSkip : undefined}
        data-testid="onboarding-skip-btn"
      >
        <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
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
    height: height * 0.45,
  },
  stepImage: {
    flex: 1,
  },
  photoGradient: {
    flex: 1,
  },
  stepContent: {
    flex: 1,
    paddingHorizontal: SIZES.xl,
    paddingTop: SIZES.lg,
    alignItems: 'center',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusFull,
    marginBottom: SIZES.md,
    gap: SIZES.xs,
  },
  stepBadgeText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: 28,
    fontFamily: FONTS.heading,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SIZES.sm,
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
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
