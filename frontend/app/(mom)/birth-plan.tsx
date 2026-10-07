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
import TIcon from '../../src/components/TIcon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { SECTION_FORMS, renderField } from '../../src/components/BirthPlanForms';
import NewbornProceduresForm from '../../src/components/NewbornProceduresForm';
import SectionVideoGuide from '../../src/components/SectionVideoGuide';
import { apiRequest, getApiBaseUrl } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { SIZES, FONTS } from '../../src/constants/theme';
import { C } from '../../src/constants/corpus';
import { useColors, createThemedStyles, ThemeColors } from '../../src/hooks/useThemedStyles';
import { useAuthStore } from '../../src/store/authStore';

const getStatusColors = (colors: ThemeColors): Record<string, string> => ({
  'Not started': colors.textLight,
  'In progress': colors.warning,
  'Complete': colors.success,
});

const STATUS_ICONS: Record<string, string> = {
  'Not started': 'status_todo',
  'In progress': 'status_wip',
  'Complete': 'status_done',
};

// Section icons mapping
// TIcon approved glyph names (docs/design-refresh/surfaces-2026-09-14/icons.mjs rev 2)
const SECTION_ICONS: Record<string, string> = {
  'about_me': 'about_me',
  'labor_delivery': 'labor_delivery',
  'labor_support': 'labor_support',
  'pain_management': 'pain_management',
  'monitoring_iv': 'monitoring_iv',
  'induction_interventions': 'induction_interventions',
  'pushing_safe_word': 'pushing_safe_word',
  'birth_preferences': 'birth_preferences',
  'post_delivery': 'post_delivery',
  'after_birth': 'after_birth',
  'newborn_care': 'newborn_care',
  'newborn_procedures': 'newborn_care',
  'other_considerations': 'other_considerations',
};

export default function BirthPlanScreen() {
  const router = useRouter();
  const colors = useColors();
  const styles = getStyles(colors);
  const STATUS_COLORS = getStatusColors(colors);
  const { sessionToken: token } = useAuthStore();
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [shareRequests, setShareRequests] = useState<any[]>([]);
  const [hasMidwife, setHasMidwife] = useState(false);
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
      // API_BASE already includes /api, so we just need the endpoint path
      const pdfUrl = `${getApiBaseUrl()}/birth-plan/export/pdf`;
      
      console.log('PDF Download - URL:', pdfUrl);
      console.log('PDF Download - Token available:', !!token);
      
      if (Platform.OS === 'web') {
        // Robust download using fetch + blob + hidden anchor
        const response = await fetch(pdfUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf',
          },
        });
        
        console.log('PDF Download - Response status:', response.status);
        console.log('PDF Download - Content-Type:', response.headers.get('content-type'));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('PDF fetch failed:', response.status, errorText);
          throw new Error('Failed to download PDF');
        }
        
        // Get the blob from response
        const blob = await response.blob();
        console.log('PDF Download - Blob size:', blob.size, 'bytes');
        
        if (blob.size === 0) {
          throw new Error('Downloaded PDF is empty');
        }
        
        // Create a temporary object URL
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a hidden anchor element for download
        const downloadLink = document.createElement('a');
        downloadLink.href = blobUrl;
        downloadLink.download = 'My_Birth_Plan.pdf';
        downloadLink.style.cssText = 'position: absolute; left: -9999px; top: -9999px;';
        
        // Append to body, click, and clean up
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // Clean up after a short delay to ensure download starts
        setTimeout(() => {
          if (downloadLink.parentNode) {
            document.body.removeChild(downloadLink);
          }
          window.URL.revokeObjectURL(blobUrl);
        }, 250);
        
        Alert.alert('Success', 'Your birth plan PDF has been downloaded! Check your Downloads folder.');
      } else {
        // Native mobile: download PDF then share/save via system share sheet
        const FileSystem = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');
        
        // Fetch PDF as blob, convert to base64, write to local file
        const response = await fetch(pdfUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to download PDF');
        }
        
        const blob = await response.blob();
        
        if (blob.size === 0) {
          throw new Error('Downloaded PDF is empty');
        }
        
        // Convert blob to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            // Strip the data:application/pdf;base64, prefix
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        // Write to local file
        const fileUri = FileSystem.cacheDirectory + 'My_Birth_Plan.pdf';
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Check if sharing is available, then open share sheet
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Save or Share Your Birth Plan',
          });
        } else {
          Alert.alert('Success', 'Your birth plan PDF has been saved to the app cache.');
        }
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
      const [planData, requestsData, teamData] = await Promise.all([
        apiRequest(API_ENDPOINTS.BIRTH_PLAN),
        apiRequest(API_ENDPOINTS.BIRTH_PLAN_SHARE_REQUESTS).catch(() => ({ requests: [] })),
        // Midwife-visibility gate: Newborn Procedures shows only when mom has a
        // MIDWIFE on her care team (hospital-only moms don't see it). Fail open
        // to false — a team fetch error should not reveal the section.
        apiRequest(API_ENDPOINTS.MOM_TEAM).catch(() => []),
      ]);
      setBirthPlan(planData);
      setShareRequests(requestsData?.requests || []);
      const teamList = Array.isArray(teamData) ? teamData : [];
      setHasMidwife(teamList.some((m: any) =>
        m?.provider?.role === 'MIDWIFE' &&
        (m?.connection_status ?? 'Active') === 'Active'
      ));
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

    // Guard: Newborn Procedures is an informed-choice section — require at least
    // one decision before saving, so a mom never sees "Saved!" with an empty
    // record and assumes her choices are on file.
    if (selectedSection.section_id === 'newborn_procedures') {
      const decisions = (sectionData as any)?.decisions || {};
      const hasChoice = Object.values(decisions).some((d: any) => d?.choice);
      if (!hasChoice) {
        Alert.alert(
          'No decisions yet',
          'Choose or decline at least one procedure before saving this section.'
        );
        return;
      }
    }

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
    return birthPlan.sections.filter((s: any) =>
      s.status === 'Complete' && (s.section_id !== 'newborn_procedures' || hasMidwife)
    ).length;
  };
  
  const renderSectionContent = () => {
    if (!selectedSection) return null;

    const formConfig = SECTION_FORMS[selectedSection.section_id];

    // Newborn Procedures uses dedicated informed-choice decision cards (Phase 4),
    // not the generic field renderer — the section has no SECTION_FORMS entry.
    if (selectedSection.section_id === 'newborn_procedures') {
      return (
        <NewbornProceduresForm
          data={sectionData}
          onChange={updateSectionData}
        />
      );
    }

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
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={6}
          />
        </View>
      );
    }
    
    return (
      <View>
        {formConfig.fields.map((field) => renderField(field, sectionData, updateSectionData, colors))}
      </View>
    );
  };
  
  const getSectionDescription = () => {
    if (!selectedSection) return '';
    if (selectedSection.section_id === 'newborn_procedures') {
      return 'Routine newborn procedures and prenatal screenings — read each, then mark your choice. Declines open your state\u2019s official form or prepare your informed-choice document.';
    }
    const formConfig = SECTION_FORMS[selectedSection.section_id];
    return formConfig?.description || 'Share your preferences for this section.';
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
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
                {getCompletedCount()} of {hasMidwife ? (birthPlan?.sections?.length || 9) : (birthPlan?.sections?.length || 9) - 1} sections complete
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
        
        {birthPlan?.sections?.filter((section: any) =>
          section.section_id !== 'newborn_procedures' || hasMidwife
        ).map((section: any, index: number) => (
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
                  <TIcon 
                    name={SECTION_ICONS[section.section_id] || 'birthplan'} 
                    size={22} 
                    color={section.status === 'Complete' ? colors.white : colors.primary} 
                  />
                </View>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionName}>{section.title}</Text>
                  <View style={styles.statusRow}>
                    <TIcon 
                      name={STATUS_ICONS[section.status] || 'status_todo'} 
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
                <Text style={{ fontSize: 16, color: C.chev, fontWeight: '300' }}>›</Text>
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
            icon={<Text style={{ color: colors.white, fontSize: 17, fontWeight: '700' }}>↓</Text>}
            style={styles.shareButton}
            data-testid="download-pdf-btn"
          />
          <Text style={styles.exportHint}>
            Download your birth plan as a PDF file to print or share
          </Text>
          
          {/* Auto-share notice */}
          <View style={styles.autoShareNotice}>
            <TIcon name="autoshare" size={18} color={'#5F7154'} />
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={{ fontSize: 24, lineHeight: 28, color: C.ink, fontWeight: '300' }}>×</Text>
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
                <TIcon name="autoshare" size={20} color={'#5F7154'} />
                <Text style={styles.modalDescription}>
                  {getSectionDescription()}
                </Text>
              </View>
              
              {/* Video Guide (if available for this section) */}
              <SectionVideoGuide 
                sectionId={selectedSection?.section_id} 
                sectionTitle={selectedSection?.title}
              />
              
              {/* Section Fields */}
              {renderSectionContent()}
              
              {/* Notes to Provider */}
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>
                  <TIcon name="autoshare" size={16} color={'#5F7154'} /> Notes to Your Care Team
                </Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={notesToProvider}
                  onChangeText={setNotesToProvider}
                  placeholder="Any additional notes or context for your healthcare providers..."
                  placeholderTextColor={colors.textLight}
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
              <View style={{ height: 350 }} />
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <Button
                title="Save Section"
                onPress={saveSection}
                loading={saving}
                fullWidth
                icon={!saving ? <Text style={{ color: colors.white, fontSize: 17, fontWeight: '700' }}>✓</Text> : undefined}
                data-testid="save-section-btn"
              />
            </View>
          </KeyboardAvoidingView>
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
    fontFamily: FONTS.heading,
    color: colors.text,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
    color: colors.text,
  },
  progressSubtext: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.heading,
    color: colors.white,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontFamily: FONTS.subheading,
    color: colors.text,
    marginBottom: SIZES.xs,
  },
  sectionSubtitle: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
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
    backgroundColor: colors.primaryLight + '30',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.md,
  },
  sectionIconComplete: {
    backgroundColor: colors.success,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    color: colors.text,
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
    color: colors.textLight,
    textAlign: 'center',
  },
  autoShareNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
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
    color: colors.textSecondary,
    lineHeight: 20,
  },
  sharedWithText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: colors.success,
    marginTop: 4,
  },
  notSharedText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 4,
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
    backgroundColor: colors.surface,
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
    color: colors.text,
    textAlign: 'center',
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  descriptionCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight + '20',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  modalDescription: {
    flex: 1,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: SIZES.sm,
  },
  notesSection: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  notesLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginBottom: SIZES.sm,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: colors.text,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
}));
