// Reusable in-app WebView component for displaying legal pages
// (Privacy Policy, Terms of Service, etc.) without leaving the app.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';

interface LegalWebViewProps {
  visible: boolean;
  url: string;
  title: string;
  onClose: () => void;
}

export default function LegalWebView({ visible, url, title, onClose }: LegalWebViewProps) {
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7B5E57" />
            </View>
          )}
          <WebView
            source={{ uri: url }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            style={styles.webView}
            // Open external links / new windows in the in-app WebView too
            onShouldStartLoadWithRequest={(request) => true}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginLeft: 8,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    zIndex: 1,
  },
});