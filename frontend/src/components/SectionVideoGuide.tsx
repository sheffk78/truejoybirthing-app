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
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from './Icon';
import { SIZES, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

// Only import WebView on native platforms (not needed on web, uses iframe instead)
let WebView: any = null;
if (Platform.OS !== 'web') {
  try {
    WebView = require('react-native-webview').WebView;
  } catch (e) {
    // WebView not available - will fall back gracefully
  }
}

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
  newborn_care: {
    embedUrl: 'https://iframe.mediadelivery.net/embed/602267/d2c3362c-948a-454b-ab9d-05d3b24aca15?autoplay=true&loop=false&muted=false&preload=true&responsive=true',
    duration: '3:59 min',
    title: 'How to fill out this section',
  },
  // No video for about_me section
};

export default function SectionVideoGuide({ sectionId, sectionTitle }: VideoGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const colors = useColors();
  
  const videoConfig = SECTION_VIDEOS[sectionId];
  
  // Don't render if no video for this section
  if (!videoConfig) {
    return null;
  }
  
  const handlePress = () => {
    if (Platform.OS === 'web') {
      setExpanded(!expanded);
    } else {
      setVideoLoading(true);
      setModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setVideoLoading(true);
  };

  // Build HTML wrapper for the Bunny.net embed to ensure proper sizing in WebView
  const videoHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
        iframe { width: 100%; height: 100%; border: none; }
      </style>
    </head>
    <body>
      <iframe
        src="${videoConfig.embedUrl}"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowfullscreen
      ></iframe>
    </body>
    </html>
  `;
  
  // Native fullscreen video modal
  const renderNativeVideoModal = () => (
    <Modal
      visible={modalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleCloseModal}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.modalContainer}>
        <StatusBar hidden={modalVisible} />
        
        {/* Close Button Header */}
        <View style={[styles.modalHeader, { backgroundColor: '#000' }]}>
          <View style={styles.modalHeaderContent}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {videoConfig.title || sectionTitle}
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleCloseModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={32} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* WebView Video Player */}
        <View style={styles.modalVideoContainer}>
          {videoLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}
          {WebView ? (
            <WebView
              source={{ html: videoHtml }}
              style={styles.webview}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
              onLoadEnd={() => setVideoLoading(false)}
              onError={() => setVideoLoading(false)}
            />
          ) : (
            <View style={styles.loadingOverlay}>
              <Icon name="alert-circle" size={48} color="#FFFFFF" />
              <Text style={styles.loadingText}>Video player unavailable</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
  
  // Collapsed state - thumbnail with play button
  if (!expanded && !modalVisible) {
    return (
      <>
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
            colors={[colors.primary + '15', colors.secondary + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          >
            {/* Play Button Circle */}
            <View style={[styles.playButtonContainer, { shadowColor: colors.primary }]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.playButton}
              >
                <Icon name="play" size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
            
            {/* Text Content */}
            <View style={styles.textContent}>
              <Text style={[styles.videoTitle, { color: colors.text }]}>
                {videoConfig.title || 'Watch Guide'}
              </Text>
              <Text style={[styles.videoDuration, { color: colors.textSecondary }]}>
                <Icon name="time-outline" size={12} color={colors.textSecondary} />
                {' '}{videoConfig.duration || 'Short video'}
              </Text>
            </View>
            
            {/* Expand Icon */}
            <Icon 
              name={Platform.OS === 'web' ? "chevron-down" : "play-circle-outline"} 
              size={20} 
              color={colors.primary} 
            />
          </LinearGradient>
        </Pressable>
        {Platform.OS !== 'web' && renderNativeVideoModal()}
      </>
    );
  }

  // Native: when modal is visible, still render the collapsed button + modal
  if (Platform.OS !== 'web') {
    return (
      <>
        <Pressable
          style={({ pressed }) => [
            styles.container,
            pressed && styles.pressed,
          ]}
          onPress={handlePress}
          data-testid={`video-guide-${sectionId}`}
        >
          <LinearGradient
            colors={[colors.primary + '15', colors.secondary + '10']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          >
            <View style={[styles.playButtonContainer, { shadowColor: colors.primary }]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryDark]}
                style={styles.playButton}
              >
                <Icon name="play" size={20} color="#FFFFFF" />
              </LinearGradient>
            </View>
            <View style={styles.textContent}>
              <Text style={[styles.videoTitle, { color: colors.text }]}>
                {videoConfig.title || 'Watch Guide'}
              </Text>
              <Text style={[styles.videoDuration, { color: colors.textSecondary }]}>
                <Icon name="time-outline" size={12} color={colors.textSecondary} />
                {' '}{videoConfig.duration || 'Short video'}
              </Text>
            </View>
            <Icon name="play-circle-outline" size={20} color={colors.primary} />
          </LinearGradient>
        </Pressable>
        {renderNativeVideoModal()}
      </>
    );
  }
  
  // Expanded state - inline video player (web only)
  return (
    <View style={[styles.expandedContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Collapse Header */}
      <Pressable
        style={[styles.collapseHeader, { backgroundColor: colors.primary + '10' }]}
        onPress={handlePress}
        // @ts-ignore
        onClick={Platform.OS === 'web' ? handlePress : undefined}
      >
        <View style={styles.collapseHeaderContent}>
          <Icon name="videocam" size={18} color={colors.primary} />
          <Text style={[styles.videoTitleExpanded, { color: colors.primary }]}>
            {videoConfig.title || 'Video Guide'}
          </Text>
        </View>
        <Icon name="chevron-up" size={20} color={colors.primary} />
      </Pressable>
      
      {/* Video Player */}
      <View style={styles.videoWrapper}>
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
    marginBottom: 2,
  },
  videoDuration: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
  },
  expandedContainer: {
    marginBottom: SIZES.md,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
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
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 1, // Square video
    backgroundColor: '#000',
  },
  // Native fullscreen modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 10,
    paddingHorizontal: SIZES.md,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    flex: 1,
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.bodyBold,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: SIZES.md,
  },
  closeButton: {
    padding: 4,
  },
  modalVideoContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    marginTop: SIZES.sm,
  },
});
