import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VideoGuideProps {
  sectionId: string;
  sectionTitle: string;
}

// Video configuration for each birth plan section
// Add more sections as videos become available
export const SECTION_VIDEOS: Record<string, { 
  embedUrl: string; 
  thumbnail?: string;
  duration?: string;
  title?: string;
}> = {
  labor_delivery: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/a3436e3f-6adb-4f95-b90b-8893ddf930a6?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '5:54 min',
    title: 'How to fill out this section',
  },
  pain_management: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/f790096b-28cc-4d47-9316-03c3859db4c0?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '2:14 min',
    title: 'How to fill out this section',
  },
  monitoring_iv: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/1bc38c88-fcbe-4dea-be10-f33ce4c7fb7d?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '3:05 min',
    title: 'How to fill out this section',
  },
  induction_interventions: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/46c2f0bb-5f5e-4381-847d-933c551302fb?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '1:24 min',
    title: 'How to fill out this section',
  },
  pushing_safe_word: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/6edeb988-f28f-4ea8-ade5-9350f0044c10?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '4:31 min',
    title: 'How to fill out this section',
  },
  post_delivery: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/17f016ce-aa4c-4db9-97ba-4e1a422cd807?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '5:24 min',
    title: 'How to fill out this section',
  },
  other_considerations: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/534e5643-625f-42cf-bfea-fee26c996c61?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '1:07 min',
    title: 'How to fill out this section',
  },
  // Remaining sections without videos yet:
  // about_me: { embedUrl: '...', duration: '...', title: '...' },
  // newborn_care: { embedUrl: '...', duration: '...', title: '...' },
};

export default function SectionVideoGuide({ sectionId, sectionTitle }: VideoGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  const videoConfig = SECTION_VIDEOS[sectionId];
  
  // Don't render if no video for this section
  if (!videoConfig) {
    return null;
  }
  
  const handlePress = () => {
    if (Platform.OS === 'web') {
      setExpanded(!expanded);
    } else {
      setModalVisible(true);
    }
  };
  
  // Collapsed state - thumbnail with play button
  if (!expanded) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.container,
          pressed && styles.pressed,
        ]}
        onPress={handlePress}
        // @ts-ignore - onClick for web compatibility
        onClick={Platform.OS === 'web' ? handlePress : undefined}
        data-testid={`video-guide-${sectionId}`}
      >
        <LinearGradient
          colors={[COLORS.primary + '15', COLORS.secondary + '10']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientBg}
        >
          {/* Play Button Circle */}
          <View style={styles.playButtonContainer}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.playButton}
            >
              <Icon name="play" size={20} color="#FFFFFF" />
            </LinearGradient>
          </View>
          
          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.videoTitle}>
              {videoConfig.title || 'Watch Guide'}
            </Text>
            <Text style={styles.videoDuration}>
              <Icon name="time-outline" size={12} color={COLORS.textSecondary} />
              {' '}{videoConfig.duration || 'Short video'}
            </Text>
          </View>
          
          {/* Expand Icon */}
          <Icon 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.primary} 
          />
        </LinearGradient>
      </Pressable>
    );
  }
  
  // Expanded state - inline video player (web)
  return (
    <View style={styles.expandedContainer}>
      {/* Collapse Header */}
      <Pressable
        style={styles.collapseHeader}
        onPress={handlePress}
        // @ts-ignore
        onClick={Platform.OS === 'web' ? handlePress : undefined}
      >
        <View style={styles.collapseHeaderContent}>
          <Icon name="videocam" size={18} color={COLORS.primary} />
          <Text style={styles.videoTitleExpanded}>
            {videoConfig.title || 'Video Guide'}
          </Text>
        </View>
        <Icon name="chevron-up" size={20} color={COLORS.primary} />
      </Pressable>
      
      {/* Video Player */}
      <View style={styles.videoWrapper}>
        {Platform.OS === 'web' ? (
          <iframe
            src={videoConfig.embedUrl}
            style={{
              border: 0,
              width: '100%',
              height: '100%',
              borderRadius: 12,
            }}
            allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
            allowFullScreen
          />
        ) : (
          <View style={styles.nativeVideoPlaceholder}>
            <Icon name="play-circle" size={48} color={COLORS.primary} />
            <Text style={styles.nativeVideoText}>Tap to watch in fullscreen</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.md,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  gradientBg: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SIZES.md,
    gap: SIZES.md,
  },
  playButtonContainer: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContent: {
    flex: 1,
  },
  videoTitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  videoDuration: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
  expandedContainer: {
    marginBottom: SIZES.md,
    borderRadius: SIZES.radiusLg,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    backgroundColor: COLORS.primary + '10',
  },
  collapseHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.sm,
  },
  videoTitleExpanded: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: COLORS.primary,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 1, // Square video
    backgroundColor: '#000',
  },
  nativeVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.subtle,
  },
  nativeVideoText: {
    marginTop: SIZES.sm,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
  },
});
