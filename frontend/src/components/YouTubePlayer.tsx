/**
 * YouTubePlayer - Embedded YouTube Video Player Component
 * 
 * Uses react-native-youtube-iframe to embed and play YouTube videos
 * directly within the app instead of opening in external browser.
 * 
 * Features:
 * - Inline playback in modals and screens
 * - Play/pause controls
 * - Fullscreen support on native
 * - Web and native platform support
 */

import React, { useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Platform, TouchableOpacity, Text, Modal, Dimensions } from 'react-native';
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { Icon } from './Icon';
import { COLORS, SIZES, FONTS } from '../constants/theme';

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

export function YouTubePlayer({ 
  videoId, 
  autoPlay = false, 
  showFullscreenButton = true,
  height = 200,
  onClose 
}: YouTubePlayerProps) {
  const [playing, setPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerRef = useRef<YoutubeIframeRef>(null);

  const onStateChange = useCallback((state: string) => {
    if (state === 'ended') {
      setPlaying(false);
    }
  }, []);

  const togglePlaying = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Calculate dimensions
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;
  const aspectRatio = 16 / 9;
  
  const playerWidth = isFullscreen ? screenWidth : screenWidth - (SIZES.md * 2);
  const playerHeight = isFullscreen ? screenWidth / aspectRatio : height;

  const renderPlayer = () => (
    <View style={[styles.playerContainer, isFullscreen && styles.fullscreenContainer]}>
      <YoutubePlayer
        ref={playerRef}
        height={playerHeight}
        width={playerWidth}
        play={playing}
        videoId={videoId}
        onChangeState={onStateChange}
        webViewStyle={styles.webView}
        webViewProps={{
          allowsInlineMediaPlayback: true,
          mediaPlaybackRequiresUserAction: false,
        }}
      />
      
      {/* Control overlay */}
      <View style={styles.controlsOverlay}>
        {/* Close button for fullscreen */}
        {isFullscreen && onClose && (
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => {
              setIsFullscreen(false);
              if (onClose) onClose();
            }}
          >
            <Icon name="close" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
        
        {/* Fullscreen toggle button */}
        {showFullscreenButton && !isFullscreen && (
          <TouchableOpacity 
            style={styles.fullscreenButton}
            onPress={toggleFullscreen}
          >
            <Icon name="expand" size={20} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Render fullscreen modal on native
  if (isFullscreen && Platform.OS !== 'web') {
    return (
      <Modal
        visible={isFullscreen}
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setIsFullscreen(false)}
      >
        <View style={styles.fullscreenModal}>
          <TouchableOpacity 
            style={styles.fullscreenCloseButton}
            onPress={() => setIsFullscreen(false)}
          >
            <Icon name="close" size={28} color={COLORS.white} />
          </TouchableOpacity>
          {renderPlayer()}
        </View>
      </Modal>
    );
  }

  return renderPlayer();
}

// Video Player Modal - For opening video in a modal overlay
interface VideoPlayerModalProps {
  visible: boolean;
  videoId: string;
  onClose: () => void;
  title?: string;
}

export function VideoPlayerModal({ visible, videoId, onClose, title }: VideoPlayerModalProps) {
  const screenWidth = Dimensions.get('window').width;
  const playerHeight = (screenWidth - 32) * (9 / 16); // 16:9 aspect ratio with padding

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {title || 'Video Introduction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          
          {/* Video Player */}
          <View style={styles.videoWrapper}>
            <YoutubePlayer
              height={playerHeight}
              play={true}
              videoId={videoId}
              webViewStyle={styles.webView}
              webViewProps={{
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserAction: false,
              }}
            />
          </View>
          
          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.closeModalButton}
              onPress={onClose}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
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
    backgroundColor: COLORS.textPrimary,
  },
  fullscreenContainer: {
    borderRadius: 0,
  },
  webView: {
    opacity: 0.99, // Fixes rendering issues on Android
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: SIZES.sm,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: SIZES.xs,
  },
  fullscreenButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 16,
    padding: SIZES.xs,
  },
  fullscreenModal: {
    flex: 1,
    backgroundColor: COLORS.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: SIZES.sm,
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
    backgroundColor: COLORS.white,
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
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    flex: 1,
  },
  modalCloseBtn: {
    padding: SIZES.xs,
  },
  videoWrapper: {
    backgroundColor: COLORS.textPrimary,
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyBold,
  },
});

export default YouTubePlayer;
