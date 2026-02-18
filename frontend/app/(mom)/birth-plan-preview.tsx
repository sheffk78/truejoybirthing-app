import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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
import { COLORS, SIZES, FONTS } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/authStore';

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
        Alert.alert('Print Error', 'Unable to print. Please try using the Download PDF option instead.');
      } finally {
        setPrinting(false);
      }
    } else {
      Alert.alert(
        'Print',
        'To print your birth plan, please use the "Download PDF" option and print from your device\'s file viewer.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleDownloadPDF = async () => {
    if (Platform.OS === 'web') {
      try {
        const token = sessionToken || localStorage.getItem('authToken');
        const pdfUrl = `${API_BASE}${API_ENDPOINTS.BIRTH_PLAN_EXPORT}/pdf`;
        
        const response = await fetch(pdfUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to generate PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Birth_Plan.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download error:', error);
      }
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
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your birth plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - Hidden on print */}
      <View style={styles.header} className="no-print">
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Birth Plan Preview</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handlePrint} style={styles.actionButton}>
            <Icon name="print-outline" size={22} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDownloadPDF} style={styles.actionButton}>
            <Icon name="download-outline" size={22} color={COLORS.primary} />
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
            <Text style={styles.documentTitle}>My Joyful Birth Plan</Text>
            <Text style={styles.documentSubtitle}>True Joy Birthing</Text>
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
                  <Text style={styles.statusText}>{section.status}</Text>
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
      <View style={styles.actionBar} className="no-print">
        <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
          <Icon name="print" size={20} color={COLORS.white} />
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
            }
          }
        `}} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  backButton: {
    padding: SIZES.xs,
  },
  headerTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SIZES.sm,
  },
  actionButton: {
    padding: SIZES.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.md,
    paddingBottom: 100,
  },
  printableContent: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: SIZES.xl,
    paddingBottom: SIZES.lg,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  documentTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  documentSubtitle: {
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  documentDate: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    marginTop: SIZES.sm,
  },
  providerMessage: {
    backgroundColor: '#f8f4f0',
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    borderRadius: SIZES.radiusMd,
    padding: SIZES.lg,
    marginBottom: SIZES.xl,
  },
  providerMessageTitle: {
    fontSize: SIZES.fontMd,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SIZES.md,
    textAlign: 'center',
  },
  providerMessageText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    lineHeight: 22,
    textAlign: 'justify',
  },
  section: {
    marginBottom: SIZES.lg,
    paddingBottom: SIZES.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.md,
  },
  sectionTitle: {
    fontSize: SIZES.fontLg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.textLight + '30',
  },
  statusComplete: {
    backgroundColor: COLORS.success + '20',
  },
  statusProgress: {
    backgroundColor: COLORS.warning + '20',
  },
  statusText: {
    fontSize: SIZES.fontXs,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  sectionContent: {
    paddingLeft: SIZES.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: SIZES.sm,
    flexWrap: 'wrap',
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginRight: SIZES.xs,
    minWidth: 150,
  },
  fieldValue: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
    flex: 1,
  },
  notesContainer: {
    marginTop: SIZES.md,
    padding: SIZES.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: SIZES.radiusSm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notesLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SIZES.xs,
  },
  notesText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  emptySection: {
    padding: SIZES.md,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSm,
  },
  emptyText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: SIZES.xl,
    paddingTop: SIZES.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.lg,
    lineHeight: 20,
  },
  signatureLine: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
    marginTop: SIZES.lg,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SIZES.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.md,
    borderRadius: SIZES.radiusMd,
    gap: SIZES.sm,
  },
  printButtonText: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.white,
  },
});
