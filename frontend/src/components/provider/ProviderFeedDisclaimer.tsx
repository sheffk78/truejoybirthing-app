// Provider Feed Disclaimer Modal
// Shows required health content disclaimers on first interaction

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SIZES, FONTS } from '../../constants/theme';
import { useColors } from '../../hooks/useThemedStyles';

interface ProviderFeedDisclaimerProps {
  visible: boolean;
  onClose: () => void;
}

export default function ProviderFeedDisclaimer({ visible, onClose }: ProviderFeedDisclaimerProps) {
  const colors = useColors();
  const styles = getStyles(colors);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            About This Feed
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            This feed provides AI-generated summaries of birth work content from 
            third-party sources (podcasts, blogs, newsletters, and research). 
            Summaries are produced using artificial intelligence and may contain 
            errors, omissions, or misinterpretations.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            This app is not a medical device and does not provide medical advice, 
            diagnosis, treatment, or care recommendations. The information 
            presented is for educational and informational purposes only and is 
            not a substitute for professional medical judgment.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Always consult with a qualified healthcare professional before making 
            clinical decisions based on any information presented in this app.
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Original source content is owned by its respective publishers. This 
            app provides links to original sources for reference. Summaries do 
            not represent the positions or endorsements of the original authors.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: colors.white }]}>
              Got it
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const getStyles = (colors: any) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: SIZES.lg,
    },
    modal: {
      borderRadius: SIZES.radiusMd,
      padding: SIZES.lg,
      maxWidth: 400,
      width: '100%',
    },
    title: {
      fontSize: SIZES.fontLg,
      fontFamily: FONTS.heading,
      marginBottom: SIZES.md,
    },
    body: {
      fontSize: SIZES.fontSm,
      fontFamily: FONTS.body,
      lineHeight: 20,
      marginBottom: SIZES.sm,
    },
    button: {
      paddingVertical: SIZES.sm,
      paddingHorizontal: SIZES.lg,
      borderRadius: SIZES.radiusSm,
      alignItems: 'center',
      marginTop: SIZES.sm,
    },
    buttonText: {
      fontSize: SIZES.fontMd,
      fontFamily: FONTS.bodyBold,
    },
  });
