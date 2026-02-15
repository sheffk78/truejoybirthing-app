import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES, SHADOWS } from '../../src/constants/theme';

const STATUS_COLORS: Record<string, string> = {
  'Not started': COLORS.textLight,
  'In progress': COLORS.warning,
  'Complete': COLORS.success,
};

export default function BirthPlanScreen() {
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSection, setSelectedSection] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sectionData, setSectionData] = useState<Record<string, any>>({});
  const [notesToProvider, setNotesToProvider] = useState('');
  const [saving, setSaving] = useState(false);
  
  const fetchBirthPlan = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.BIRTH_PLAN);
      setBirthPlan(data);
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
      Alert.alert('Saved', 'Your birth plan section has been saved.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save section');
    } finally {
      setSaving(false);
    }
  };
  
  const handleExport = () => {
    Alert.alert(
      'Export Birth Plan',
      'PDF export is currently mocked. In production, you would be able to download, email, or share your birth plan.',
      [{ text: 'OK' }]
    );
  };
  
  const renderSectionContent = () => {
    if (!selectedSection) return null;
    
    const { section_id } = selectedSection;
    
    // Different field types based on section
    switch (section_id) {
      case 'pain_management':
        return (
          <View>
            <Text style={styles.fieldLabel}>Pain Management Preferences</Text>
            {['None/Unmedicated', 'Epidural', 'Nitrous Oxide', 'IV Pain Meds', 'Other'].map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.checkboxRow}
                onPress={() => {
                  const current = sectionData.painOptions || [];
                  if (current.includes(option)) {
                    setSectionData({ ...sectionData, painOptions: current.filter((o: string) => o !== option) });
                  } else {
                    setSectionData({ ...sectionData, painOptions: [...current, option] });
                  }
                }}
              >
                <View style={[styles.checkbox, (sectionData.painOptions || []).includes(option) && styles.checkboxChecked]}>
                  {(sectionData.painOptions || []).includes(option) && (
                    <Ionicons name="checkmark" size={14} color={COLORS.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      
      case 'about_me':
        return (
          <View>
            <Text style={styles.fieldLabel}>Who will be with you during labor?</Text>
            <TextInput
              style={styles.textInput}
              value={sectionData.supportPeople || ''}
              onChangeText={(text) => setSectionData({ ...sectionData, supportPeople: text })}
              placeholder="e.g., Partner, mother, doula"
              multiline
            />
            
            <Text style={styles.fieldLabel}>Special considerations</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={sectionData.specialConsiderations || ''}
              onChangeText={(text) => setSectionData({ ...sectionData, specialConsiderations: text })}
              placeholder="Any allergies, religious/cultural preferences, past trauma, etc."
              multiline
              numberOfLines={4}
            />
          </View>
        );
      
      default:
        return (
          <View>
            <Text style={styles.fieldLabel}>Your Preferences</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={sectionData.preferences || ''}
              onChangeText={(text) => setSectionData({ ...sectionData, preferences: text })}
              placeholder={`Enter your ${selectedSection.title.toLowerCase()} preferences...`}
              multiline
              numberOfLines={6}
            />
          </View>
        );
    }
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
          <Text style={styles.subtitle}>Create your personalized birth plan</Text>
        </View>
        
        {/* Progress */}
        <Card style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Your Progress</Text>
            <Text style={styles.progressPercent}>
              {Math.round(birthPlan?.completion_percentage || 0)}%
            </Text>
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
        <Text style={styles.sectionTitle}>Sections</Text>
        {birthPlan?.sections?.map((section: any) => (
          <TouchableOpacity
            key={section.section_id}
            onPress={() => openSection(section)}
            activeOpacity={0.8}
          >
            <Card style={styles.sectionCard}>
              <View style={styles.sectionRow}>
                <View style={styles.sectionInfo}>
                  <Text style={styles.sectionName}>{section.title}</Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: STATUS_COLORS[section.status] },
                      ]}
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
                <Ionicons name="chevron-forward" size={20} color={COLORS.textLight} />
              </View>
            </Card>
          </TouchableOpacity>
        ))}
        
        {/* Export Button */}
        <Button
          title="Export Birth Plan"
          onPress={handleExport}
          variant="outline"
          fullWidth
          icon={<Ionicons name="download-outline" size={20} color={COLORS.primary} />}
          style={styles.exportButton}
        />
      </ScrollView>
      
      {/* Section Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedSection?.title}</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Take your time to think about your preferences for this section. Remember, your birth plan is flexible and can be adjusted as needed.
            </Text>
            
            <TouchableOpacity style={styles.videoButton}>
              <Ionicons name="play-circle" size={24} color={COLORS.primary} />
              <Text style={styles.videoButtonText}>Watch educational video</Text>
            </TouchableOpacity>
            
            {renderSectionContent()}
            
            <Text style={styles.fieldLabel}>Notes to Provider</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notesToProvider}
              onChangeText={setNotesToProvider}
              placeholder="Any additional notes for your healthcare team..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Save Section"
              onPress={saveSection}
              loading={saving}
              fullWidth
            />
          </View>
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
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressCard: {
    marginBottom: SIZES.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.sm,
  },
  progressTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  progressPercent: {
    fontSize: SIZES.fontLg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  progressBar: {
    height: 10,
    backgroundColor: COLORS.border,
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  sectionCard: {
    marginBottom: SIZES.sm,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionName: {
    fontSize: SIZES.fontMd,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: SIZES.fontSm,
  },
  exportButton: {
    marginTop: SIZES.lg,
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
  modalTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SIZES.md,
  },
  modalDescription: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: SIZES.md,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight + '20',
    padding: SIZES.md,
    borderRadius: SIZES.radiusMd,
    marginBottom: SIZES.lg,
  },
  videoButtonText: {
    marginLeft: SIZES.sm,
    fontSize: SIZES.fontMd,
    color: COLORS.primary,
    fontWeight: '500',
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
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
    color: COLORS.textPrimary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
});
