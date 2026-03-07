/**
 * YouTubePlayer - Embedded YouTube Video Player Component
 * 
 * Uses iframe for web and react-native-youtube-iframe for native platforms.
 * This allows YouTube videos to play inline within the app.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Modal, Dimensions, Linking } from 'react-native';
import { Icon } from './Icon';
import { SIZES, FONTS } from '../constants/theme';
import { useColors } from '../hooks/useThemedStyles';

interface YouTubePlayerProps {
  videoId: string;
  autoPlay?: boolean;
  showFullscreenButton?: boolean;
  height?: number;
  onClose?: () => void;
}

// Extract YouTube video ID from various URL formats
export const getYouTubeVideoId = (url: string): string | null => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get YouTube thumbnail URL
export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

// Web Video Player using iframe
function WebVideoPlayer({ videoId, height = 200, autoPlay = false }: { videoId: string; height?: number; autoPlay?: boolean }) {
  const screenWidth = Dimensions.get('window').width;
  const playerWidth = screenWidth - (SIZES.md * 2);
  
  return (
    <View style={[styles.playerContainer, { height, width: playerWidth }]}>
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=${autoPlay ? 1 : 0}&rel=0`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ borderRadius: SIZES.radiusMd }}
      />
    </View>
  );
}

export function YouTubePlayer({ 
  videoId, 
  autoPlay = false, 
  showFullscreenButton = true,
  height = 200,
  onClose 
}: YouTubePlayerProps) {
  const colors = useColors();
  
  // For web, use iframe
  if (Platform.OS === 'web') {
    return <WebVideoPlayer videoId={videoId} height={height} autoPlay={autoPlay} />;
  }
  
  // For native, dynamically import and use the library
  // This is a fallback that opens in browser since the library has web issues
  return (
    <TouchableOpacity 
      style={[styles.playerContainer, styles.nativeFallback, { height }]}
      onPress={() => Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`)}
    >
      <Icon name="play-circle" size={48} color={colors.white} />
      <Text style={[styles.fallbackText, { color: colors.white }]}>Tap to watch video</Text>
    </TouchableOpacity>
  );
}

// Video Player Modal - For opening video in a modal overlay
interface VideoPlayerModalProps {
  visible: boolean;
  videoId: string;
  onClose: () => void;
  title?: string;
}

export function VideoPlayerModal({ visible, videoId, onClose, title }: VideoPlayerModalProps) {
  const colors = useColors();
  const screenWidth = Dimensions.get('window').width;
  const playerHeight = Math.min((screenWidth - 32) * (9 / 16), 300); // 16:9 aspect ratio with max height

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
              {title || 'Video Introduction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Video Player */}
          <View style={[styles.videoWrapper, { backgroundColor: colors.text }]}>
            {Platform.OS === 'web' ? (
              <iframe
                width="100%"
                height={playerHeight}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <TouchableOpacity 
                style={[styles.nativeFallback, { height: playerHeight }]}
                onPress={() => {
                  Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
                  onClose();
                }}
              >
                <Icon name="play-circle" size={64} color={colors.white} />
                <Text style={[styles.fallbackText, { color: colors.white }]}>Tap to open in YouTube</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Footer */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[styles.closeModalButton, { backgroundColor: colors.primary }]}
              onPress={onClose}
            >
              <Text style={[styles.closeModalButtonText, { color: colors.white }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  playerContainer: {
    borderRadius: SIZES.radiusMd,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  nativeFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  fallbackText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    marginTop: SIZES.sm,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.md,
  },
  modalContent: {
    borderRadius: SIZES.radiusLg,
    width: '100%',
    maxWidth: 500,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    flex: 1,
  },
  modalCloseBtn: {
    padding: SIZES.xs,
  },
  videoWrapper: {
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
  },
  closeModalButton: {
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
  },
});

export default YouTubePlayer;
