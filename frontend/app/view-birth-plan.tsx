import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Icon } from '../src/components/Icon';
import Card from '../src/components/Card';
import Button from '../src/components/Button';
import { apiRequest, getApiBaseUrl } from '../src/utils/api';
import { COLORS, SIZES, FONTS } from '../src/constants/theme';
import { useAuthStore } from '../src/store/authStore';

export default function ViewBirthPlanScreen() {
  const router = useRouter();
  const { momId, clientName } = useLocalSearchParams<{ momId: string; clientName: string }>();
  const [birthPlan, setBirthPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchBirthPlan();
  }, [momId]);

  const fetchBirthPlan = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`/api/provider/client/${momId}/birth-plan`);
      setBirthPlan(data);
    } catch (err: any) {
      console.error('Error fetching birth plan:', err);
      setError(err.message || 'Unable to load birth plan');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const baseUrl = getApiBaseUrl();
      const pdfUrl = `${baseUrl}/api/provider/client/${momId}/birth-plan/pdf`;
      
      if (Platform.OS === 'web') {
        // For web, open in new tab with auth header via fetch
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
        a.download = `Birth_Plan_${decodeURIComponent(clientName || 'Client').replace(' ', '_')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        Alert.alert('Success', 'Birth Plan PDF downloaded successfully');
      } else {
        // For native, open in browser
        Alert.alert('Info', 'PDF download will open in your browser');
      }
    } catch (err: any) {
      console.error('Error downloading PDF:', err);
      Alert.alert('Error', err.message || 'Failed to download PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getSectionIcon = (sectionId: string) => {
    const icons: Record<string, string> = {
      about_me: 'person',
      birth_setting: 'medical',
      labor_preferences: 'heart',
      comfort_measures: 'flower',
      medical_interventions: 'medkit',
      newborn_care: 'happy',
      postpartum: 'home',
      notes_for_provider: 'document-text',
    };
    return icons[sectionId] || 'document';
  };

  const formatFieldValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    return value || 'Not specified';
  };

  const renderSectionData = (section: any) => {
    if (!section.data || Object.keys(section.data).length === 0) {
      return (
        <Text style={styles.noDataText}>No information provided yet</Text>
      );
    }

    return Object.entries(section.data).map(([key, value]) => (
      <View key={key} style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>
          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>
        <Text style={styles.fieldValue}>{formatFieldValue(value)}</Text>
      </View>
    ));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Birth Plan', headerShown: true }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading birth plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Birth Plan', headerShown: true }} />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Go Back"
            onPress={() => router.back()}
            style={{ marginTop: SIZES.md }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: `${decodeURIComponent(clientName || 'Client')}'s Birth Plan`,
          headerShown: true 
        }} 
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Birth Plan</Text>
          <Text style={styles.subtitle}>
            {decodeURIComponent(clientName || 'Your Client')}
          </Text>
          {birthPlan?.completion_percentage !== undefined && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${birthPlan.completion_percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(birthPlan.completion_percentage)}% complete
              </Text>
            </View>
          )}
          
          {/* Download PDF Button */}
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={handleDownloadPdf}
            disabled={downloadingPdf}
            data-testid="download-birth-plan-pdf"
          >
            {downloadingPdf ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Icon name="download-outline" size={18} color={COLORS.white} />
                <Text style={styles.downloadButtonText}>Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Sections */}
        {birthPlan?.sections?.map((section: any) => (
          <Card key={section.section_id} style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={[
                styles.sectionIcon,
                section.status === 'Complete' && styles.sectionIconComplete
              ]}>
                <Icon 
                  name={getSectionIcon(section.section_id)} 
                  size={20} 
                  color={section.status === 'Complete' ? COLORS.white : COLORS.primary} 
                />
              </View>
              <View style={styles.sectionInfo}>
                <Text style={styles.sectionName}>{section.name}</Text>
                <View style={styles.statusBadge}>
                  <Icon 
                    name={section.status === 'Complete' ? 'checkmark-circle' : 'time'}
                    size={14}
                    color={section.status === 'Complete' ? COLORS.success : COLORS.textLight}
                  />
                  <Text style={[
                    styles.statusText,
                    { color: section.status === 'Complete' ? COLORS.success : COLORS.textLight }
                  ]}>
                    {section.status || 'Not started'}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.sectionContent}>
              {renderSectionData(section)}
            </View>

            {section.notes_to_provider && (
              <View style={styles.notesSection}>
                <Text style={styles.notesLabel}>Notes for You:</Text>
                <Text style={styles.notesText}>{section.notes_to_provider}</Text>
              </View>
            )}
          </Card>
        ))}

        <View style={{ height: SIZES.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    padding: SIZES.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.xl,
  },
  errorText: {
    marginTop: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.error,
    textAlign: 'center',
  },
  header: {
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXl,
    fontFamily: FONTS.heading,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: SIZES.md,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  progressText: {
    marginTop: SIZES.xs,
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SIZES.sm,
    paddingHorizontal: SIZES.lg,
    borderRadius: SIZES.radiusMd,
    marginTop: SIZES.md,
  },
  downloadButtonText: {
    color: COLORS.white,
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.bodyMedium,
    marginLeft: SIZES.sm,
  },
  sectionCard: {
    marginBottom: SIZES.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.md,
    paddingBottom: SIZES.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary + '20',
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
    fontFamily: FONTS.bodyBold,
    color: COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: SIZES.fontSm,
    marginLeft: 4,
  },
  sectionContent: {
    marginTop: SIZES.xs,
  },
  noDataText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
  fieldRow: {
    marginBottom: SIZES.sm,
  },
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: SIZES.fontMd,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  notesSection: {
    marginTop: SIZES.md,
    paddingTop: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.accent + '10',
    padding: SIZES.sm,
    borderRadius: SIZES.radiusSm,
  },
  notesLabel: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.bodyBold,
    color: COLORS.accent,
    marginBottom: 4,
  },
  notesText: {
    fontSize: SIZES.fontSm,
    fontFamily: FONTS.body,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});
