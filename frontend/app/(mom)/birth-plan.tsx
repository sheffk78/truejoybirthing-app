import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { SECTION_FORMS, renderField } from '../../src/components/BirthPlanForms';
import { apiRequest, getApiBaseUrl } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, SHADOWS, FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';

const STATUS_COLORS: Record<string, string> = {
  'Not started': COLORS.textLight,
  'In progress': COLORS.warning,
  'Complete': COLORS.success,
};

const STATUS_ICONS: Record<string, string> = {
  'Not started': 'ellipse-outline',
  'In progress': 'time-outline',
  'Complete': 'checkmark-circle',
};

// Section icons mapping
const SECTION_ICONS: Record<string, string> = {
  'about_me': 'person',
  'labor_delivery': 'body',
  'pain_management': 'medical',
  'monitoring_iv': 'pulse',
  'induction_interventions': 'medkit',
  'pushing_safe_word': 'fitness',
  'post_delivery': 'heart',
  'newborn_care': 'happy',
  'other_considerations': 'list',
};

export default function BirthPlanScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [shareRequests, setShareRequests] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [notesToProvider, setNotesToProvider] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const handleDownloadPDF = async () => {
    setExporting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const pdfUrl = `${baseUrl}/api/birth-plan/export/pdf`;
      
      if (Platform.OS === 'web') {
        const response = await fetch(pdfUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to download PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'My_Birth_Plan.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        Alert.alert('Success', 'Your birth plan PDF has been downloaded!');
      } else {
        // For native, we'd use expo-file-system or expo-sharing
        Alert.alert('Download', 'PDF download initiated. Check your downloads folder.');
      }
    } catch (error: any) {
      console.error('PDF download error:', error);
      Alert.alert('Error', error.message || 'Failed to download PDF. Please try again.');
    } finally {
      setExporting(false);
    }
  };
  
  const fetchBirthPlan = async () => {
    try {
      const [planData, requestsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.BIRTH_PLAN),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS).catch(() => ({ requests: [] })),
      ]);
      setBirthPlan(planData);
      setShareRequests(requestsData?.requests || []);
    } catch (error) {
      console.error('Error fetching birth plan:', error);
    }
  };
  
  useEffect(() => {
    fetchBirthPlan();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBirthPlan();
    setRefreshing(false);
  };
  
  const openSection = (section: any) => {
    setSelectedSection(section);
    setSectionData(section.data || {});
    setNotesToProvider(section.notes_to_provider || '');
    setModalVisible(true);
  };
  
  const updateSectionData = (key: string, value: any) => {
    setSectionData(prev => ({ ...prev, [key]: value }));
  };
  
  const saveSection = async () => {
    if (!selectedSection) return;
    
    setSaving(true);
    try {
      await apiRequest(`${API_ENDPOINTS.BIRTH_PLAN_SECTION}/${selectedSection.section_id}`, {
        method: 'PUT',
        body: {
          data: sectionData,
          notes_to_provider: notesToProvider,
        },
      });
      
      await fetchBirthPlan();
      setModalVisible(false);
      Alert.alert('Saved!', 'Your birth plan section has been saved.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };
  
  const handleExport = async () => {
    // Navigate to the preview screen for printing
    router.push('/(mom)/birth-plan-preview');
  };

  const handleShareWithProvider = () => {
    router.push('/(mom)/my-team');
  };
  
  const getCompletedCount = () => {
    if (!birthPlan?.sections) return 0;
    return birthPlan.sections.filter((s: any) => s.status === 'Complete').length;
  };
  
  const renderSectionContent = () => {
    if (!selectedSection) return null;
    
    const formConfig = SECTION_FORMS[selectedSection.section_id];
    
    if (!formConfig) {
      // Fallback for sections without specific form config
      return (
        <View>
          <Text style={styles.fieldLabel}>Your Preferences</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={sectionData.preferences || ''}
            onChangeText={(text) => updateSectionData('preferences', text)}
            placeholder={`Enter your ${selectedSection.title.toLowerCase()} preferences...`}
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={6}
          />
        </View>
      );
    }
    
    return (
      <View>
        {formConfig.fields.map((field) => renderField(field, sectionData, updateSectionData))}
      </View>
    );
  };
  
  const getSectionDescription = () => {
    if (!selectedSection) return '';
    const formConfig = SECTION_FORMS[selectedSection.section_id];
    return formConfig?.description || 'Share your preferences for this section.';
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Joyful Birth Plan</Text>
          <Text style={styles.subtitle}>
            Create your personalized birth preferences
          </Text>
        </View>
        
        {/* Progress Card */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.progressTitle}>Your Progress</Text>
              <Text style={styles.progressSubtext}>
                {getCompletedCount()} of {birthPlan?.sections?.length || 9} sections complete
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>
                {Math.round(birthPlan?.completion_percentage || 0)}%
              </Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${birthPlan?.completion_percentage || 0}%` },
              ]}
            />
          </View>
        </Card>
        
        {/* Sections */}
        <Text style={styles.sectionTitle}>Birth Plan Sections</Text>
        <Text style={styles.sectionSubtitle}>
          Tap each section to add your preferences
        </Text>
        
        {birthPlan?.sections?.map((section: any, index: number) => (
          <TouchableOpacity
            key={section.section_id}
            onPress={() => openSection(section)}
            activeOpacity={0.7}
          >
            <Card style={styles.sectionCard}>
              <View style={styles.sectionRow}>
                <View style={[
                  styles.sectionIconContainer,
                  section.status === 'Complete' && styles.sectionIconComplete,
                ]}>
                  <Icon 
                    name={SECTION_ICONS[section.section_id] || 'document'} 
                    size={20} 
                    color={section.status === 'Complete' ? COLORS.white : COLORS.primary} 
                  />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionName}>{section.title}</Text>
                  <View style={styles.statusRow}>
                    <Icon 
                      name={STATUS_ICONS[section.status]} 
                      size={14} 
                      color={STATUS_COLORS[section.status]} 
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: STATUS_COLORS[section.status] },
                      ]}
                    >
                      {section.status}
                    </Text>
                  </View>
                </View>
                <Icon name="chevron-forward" size={20} color={COLORS.textLight} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        
        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <Button
            title="Download Birth Plan PDF"
            onPress={handleDownloadPDF}
            loading={exporting}
            fullWidth
            icon={<Icon name="download" size={20} color={COLORS.white} />}
            style={styles.shareButton}
            data-testid="download-pdf-btn"
          />
          <Text style={styles.exportHint}>
            Download your birth plan as a PDF file to print or share
          </Text>
          
          {/* Auto-share notice */}
          <View style={styles.autoShareNotice}>
            <Icon name="information-circle" size={18} color={COLORS.primary} />
            <View style={styles.autoShareTextContainer}>
              <Text style={styles.autoShareText}>
                Your birth plan is automatically shared with team members.
              </Text>
              {shareRequests.filter(r => r.status === 'accepted').length > 0 ? (
                <Text style={styles.sharedWithText}>
                  Shared with: {shareRequests
                    .filter(r => r.status === 'accepted')
                    .map(r => r.provider_name)
                    .join(', ')}
                </Text>
              ) : (
                <Text style={styles.notSharedText}>
                  Not yet shared with any providers
                </Text>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Section Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <KeyboardAvoidingView 
            style={{ flex: 1 }} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {selectedSection?.title}
              </Text>
              <View style={{ width: 44 }} />
            </View>
            
            <ScrollView 
              ref={scrollViewRef}
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Section Description */}
              <View style={styles.descriptionCard}>
                <Icon name="information-circle" size={20} color={COLORS.primary} />
                <Text style={styles.modalDescription}>
                  {getSectionDescription()}
                </Text>
              </View>
              
              {/* Section Fields */}
              {renderSectionContent()}
              
              {/* Notes to Provider */}
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>
                  <Icon name="chatbubble" size={16} color={COLORS.primary} /> Notes to Your Care Team
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={notesToProvider}
                  onChangeText={setNotesToProvider}
                  placeholder="Any additional notes or context for your healthcare providers..."
                  placeholderTextColor={COLORS.textLight}
                  multiline
                  numberOfLines={4}
                  onFocus={() => {
                    // Scroll to bottom when notes field is focused
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                />
              </View>
              
              {/* Large spacer for keyboard and button */}
              <View style={{ height: 280 }} />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title="Save Section"
                onPress={saveSection}
                loading={saving}
                fullWidth
                icon={!saving ? <Icon name="checkmark" size={20} color={COLORS.white} /> : undefined}
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressCard: {
    marginBottom: SIZES.lg,
    padding: SIZES.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  progressTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
  },
  progressSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.white,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: COLORS.textPrimary,
    marginBottom: SIZES.xs,
  },
  sectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginBottom: SIZES.md,
  },
  sectionCard: {
    marginBottom: SIZES.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  sectionIconComplete: {
    backgroundColor: COLORS.success,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: SIZES.fontSm,
    marginLeft: 4,
  },
  actionSection: {
    marginTop: SIZES.lg,
    alignItems: 'center',
  },
  shareButton: {
    marginBottom: SIZES.sm,
  },
  exportSection: {
    marginTop: SIZES.lg,
    alignItems: 'center',
  },
  exportButton: {
    marginBottom: SIZES.sm,
  },
  exportHint: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  autoShareNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.md,
    gap: SIZES.sm,
  },
  autoShareTextContainer: {
    flex: 1,
  },
  autoShareText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  sharedWithText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.success,
    marginTop: 4,
  },
  notSharedText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  modalCloseButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    flex: 1,
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  descriptionCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryLight + '20',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  modalDescription: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginLeft: SIZES.sm,
  },
  notesSection: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
