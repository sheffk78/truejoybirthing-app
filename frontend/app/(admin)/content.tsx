import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES } from '../../src/constants/theme';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';

export default function AdminContentScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const [content, setContent] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [explanatoryText, setExplanatoryText] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  
  const fetchContent = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.ADMIN_CONTENT);
      setContent(data);
    } catch (error) {
      console.error('Error fetching content:', error);
    }
  };
  
  useEffect(() => {
    fetchContent();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchContent();
    setRefreshing(false);
  };
  
  const openEditModal = (item: any) => {
    setSelectedContent(item);
    setExplanatoryText(item.explanatory_text || '');
    setVideoUrl(item.video_url || '');
    setModalVisible(true);
  };
  
  const handleSave = async () => {
    if (!selectedContent) return;
    
    setSaving(true);
    try {
      await apiRequest(`${API_ENDPOINTS.ADMIN_CONTENT}/${selectedContent.section_id}`, {
        method: 'PUT',
        body: {
          explanatory_text: explanatoryText,
          video_url: videoUrl || null,
        },
      });
      
      await fetchContent();
      setModalVisible(false);
      Alert.alert('Saved', 'Content updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };
  
  const getSectionTitle = (sectionId: string) => {
    const titles: Record<string, string> = {
      'about_me': 'About Me & My Preferences',
      'labor_delivery': 'Labor & Delivery Preferences',
      'pain_management': 'Pain Management',
      'monitoring_iv': 'Monitoring & IV / Saline Lock',
      'induction_interventions': 'Induction & Birth Interventions',
      'pushing_safe_word': 'Pushing & Safe Word',
      'post_delivery': 'Post-Delivery Preferences',
      'newborn_care': 'Newborn Care Preferences',
      'other_considerations': 'Other Considerations',
    };
    return titles[sectionId] || sectionId;
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.roleAdmin} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Content Management</Text>
          <Text style={styles.subtitle}>Edit birth plan section content</Text>
        </View>
        
        {content.map((item) => (
          <TouchableOpacity
            key={item.content_id || item.section_id}
            onPress={() => openEditModal(item)}
            activeOpacity={0.8}
          >
            <Card style={styles.contentCard}>
              <View style={styles.contentHeader}>
                <Text style={styles.sectionTitle}>{getSectionTitle(item.section_id)}</Text>
                <Icon name="create-outline" size={20} color={colors.roleAdmin} />
              </View>
              <Text style={styles.explanatoryPreview} numberOfLines={2}>
                {item.explanatory_text || 'No content set'}
              </Text>
              {item.video_url && (
                <View style={styles.videoIndicator}>
                  <Icon name="videocam" size={14} color={colors.success} />
                  <Text style={styles.videoText}>Video attached</Text>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Content</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {selectedContent && (
              <Text style={styles.sectionLabel}>
                {getSectionTitle(selectedContent.section_id)}
              </Text>
            )}
            
            <Text style={styles.fieldLabel}>Explanatory Text</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={explanatoryText}
              onChangeText={setExplanatoryText}
              placeholder="Enter the explanatory text for this section..."
              multiline
              numberOfLines={8}
            />
            
            <Text style={styles.fieldLabel}>Video URL (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={videoUrl}
              onChangeText={setVideoUrl}
              placeholder="https://example.com/video.mp4"
              autoCapitalize="none"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Save Changes"
              onPress={handleSave}
              loading={saving}
              fullWidth
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: SIZES.xxl,
  },
  header: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: colors.textSecondary,
    marginTop: 4,
  },
  contentCard: {
    marginBottom: SIZES.sm,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  sectionTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  explanatoryPreview: {
    fontSize: SIZES.fontSm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  videoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.sm,
  },
  videoText: {
    fontSize: SIZES.fontXs,
    color: colors.success,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  sectionLabel: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
    color: colors.roleAdmin,
    marginBottom: SIZES.lg,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: colors.text,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  textInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: colors.text,
  },
  textArea: {
    minHeight: 200,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
}));
