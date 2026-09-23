import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Icon } from '../../src/components/Icon';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS, API_BASE } from '../../src/constants/api';
import { useColors, createThemedStyles } from '../../src/hooks/useThemedStyles';
import { useAuthStore } from '../../src/store/authStore';
import { C, F, kickerStyle } from '../../src/constants/designRefresh';

const DF = F;

const SECTION_LABELS: Record<string, string> = {
  about_me: 'About Me & My Preferences',
  labor_delivery: 'Labor & Delivery Preferences',
  pain_management: 'Pain Management',
  monitoring_iv: 'Monitoring & IV',
  induction_interventions: 'Induction & Interventions',
  cesarean_preferences: 'Cesarean Preferences',
  newborn_care: 'Newborn Care',
  feeding_preferences: 'Feeding Preferences',
};

export default function BirthPlanPreviewScreen() {
  const colors = useColors();
  const styles = getStyles(colors);
  const router = useRouter();
  const { sessionToken } = useAuthStore();
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    fetchBirthPlan();
  }, []);

  const fetchBirthPlan = async () => {
    try {
      const data = await apiRequest(API_ENDPOINTS.BIRTH_PLAN);
      setBirthPlan(data);
    } catch (error) {
      console.error('Error fetching birth plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (Platform.OS === 'web') {
      setPrinting(true);
      try {
        // Use browser's print functionality
        if (typeof window !== 'undefined' && window.print) {
          window.print();
        }
      } catch (error) {
        console.error('Print error:', error);
        Alert.alert('Print Error', 'Unable to print. Please try downloading the PDF first.');
      } finally {
        setPrinting(false);
      }
    } else {
      // For native, download PDF first then suggest printing
      handleDownloadPDF();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const pdfUrl = `${API_BASE}${API_ENDPOINTS.BIRTH_PLAN_EXPORT}/pdf`;
      const token = sessionToken;

      if (Platform.OS === 'web') {
        const response = await fetch(pdfUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to generate PDF');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'My_Birth_Plan.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        Alert.alert('Success', 'Your birth plan PDF has been downloaded!');
      } else {
        // Native: fetch PDF, write to cache, open the system share sheet (save to Files, print, AirDrop…)
        const FileSystem = require('expo-file-system/legacy');
        const Sharing = require('expo-sharing');

        const response = await fetch(pdfUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/pdf',
          },
        });
        if (!response.ok) throw new Error('Failed to download PDF');
        const blob = await response.blob();
        if (blob.size === 0) throw new Error('Downloaded PDF is empty');

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const fileUri = FileSystem.cacheDirectory + 'My_Birth_Plan.pdf';
        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

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
      setPrinting(false);
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None selected';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const formatFieldLabel = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.lavender} />
          <Text style={styles.loadingText}>Loading your birth plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Hidden on print */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { router.canGoBack() ? router.back() : router.replace('/'); }} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Birth Plan Preview</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePrint} style={styles.actionButton}>
            <Icon name="print-outline" size={22} color={C.lavender} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownloadPDF} style={styles.actionButton}>
            <Icon name="download-outline" size={22} color={C.lavender} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Printable Content */}
        <View style={styles.printableContent} id="birth-plan-content">
          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={styles.documentSubtitle}>True Joy Birthing</Text>
            <Text style={styles.documentTitle}>My Joyful Birth Plan</Text>
            <Text style={styles.documentDate}>
              Created: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </Text>
          </View>

          {/* Healthcare Provider Message - Fixed Header */}
          <View style={styles.providerMessage}>
            <Text style={styles.providerMessageTitle}>TO MY HEALTHCARE PROVIDER(S)</Text>
            <Text style={styles.providerMessageText}>
              This birth plan outlines my preferences and requests for my labor and delivery. I understand that unforeseen circumstances may necessitate deviations from this plan, and I am open to discussing alternatives with you. However, this document serves as formal notice of my wishes and priorities, and I request that you give them serious consideration. I appreciate your collaboration in making my birth experience as safe, positive, and aligned with my preferences as possible.
            </Text>
          </View>

          {/* Sections */}
          {birthPlan?.sections?.map((section: any, index: number) => (
            <View key={section.section_id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Section {index + 1} – {SECTION_LABELS[section.section_id] || section.title}
                </Text>
                <View style={[
                  styles.statusBadge,
                  section.status === 'Complete' && styles.statusComplete,
                  section.status === 'In Progress' && styles.statusProgress,
                ]}>
                  <Text style={[
                    styles.statusText,
                    section.status === 'Complete' && styles.statusTextComplete,
                    section.status === 'In Progress' && styles.statusTextProgress,
                  ]}>{section.status}</Text>
                </View>
              </View>

              {section.data && Object.keys(section.data).length > 0 ? (
                <View style={styles.sectionContent}>
                  {Object.entries(section.data).map(([key, value]) => {
                    if (key === 'notes_to_provider' || key === 'notes') {
                      return null; // Handle notes separately
                    }
                    return (
                      <View key={key} style={styles.fieldRow}>
                        <Text style={styles.fieldLabel}>{formatFieldLabel(key)}:</Text>
                        <Text style={styles.fieldValue}>{formatValue(value)}</Text>
                      </View>
                    );
                  })}

                  {/* Notes to Provider */}
                  {section.data.notes_to_provider && (
                    <View style={styles.notesContainer}>
                      <Text style={styles.notesLabel}>Notes to Care Team:</Text>
                      <Text style={styles.notesText}>{section.data.notes_to_provider}</Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={styles.emptySection}>
                  <Text style={styles.emptyText}>No preferences set for this section</Text>
                </View>
              )}
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              This birth plan represents my preferences and wishes for my birth experience.
              I understand that circumstances may require flexibility.
            </Text>
            <Text style={styles.signatureLine}>
              Signature: _____________________________  Date: ______________
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action Bar - Hidden on print */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
          <Icon name="print" size={20} color={C.white} />
          <Text style={styles.printButtonText}>Print Birth Plan</Text>
        </TouchableOpacity>
      </View>

      {/* Print Styles for Web */}
      {Platform.OS === 'web' && (
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              padding: 0.75in;
            }
            /* Suppress browser default headers/footers (URL, date, page numbers) */
            @page { margin: 0; }
          }
        `}} />
      )}
    </SafeAreaView>
  );
}

const getStyles = createThemedStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: C.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 13.5,
    fontFamily: DF.ui,
    color: C.gray,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    backgroundColor: C.cream,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: DF.serifSemi,
    fontWeight: '600',
    fontSize: 17,
    color: C.ink,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  printableContent: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 20,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  documentTitle: {
    fontFamily: DF.serif,
    fontWeight: '700',
    fontSize: 26,
    color: C.ink,
    marginTop: 4,
  },
  documentSubtitle: {
    ...kickerStyle(C.rose),
  },
  documentDate: {
    fontSize: 11,
    fontFamily: DF.ui,
    color: C.gray,
    marginTop: 6,
  },
  providerMessage: {
    backgroundColor: C.lavenderBg,
    borderWidth: 1,
    borderColor: C.lavenderBorder,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  providerMessageTitle: {
    ...kickerStyle(C.lavender),
    marginBottom: 10,
    textAlign: 'center',
  },
  providerMessageText: {
    fontSize: 12.5,
    fontFamily: DF.ui,
    color: C.body,
    lineHeight: 20,
    textAlign: 'justify',
  },
  section: {
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: DF.serifSemi,
    fontWeight: '600',
    fontSize: 17,
    color: C.ink,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: C.lavenderBg,
  },
  statusComplete: {
    backgroundColor: C.sageBg,
  },
  statusProgress: {
    backgroundColor: C.roseBg,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: DF.uiSemi,
    color: C.lavender,
  },
  statusTextComplete: {
    color: C.sage,
  },
  statusTextProgress: {
    color: C.rose,
  },
  sectionContent: {
    paddingLeft: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: DF.ui,
    color: C.gray,
    marginRight: 4,
    minWidth: 150,
  },
  fieldValue: {
    fontSize: 12.5,
    fontFamily: DF.ui,
    color: C.ink,
    flex: 1,
  },
  notesContainer: {
    marginTop: 12,
    padding: 14,
    backgroundColor: C.gbandMid,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: C.lavender,
  },
  notesLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: DF.uiBold,
    color: C.lavender,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 12.5,
    fontFamily: DF.ui,
    color: C.body,
    lineHeight: 20,
  },
  emptySection: {
    padding: 14,
    backgroundColor: C.gbandMid,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 12,
    fontFamily: DF.ui,
    color: C.grayLight,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  footerText: {
    fontSize: 11.5,
    fontFamily: DF.ui,
    color: C.gray,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 19,
  },
  signatureLine: {
    fontSize: 12,
    fontFamily: DF.ui,
    color: C.ink,
    marginTop: 12,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: C.cream,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.lavender,
    paddingVertical: 14,
    borderRadius: 999,
    gap: 8,
  },
  printButtonText: {
    fontSize: 13.5,
    fontWeight: '600',
    fontFamily: DF.uiSemi,
    color: C.white,
  },
}));