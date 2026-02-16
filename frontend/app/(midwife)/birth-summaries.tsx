import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../src/components/Icon';
import Card from '../../src/components/Card';
import Button from '../../src/components/Button';
import Input from '../../src/components/Input';
import { apiRequest } from '../../src/utils/api';
import { API_ENDPOINTS } from '../../src/constants/api';
import { COLORS, SIZES } from '../../src/constants/theme';

const BIRTH_PLACES = ['Home', 'Birth Center', 'Transfer to Hospital'];
const BIRTH_MODES = ['Spontaneous Vaginal', 'Assisted Vaginal', 'Cesarean', 'Other'];

export default function MidwifeBirthSummariesScreen() {
  const [summaries, setSummaries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingSummary, setViewingSummary] = useState<any>(null);
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState('');
  const [birthDatetime, setBirthDatetime] = useState('');
  const [birthPlace, setBirthPlace] = useState('Home');
  const [modeOfBirth, setModeOfBirth] = useState('Spontaneous Vaginal');
  const [newbornDetails, setNewbornDetails] = useState('');
  const [complications, setComplications] = useState('');
  const [summaryNote, setSummaryNote] = useState('');
  
  const fetchData = async () => {
    try {
      const [summariesData, clientsData] = await Promise.all([
        apiRequest(API_ENDPOINTS.MIDWIFE_BIRTH_SUMMARIES),
        apiRequest(API_ENDPOINTS.MIDWIFE_CLIENTS),
      ]);
      setSummaries(summariesData);
      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };
  
  const resetForm = () => {
    setSelectedClientId('');
    setBirthDatetime('');
    setBirthPlace('Home');
    setModeOfBirth('Spontaneous Vaginal');
    setNewbornDetails('');
    setComplications('');
    setSummaryNote('');
  };
  
  const handleCreateSummary = async () => {
    if (!selectedClientId || !birthDatetime || !birthPlace || !modeOfBirth) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    try {
      await apiRequest(API_ENDPOINTS.MIDWIFE_BIRTH_SUMMARIES, {
        method: 'POST',
        body: {
          client_id: selectedClientId,
          birth_datetime: birthDatetime,
          birth_place: birthPlace,
          mode_of_birth: modeOfBirth,
          newborn_details: newbornDetails || null,
          complications: complications || null,
          summary_note: summaryNote || null,
        },
      });
      
      await fetchData();
      setModalVisible(false);
      resetForm();
      Alert.alert('Success', 'Birth summary created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create birth summary');
    } finally {
      setSaving(false);
    }
  };
  
  const getClientName = (clientId: string) => {
    const client = clients.find((c) => c.client_id === clientId);
    return client?.name || 'Unknown';
  };
  
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };
  
  const getPlaceColor = (place: string) => {
    switch (place) {
      case 'Home': return COLORS.success;
      case 'Birth Center': return COLORS.roleMidwife;
      case 'Transfer to Hospital': return COLORS.warning;
      default: return COLORS.textLight;
    }
  };
  
  return (
    <SafeAreaView style={styles.container} edges={['top']} data-testid="birth-summaries-screen">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.roleMidwife} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Birth Summaries</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            data-testid="add-summary-btn"
          >
            <Icon name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>
        
        {/* Summaries List */}
        {summaries.length === 0 ? (
          <Card data-testid="empty-summaries-card">
            <View style={styles.emptyContent}>
              <Icon name="heart" size={48} color={COLORS.roleMidwife + '40'} />
              <Text style={styles.emptyText}>
                No birth summaries yet.
              </Text>
              <Text style={styles.emptySubtext}>
                Record birth details for your clients here.
              </Text>
            </View>
          </Card>
        ) : (
          summaries.map((summary) => (
            <TouchableOpacity
              key={summary.summary_id}
              activeOpacity={0.8}
              onPress={() => setViewingSummary(summary)}
              data-testid={`summary-card-${summary.summary_id}`}
            >
              <Card style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.clientName}>{getClientName(summary.client_id)}</Text>
                    <Text style={styles.birthDate}>{formatDateTime(summary.birth_datetime)}</Text>
                  </View>
                  <View
                    style={[
                      styles.placeBadge,
                      { backgroundColor: getPlaceColor(summary.birth_place) + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.placeText,
                        { color: getPlaceColor(summary.birth_place) },
                      ]}
                    >
                      {summary.birth_place}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.summaryDetails}>
                  <View style={styles.detailItem}>
                    <Icon name="fitness-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.detailText}>{summary.mode_of_birth}</Text>
                  </View>
                  {summary.newborn_details && (
                    <View style={styles.detailItem}>
                      <Icon name="happy-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.detailText} numberOfLines={1}>
                        {summary.newborn_details}
                      </Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.viewMore}>
                  <Text style={styles.viewMoreText}>Tap to view details</Text>
                  <Icon name="chevron-forward" size={16} color={COLORS.textLight} />
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
      
      {/* Create Summary Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)} data-testid="close-modal-btn">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Birth Summary</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Client Selector */}
            <Text style={styles.fieldLabel}>Select Client *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientSelector}>
              {clients.map((client) => (
                <TouchableOpacity
                  key={client.client_id}
                  style={[
                    styles.clientOption,
                    selectedClientId === client.client_id && styles.clientOptionSelected,
                  ]}
                  onPress={() => setSelectedClientId(client.client_id)}
                  data-testid={`select-client-${client.client_id}`}
                >
                  <Text
                    style={[
                      styles.clientOptionText,
                      selectedClientId === client.client_id && styles.clientOptionTextSelected,
                    ]}
                  >
                    {client.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Input
              label="Birth Date & Time *"
              placeholder="YYYY-MM-DD HH:MM"
              value={birthDatetime}
              onChangeText={setBirthDatetime}
              leftIcon="calendar-outline"
            />
            
            {/* Birth Place Selector */}
            <Text style={styles.fieldLabel}>Birth Place *</Text>
            <View style={styles.optionGrid}>
              {BIRTH_PLACES.map((place) => (
                <TouchableOpacity
                  key={place}
                  style={[
                    styles.optionButton,
                    birthPlace === place && styles.optionButtonSelected,
                  ]}
                  onPress={() => setBirthPlace(place)}
                  data-testid={`place-${place.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      birthPlace === place && styles.optionButtonTextSelected,
                    ]}
                  >
                    {place}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Mode of Birth Selector */}
            <Text style={styles.fieldLabel}>Mode of Birth *</Text>
            <View style={styles.optionGrid}>
              {BIRTH_MODES.map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.optionButton,
                    modeOfBirth === mode && styles.optionButtonSelected,
                  ]}
                  onPress={() => setModeOfBirth(mode)}
                  data-testid={`mode-${mode.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <Text
                    style={[
                      styles.optionButtonText,
                      modeOfBirth === mode && styles.optionButtonTextSelected,
                    ]}
                  >
                    {mode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.fieldLabel}>Newborn Details</Text>
            <TextInput
              style={styles.textInput}
              value={newbornDetails}
              onChangeText={setNewbornDetails}
              placeholder="e.g., 7 lbs 8 oz, APGARs 9/9, Female"
              placeholderTextColor={COLORS.textLight}
              data-testid="newborn-details-input"
            />
            
            <Text style={styles.fieldLabel}>Complications (if any)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={complications}
              onChangeText={setComplications}
              placeholder="Document any complications during birth..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              data-testid="complications-input"
            />
            
            <Text style={styles.fieldLabel}>Summary Notes</Text>
            <TextInput
              style={[styles.textInput, styles.textAreaLarge]}
              value={summaryNote}
              onChangeText={setSummaryNote}
              placeholder="Additional notes about the birth..."
              placeholderTextColor={COLORS.textLight}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              data-testid="summary-note-input"
            />
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button
              title="Create Birth Summary"
              onPress={handleCreateSummary}
              loading={saving}
              fullWidth
              testID="submit-summary-btn"
            />
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* View Summary Modal */}
      <Modal
        visible={!!viewingSummary}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingSummary(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setViewingSummary(null)} data-testid="close-view-modal">
              <Icon name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Birth Summary</Text>
            <View style={{ width: 24 }} />
          </View>
          
          {viewingSummary && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.viewSection}>
                <Text style={styles.viewLabel}>Client</Text>
                <Text style={styles.viewValue}>{getClientName(viewingSummary.client_id)}</Text>
              </View>
              
              <View style={styles.viewSection}>
                <Text style={styles.viewLabel}>Birth Date & Time</Text>
                <Text style={styles.viewValue}>{formatDateTime(viewingSummary.birth_datetime)}</Text>
              </View>
              
              <View style={styles.viewRow}>
                <View style={[styles.viewSection, { flex: 1 }]}>
                  <Text style={styles.viewLabel}>Birth Place</Text>
                  <View
                    style={[
                      styles.viewBadge,
                      { backgroundColor: getPlaceColor(viewingSummary.birth_place) + '20' },
                    ]}
                  >
                    <Text style={[styles.viewBadgeText, { color: getPlaceColor(viewingSummary.birth_place) }]}>
                      {viewingSummary.birth_place}
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.viewSection, { flex: 1 }]}>
                  <Text style={styles.viewLabel}>Mode of Birth</Text>
                  <Text style={styles.viewValue}>{viewingSummary.mode_of_birth}</Text>
                </View>
              </View>
              
              {viewingSummary.newborn_details && (
                <View style={styles.viewSection}>
                  <Text style={styles.viewLabel}>Newborn Details</Text>
                  <Text style={styles.viewValue}>{viewingSummary.newborn_details}</Text>
                </View>
              )}
              
              {viewingSummary.complications && (
                <View style={styles.viewSection}>
                  <Text style={styles.viewLabel}>Complications</Text>
                  <Card style={styles.complicationCard}>
                    <Text style={styles.complicationText}>{viewingSummary.complications}</Text>
                  </Card>
                </View>
              )}
              
              {viewingSummary.summary_note && (
                <View style={styles.viewSection}>
                  <Text style={styles.viewLabel}>Summary Notes</Text>
                  <Text style={styles.viewValue}>{viewingSummary.summary_note}</Text>
                </View>
              )}
            </ScrollView>
          )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.lg,
  },
  title: {
    fontSize: SIZES.fontXxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.roleMidwife,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: SIZES.lg,
  },
  emptyText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginTop: SIZES.md,
  },
  emptySubtext: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginTop: SIZES.xs,
  },
  summaryCard: {
    marginBottom: SIZES.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.sm,
  },
  summaryInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: SIZES.fontMd,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  birthDate: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
  },
  placeBadge: {
    paddingHorizontal: SIZES.sm,
    paddingVertical: SIZES.xs,
    borderRadius: SIZES.radiusSm,
  },
  placeText: {
    fontSize: SIZES.fontXs,
    fontWeight: '600',
  },
  summaryDetails: {
    paddingTop: SIZES.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.xs,
  },
  detailText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginLeft: SIZES.sm,
    flex: 1,
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: SIZES.sm,
  },
  viewMoreText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textLight,
    marginRight: SIZES.xs,
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
  fieldLabel: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.sm,
    marginTop: SIZES.md,
  },
  clientSelector: {
    marginBottom: SIZES.md,
  },
  clientOption: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusFull,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
  },
  clientOptionSelected: {
    backgroundColor: COLORS.roleMidwife,
    borderColor: COLORS.roleMidwife,
  },
  clientOptionText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  clientOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: SIZES.md,
  },
  optionButton: {
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  optionButtonSelected: {
    backgroundColor: COLORS.roleMidwife,
    borderColor: COLORS.roleMidwife,
  },
  optionButtonText: {
    fontSize: SIZES.fontSm,
    color: COLORS.textPrimary,
  },
  optionButtonTextSelected: {
    color: COLORS.white,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    padding: SIZES.md,
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    marginBottom: SIZES.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    padding: SIZES.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  viewSection: {
    marginBottom: SIZES.lg,
  },
  viewLabel: {
    fontSize: SIZES.fontSm,
    color: COLORS.textSecondary,
    marginBottom: SIZES.xs,
  },
  viewValue: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  viewRow: {
    flexDirection: 'row',
  },
  viewBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderRadius: SIZES.radiusMd,
  },
  viewBadgeText: {
    fontSize: SIZES.fontSm,
    fontWeight: '600',
  },
  complicationCard: {
    backgroundColor: COLORS.warning + '15',
  },
  complicationText: {
    fontSize: SIZES.fontMd,
    color: COLORS.textPrimary,
  },
});
